import { create } from 'zustand';
import {
  apiEnsureConversation,
  apiFetchConversations,
  apiFetchMessages,
  apiSendMessage,
  apiSendReadReceipt,
  RemoteConversation,
  RemoteMessage,
} from '../lib/api';
import { realtimeClient, RealtimeEvent, RealtimeStatus } from '../lib/realtimeClient';
import { useUserStore } from './userStore';

type SetStateFn = (partial: Partial<ChatState> | ((state: ChatState) => Partial<ChatState> | ChatState), replace?: boolean) => void;

interface Message extends RemoteMessage {
  status: 'pending' | 'sent' | 'failed';
}

interface ConversationState extends RemoteConversation {
  messageCursor: number | null;
  hasMore: boolean;
}

interface PendingMessage {
  clientMessageId: string;
  conversationId: string;
  recipientIds?: string[];
  body: string;
  senderId: string;
  createdAt: number;
  attempts: number;
}

interface ChatState {
  activeChat: string | null;
  conversations: Record<string, ConversationState>;
  conversationOrder: string[];
  messages: Record<string, Message[]>;
  outbox: PendingMessage[];
  pendingByClientId: Record<string, PendingMessage>;
  initialized: boolean;
  isLoading: boolean;
  connectionStatus: RealtimeStatus;
  currentUserId: string | null;
  initialize: (user: { id: string; name: string; color?: string }) => Promise<void>;
  reset: () => void;
  setActiveChat: (userId: string | null) => void;
  getMessagesForChat: (userId1: string, userId2: string) => Message[];
  ensureConversationForUser: (peerId: string) => Promise<string>;
  sendMessage: (options: { conversationId?: string; recipientId?: string; body: string }) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;
}

const INITIAL_STATE: Pick<
  ChatState,
  | 'activeChat'
  | 'conversations'
  | 'conversationOrder'
  | 'messages'
  | 'outbox'
  | 'pendingByClientId'
  | 'initialized'
  | 'isLoading'
  | 'connectionStatus'
  | 'currentUserId'
> = {
  activeChat: null,
  conversations: {},
  conversationOrder: [],
  messages: {},
  outbox: [],
  pendingByClientId: {},
  initialized: false,
  isLoading: false,
  connectionStatus: 'disconnected',
  currentUserId: null,
};

let eventUnsubscribe: (() => void) | null = null;
let statusUnsubscribe: (() => void) | null = null;
let onlineListenerAttached = false;
let flushing = false;

function buildDirectKey(a: string, b: string) {
  return [a, b].sort().join('::');
}

function toConversationState(remote: RemoteConversation): ConversationState {
  return {
    ...remote,
    messageCursor: null,
    hasMore: true,
  };
}

function sortConversationOrder(order: string[], conversations: Record<string, ConversationState>): string[] {
  const unique = Array.from(new Set(order));
  unique.sort((a, b) => (conversations[b]?.updatedAt ?? 0) - (conversations[a]?.updatedAt ?? 0));
  return unique;
}

function upsertMessage(messages: Message[], incoming: Message): Message[] {
  const index = messages.findIndex(
    (msg) =>
      msg.id === incoming.id ||
      (msg.clientMessageId && incoming.clientMessageId && msg.clientMessageId === incoming.clientMessageId)
  );
  if (index >= 0) {
    const updated = [...messages];
    updated[index] = {
      ...updated[index],
      ...incoming,
      status: incoming.status ?? updated[index].status,
    };
    return updated.sort((a, b) => a.createdAt - b.createdAt);
  }
  return [...messages, incoming].sort((a, b) => a.createdAt - b.createdAt);
}

function mergeMessageBatch(messages: Message[], batch: RemoteMessage[]): Message[] {
  let merged = [...messages];
  batch.forEach((item) => {
    merged = upsertMessage(merged, { ...item, status: 'sent' });
  });
  return merged;
}

async function flushOutbox(get: () => ChatState, set: SetStateFn) {
  if (flushing) return;
  const state = get();
  if (!state.outbox.length) return;
  if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
    return;
  }
  flushing = true;
  try {
    for (const pending of [...state.outbox]) {
      try {
        const message = await apiSendMessage({
          conversationId: pending.conversationId,
          recipientIds: pending.recipientIds,
          senderId: pending.senderId,
          body: pending.body,
          clientMessageId: pending.clientMessageId,
        });
        set((current) => {
          const messages = current.messages[pending.conversationId] ?? [];
          const updatedMessages = upsertMessage(messages, { ...message, status: 'sent' });
          const conversations = {
            ...current.conversations,
            [pending.conversationId]: {
              ...current.conversations[pending.conversationId],
              lastMessage: message,
              updatedAt: Math.max(
                current.conversations[pending.conversationId]?.updatedAt ?? 0,
                message.createdAt
              ),
            },
          } as Record<string, ConversationState>;
          const conversationOrder = sortConversationOrder(
            [pending.conversationId, ...current.conversationOrder],
            conversations
          );
          const pendingByClientId = { ...current.pendingByClientId };
          delete pendingByClientId[pending.clientMessageId];
          return {
            ...current,
            outbox: current.outbox.filter((item) => item.clientMessageId !== pending.clientMessageId),
            pendingByClientId,
            messages: {
              ...current.messages,
              [pending.conversationId]: updatedMessages,
            },
            conversations,
            conversationOrder,
          };
        });
      } catch (error) {
        set((current) => ({
          ...current,
          pendingByClientId: {
            ...current.pendingByClientId,
            [pending.clientMessageId]: {
              ...pending,
              attempts: (current.pendingByClientId[pending.clientMessageId]?.attempts ?? 0) + 1,
            },
          },
        }));
      }
    }
  } finally {
    flushing = false;
  }
}

