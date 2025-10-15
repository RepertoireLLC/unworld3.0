import { create } from 'zustand';
import { useMemoryStore, getConversationId } from './memoryStore';
import { generateId } from '../utils/id';
import { dispatchConsciousEvent } from '../core/consciousCore';

interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  timestamp: number;
}

interface ChatState {
  activeChat: string | null;
  messages: Message[];
  setActiveChat: (userId: string | null) => void;
  sendMessage: (fromUserId: string, toUserId: string, content: string, options?: { role?: 'user' | 'ai' | 'observer' | 'ally' }) => void;
  getMessagesForChat: (userId1: string, userId2: string) => Message[];
  loadMessagesForChat: (userId1: string, userId2: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChat: null,
  messages: [],

  setActiveChat: (userId) => set({ activeChat: userId }),

  sendMessage: (fromUserId, toUserId, content, options) => {
    const timestamp = Date.now();
    const newMessage: Message = {
      id: generateId('chat'),
      fromUserId,
      toUserId,
      content,
      timestamp,
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
    }));

    const conversationId = getConversationId(fromUserId, toUserId);
    const role = options?.role ?? 'user';
    void useMemoryStore.getState().appendMessage({
      conversationId,
      fromUserId,
      toUserId,
      role,
      content,
    });
    void dispatchConsciousEvent({
      type: 'memory:updated',
      nodeId: conversationId,
    });
  },

  getMessagesForChat: (userId1, userId2) => {
    return get()
      .messages.filter(
        (msg) =>
          (msg.fromUserId === userId1 && msg.toUserId === userId2) ||
          (msg.fromUserId === userId2 && msg.toUserId === userId1)
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  loadMessagesForChat: async (userId1, userId2) => {
    const memoryState = useMemoryStore.getState();
    if (!memoryState.isHydrated) {
      await memoryState.hydrate();
    }

    const fromMemory = memoryState.getMessagesBetween(userId1, userId2).map((item) => ({
      id: item.id,
      fromUserId: item.fromUserId,
      toUserId: item.toUserId,
      content: item.content,
      timestamp: Date.parse(item.timestamp),
    }));
    set((state) => ({
      messages: [
        ...state.messages.filter((message) =>
          !(
            (message.fromUserId === userId1 && message.toUserId === userId2) ||
            (message.fromUserId === userId2 && message.toUserId === userId1)
          )
        ),
        ...fromMemory,
      ],
    }));

    const conversationId = getConversationId(userId1, userId2);
    void memoryState.selfHeal(conversationId);
    void dispatchConsciousEvent({
      type: 'sync:heal',
      nodeId: conversationId,
    });
  },
}));