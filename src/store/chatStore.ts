import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { encryptPayload, decryptPayload } from '../utils/encryption';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface Message {
  id: string;
  chatId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  timestamp: number;
  status: MessageStatus;
  editedAt?: number;
  replyToId?: string;
  attachments?: Attachment[];
  expiresAt?: number;
}

interface EphemeralSetting {
  enabled: boolean;
  duration: number;
}

interface ChatState {
  activeChat: string | null;
  messages: Message[];
  typingStatus: Record<string, Record<string, number>>;
  pinnedMessages: Record<string, string | null>;
  ephemeralSettings: Record<string, EphemeralSetting>;
  setActiveChat: (userId: string | null, viewerId?: string) => void;
  sendMessage: (
    fromUserId: string,
    toUserId: string,
    content: string,
    options?: { attachments?: Attachment[]; replyToId?: string }
  ) => void;
  receiveMessage: (
    fromUserId: string,
    toUserId: string,
    content: string,
    options?: { attachments?: Attachment[]; replyToId?: string }
  ) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  getMessagesForChat: (userId1: string, userId2: string) => Message[];
  searchMessages: (chatId: string, query: string) => Message[];
  setPinnedMessage: (chatId: string, messageId: string | null) => void;
  getPinnedMessage: (chatId: string) => Message | undefined;
  markMessagesAsRead: (chatId: string, readerId: string) => void;
  updateTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  getTypingUsers: (chatId: string) => string[];
  setEphemeralMode: (chatId: string, enabled: boolean, duration?: number) => void;
  pruneExpiredMessages: () => void;
}

const createChatId = (userId1: string, userId2: string) =>
  [userId1, userId2].sort().join('::');

const pruneMessages = (messages: Message[]) => {
  const now = Date.now();
  return messages.filter((message) => !message.expiresAt || message.expiresAt > now);
};

const serialize = (state: Partial<ChatState>) => encryptPayload(state);
const deserialize = (value: string) => decryptPayload<Partial<ChatState>>(value);

const memoryStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const scheduleTimeout =
  typeof window !== 'undefined' && typeof window.setTimeout !== 'undefined'
    ? window.setTimeout.bind(window)
    : setTimeout;