function handleRealtimeEvent(event: RealtimeEvent, set: SetStateFn, get: () => ChatState) {
  switch (event?.type) {
    case 'session:ready': {
      if (event.payload?.users) {
        useUserStore.getState().handlePresenceSnapshot(event.payload.users);
      }
      break;
    }
    case 'presence:update': {
      if (event.payload) {
        useUserStore.getState().handlePresenceUpdate(event.payload);
      }
      break;
    }
    case 'conversation:updated': {
      if (!event.payload) return;
      set((state) => {
        const incoming = toConversationState(event.payload as RemoteConversation);
        const conversations = {
          ...state.conversations,
          [incoming.id]: {
            ...state.conversations[incoming.id],
            ...incoming,
          },
        };
        const conversationOrder = sortConversationOrder([incoming.id, ...state.conversationOrder], conversations);
        return {
          ...state,
          conversations,
          conversationOrder,
        };
      });
      break;
    }
    case 'message:new': {
      const payload = event.payload as { message: RemoteMessage; conversation: RemoteConversation };
      if (!payload?.message || !payload?.conversation) return;
      set((state) => {
        const conversation = toConversationState(payload.conversation);
        const conversations = {
          ...state.conversations,
          [conversation.id]: {
            ...state.conversations[conversation.id],
            ...conversation,
            lastMessage: payload.message,
            updatedAt: Math.max(
              state.conversations[conversation.id]?.updatedAt ?? 0,
              payload.message.createdAt
            ),
          },
        };
        const messages = state.messages[conversation.id] ?? [];
        const updatedMessages = upsertMessage(messages, { ...payload.message, status: 'sent' });
        const conversationOrder = sortConversationOrder([conversation.id, ...state.conversationOrder], conversations);
        const pendingByClientId = { ...state.pendingByClientId };
        if (payload.message.clientMessageId) {
          delete pendingByClientId[payload.message.clientMessageId];
        }
        return {
          ...state,
          conversations,
          conversationOrder,
          messages: {
            ...state.messages,
            [conversation.id]: updatedMessages,
          },
          outbox: state.outbox.filter(
            (item) => item.clientMessageId !== payload.message.clientMessageId
          ),
          pendingByClientId,
        };
      });
      break;
    }
    case 'read:update': {
      if (!event.payload) return;
      const receipt = event.payload as { conversationId: string; userId: string; messageId?: string; readAt: number };
      set((state) => {
        const conversation = state.conversations[receipt.conversationId];
        if (!conversation) return state;
        return {
          ...state,
          conversations: {
            ...state.conversations,
            [receipt.conversationId]: {
              ...conversation,
              unreadCount: receipt.userId === state.currentUserId ? 0 : conversation.unreadCount,
            },
          },
        };
      });
      break;
    }
    default:
      break;
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  ...INITIAL_STATE,

  initialize: async (user) => {
    if (get().initialized && get().currentUserId === user.id) {
      return;
    }
    if (get().isLoading) return;

    set({ isLoading: true, currentUserId: user.id });

    try {
      const result = await apiFetchConversations({ userId: user.id, limit: 20 });
      const conversations: Record<string, ConversationState> = {};
      result.conversations.forEach((conversation) => {
        conversations[conversation.id] = toConversationState(conversation);
      });
      const conversationOrder = sortConversationOrder(Object.keys(conversations), conversations);

      set({
        conversations,
        conversationOrder,
        messages: {},
        initialized: true,
        isLoading: false,
      });

      if (!eventUnsubscribe) {
        eventUnsubscribe = realtimeClient.onEvent((event) => handleRealtimeEvent(event, set, get));
      }
      if (!statusUnsubscribe) {
        statusUnsubscribe = realtimeClient.onStatusChange((status) => {
          set({ connectionStatus: status });
          if (status === 'connected') {
            flushOutbox(get, set);
          }
        });
      }
      if (!onlineListenerAttached && typeof window !== 'undefined') {
        window.addEventListener('online', () => flushOutbox(get, set));
        onlineListenerAttached = true;
      }

      realtimeClient.connect(user.id, { name: user.name, color: user.color });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  reset: () => {
    set({
      ...INITIAL_STATE,
      conversations: {},
      conversationOrder: [],
      messages: {},
      outbox: [],
      pendingByClientId: {},
    });
    realtimeClient.disconnect();
    if (eventUnsubscribe) {
      eventUnsubscribe();
      eventUnsubscribe = null;
    }
    if (statusUnsubscribe) {
      statusUnsubscribe();
      statusUnsubscribe = null;
    }
  },

  setActiveChat: (userId) => set({ activeChat: userId }),

  getMessagesForChat: (userId1, userId2) => {
    const state = get();
    const conversation = Object.values(state.conversations).find((item) => {
      if (!item.isDirect) return false;
      const memberIds = item.members.map((member) => member.id);
      return memberIds.includes(userId1) && memberIds.includes(userId2);
    });
    if (!conversation) {
      return [];
    }
    return state.messages[conversation.id] ?? [];
  },

  ensureConversationForUser: async (peerId) => {
    const state = get();
    if (!state.currentUserId) {
      throw new Error('User must be authenticated to start a conversation');
    }
    const existing = Object.values(state.conversations).find((conversation) => {
      if (!conversation.isDirect) return false;
      const memberIds = conversation.members.map((member) => member.id);
      return memberIds.includes(peerId) && memberIds.includes(state.currentUserId!);
    });
    if (existing) {
      return existing.id;
    }
    const conversation = await apiEnsureConversation({
      memberIds: [state.currentUserId, peerId],
      isDirect: true,
    });
    set((current) => {
      const updatedConversations = {
        ...current.conversations,
        [conversation.id]: toConversationState(conversation),
      };
      return {
        ...current,
        conversations: updatedConversations,
        conversationOrder: sortConversationOrder([conversation.id, ...current.conversationOrder], updatedConversations),
      };
    });
    return conversation.id;
  },

  sendMessage: async ({ conversationId, recipientId, body }) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const state = get();
    const senderId = state.currentUserId;
    if (!senderId) {
      throw new Error('Cannot send message without an authenticated user');
    }
    let resolvedConversationId = conversationId ?? null;
    if (!resolvedConversationId) {
      if (!recipientId) {
        throw new Error('recipientId is required when conversationId is not provided');
      }
      resolvedConversationId = await get().ensureConversationForUser(recipientId);
    }
    const clientMessageId = crypto.randomUUID();
    const optimisticMessage: Message = {
      id: clientMessageId,
      conversationId: resolvedConversationId,
      senderId,
      body: trimmed,
      createdAt: Date.now(),
      clientMessageId,
      status: 'pending',
    };

    set((current) => {
      const messages = current.messages[resolvedConversationId!] ?? [];
      const updatedMessages = upsertMessage(messages, optimisticMessage);
      const conversation = current.conversations[resolvedConversationId!];
      const conversations = {
        ...current.conversations,
        [resolvedConversationId!]: conversation
          ? {
              ...conversation,
              lastMessage: optimisticMessage,
              updatedAt: optimisticMessage.createdAt,
            }
          : {
              id: resolvedConversationId!,
              title: null,
              isDirect: true,
              createdAt: optimisticMessage.createdAt,
              updatedAt: optimisticMessage.createdAt,
              members: [],
              lastMessage: optimisticMessage,
              unreadCount: 0,
              messageCursor: null,
              hasMore: true,
            } as ConversationState,
      };
      const newPending: PendingMessage = {
        clientMessageId,
        conversationId: resolvedConversationId!,
        recipientIds: recipientId ? [recipientId] : undefined,
        body: trimmed,
        senderId,
        createdAt: optimisticMessage.createdAt,
        attempts: 0,
      };
      return {
        ...current,
        conversations,
        conversationOrder: sortConversationOrder([resolvedConversationId!, ...current.conversationOrder], conversations),
        messages: {
          ...current.messages,
          [resolvedConversationId!]: updatedMessages,
        },
        outbox: [...current.outbox, newPending],
        pendingByClientId: {
          ...current.pendingByClientId,
          [clientMessageId]: newPending,
        },
      };
    });

    await flushOutbox(get, set);
  },

  loadOlderMessages: async (conversationId) => {
    const state = get();
    const conversation = state.conversations[conversationId];
    if (!conversation) return;
    if (!conversation.hasMore) return;
    const before = state.messages[conversationId]?.[0]?.createdAt ?? Number.MAX_SAFE_INTEGER;
    const result = await apiFetchMessages({ conversationId, before, limit: 25 });
    set((current) => {
      const existingMessages = current.messages[conversationId] ?? [];
      const mergedMessages = mergeMessageBatch(existingMessages, result.messages);
      return {
        ...current,
        messages: {
          ...current.messages,
          [conversationId]: mergedMessages,
        },
        conversations: {
          ...current.conversations,
          [conversationId]: {
            ...current.conversations[conversationId],
            hasMore: result.previousCursor !== null,
            messageCursor: result.previousCursor,
          },
        },
      };
    });
  },

  markConversationRead: async (conversationId) => {
    const state = get();
    const currentUserId = state.currentUserId;
    if (!currentUserId) return;
    const messages = state.messages[conversationId];
    const lastMessage = messages?.[messages.length - 1];
    if (!lastMessage) return;
    await apiSendReadReceipt({
      conversationId,
      userId: currentUserId,
      messageId: lastMessage.id,
    }).catch(() => undefined);
  },
}));