const generateMessageId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      activeChat: null,
      messages: [],
      typingStatus: {},
      pinnedMessages: {},
      ephemeralSettings: {},

      setActiveChat: (userId, viewerId) => {
        set({ activeChat: userId });
        if (userId && viewerId) {
          const chatId = createChatId(userId, viewerId);
          get().markMessagesAsRead(chatId, viewerId);
        }
      },

      sendMessage: (fromUserId, toUserId, content, options) => {
        if (!content.trim() && !options?.attachments?.length) {
          return;
        }

        const chatId = createChatId(fromUserId, toUserId);
        const { ephemeralSettings } = get();
        const setting = ephemeralSettings[chatId];
        const expiresAt = setting?.enabled
          ? Date.now() + setting.duration
          : undefined;

        const newMessage: Message = {
          id: generateMessageId(),
          chatId,
          fromUserId,
          toUserId,
          content,
          timestamp: Date.now(),
          status: 'sent',
          replyToId: options?.replyToId,
          attachments: options?.attachments,
          expiresAt,
        };

        set((state) => ({
          messages: [...pruneMessages(state.messages), newMessage],
        }));

        scheduleTimeout(() => {
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === newMessage.id ? { ...message, status: 'delivered' } : message
            ),
          }));
        }, 400);

        scheduleTimeout(() => {
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === newMessage.id ? { ...message, status: 'read' } : message
            ),
          }));
        }, 1200);
      },

      receiveMessage: (fromUserId, toUserId, content, options) => {
        const chatId = createChatId(fromUserId, toUserId);
        const newMessage: Message = {
          id: generateMessageId(),
          chatId,
          fromUserId,
          toUserId,
          content,
          timestamp: Date.now(),
          status: 'delivered',
          replyToId: options?.replyToId,
          attachments: options?.attachments,
        };

        set((state) => ({
          messages: [...pruneMessages(state.messages), newMessage],
        }));
      },

      editMessage: (messageId, content) => {
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === messageId
              ? { ...message, content, editedAt: Date.now() }
              : message
          ),
        }));
      },

      deleteMessage: (messageId) => {
        set((state) => {
          const filtered = state.messages.filter((message) => message.id !== messageId);
          const pinnedEntries = Object.entries(state.pinnedMessages).reduce(
            (acc, [chatId, pinnedId]) => {
              acc[chatId] = pinnedId === messageId ? null : pinnedId;
              return acc;
            },
            {} as Record<string, string | null>
          );
          return {
            messages: pruneMessages(filtered),
            pinnedMessages: pinnedEntries,
          };
        });
      },

      getMessagesForChat: (userId1, userId2) => {
        const chatId = createChatId(userId1, userId2);
        const pruned = pruneMessages(get().messages);
        if (pruned.length !== get().messages.length) {
          set({ messages: pruned });
        }
        return pruned
          .filter((message) => message.chatId === chatId)
          .sort((a, b) => a.timestamp - b.timestamp);
      },

      searchMessages: (chatId, query) => {
        const lowered = query.toLowerCase();
        return get()
          .messages.filter((message) => message.chatId === chatId)
          .filter((message) =>
            message.content.toLowerCase().includes(lowered) ||
            message.attachments?.some((attachment) => attachment.name.toLowerCase().includes(lowered))
          );
      },

      setPinnedMessage: (chatId, messageId) => {
        set((state) => ({
          pinnedMessages: {
            ...state.pinnedMessages,
            [chatId]: messageId,
          },
        }));
      },

      getPinnedMessage: (chatId) => {
        const pinnedId = get().pinnedMessages[chatId];
        if (!pinnedId) return undefined;
        return get().messages.find((message) => message.id === pinnedId);
      },

      markMessagesAsRead: (chatId, readerId) => {
        set((state) => ({
          messages: state.messages.map((message) =>
            message.chatId === chatId && message.toUserId === readerId
              ? { ...message, status: 'read' }
              : message
          ),
        }));
      },

      updateTyping: (chatId, userId, isTyping) => {
        set((state) => {
          const chatTyping = state.typingStatus[chatId] || {};
          if (isTyping) {
            chatTyping[userId] = Date.now() + 2000;
          } else {
            delete chatTyping[userId];
          }
          return {
            typingStatus: {
              ...state.typingStatus,
              [chatId]: chatTyping,
            },
          };
        });
      },

      getTypingUsers: (chatId) => {
        const chatTyping = get().typingStatus[chatId] || {};
        const now = Date.now();
        const activeUsers = Object.entries(chatTyping)
          .filter(([, expiry]) => expiry > now)
          .map(([userId]) => userId);
        if (activeUsers.length !== Object.keys(chatTyping).length) {
          set((state) => ({
            typingStatus: {
              ...state.typingStatus,
              [chatId]: Object.fromEntries(
                Object.entries(chatTyping).filter(([, expiry]) => expiry > now)
              ),
            },
          }));
        }
        return activeUsers;
      },

      setEphemeralMode: (chatId, enabled, duration = 60_000) => {
        set((state) => ({
          ephemeralSettings: {
            ...state.ephemeralSettings,
            [chatId]: { enabled, duration },
          },
        }));
        if (!enabled) {
          set((state) => ({
            messages: pruneMessages(state.messages),
          }));
        }
      },

      pruneExpiredMessages: () => {
        set((state) => ({
          messages: pruneMessages(state.messages),
        }));
      },
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(
        () => (typeof window !== 'undefined' ? window.localStorage : (memoryStorage as Storage))
      ),
      serialize,
      deserialize,
      partialize: (state) => ({
        messages: state.messages,
        pinnedMessages: state.pinnedMessages,
        ephemeralSettings: state.ephemeralSettings,
      }),
    }
  )
);
