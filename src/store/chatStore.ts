import { create } from 'zustand';
import { api } from '../services/api';
import type { Message } from '../types';
import { useAuthStore } from './authStore';

function conversationKey(userA: string, userB: string) {
  return [userA, userB].sort().join('::');
}

interface ChatState {
  activeChat: string | null;
  conversations: Record<string, Message[]>;
  loading: boolean;
  error: string | null;
  setActiveChat: (userId: string | null) => void;
  fetchMessages: (otherUserId: string) => Promise<void>;
  sendMessage: (otherUserId: string, content: string) => Promise<void>;
  getMessagesForChat: (userId1: string, userId2: string) => Message[];
  reset: () => void;
}

const initialState = {
  activeChat: null as string | null,
  conversations: {} as Record<string, Message[]>,
  loading: false,
  error: null as string | null,
};

export const useChatStore = create<ChatState>((set, get) => ({
  ...initialState,

  setActiveChat: (userId) => set({ activeChat: userId }),

  fetchMessages: async (otherUserId) => {
    const token = useAuthStore.getState().token;
    const currentUser = useAuthStore.getState().user;
    if (!token || !currentUser) return;

    set({ loading: true, error: null });
    try {
      const messages = await api.getMessages(token, otherUserId);
      const key = conversationKey(currentUser.id, otherUserId);
      set((state) => ({
        conversations: { ...state.conversations, [key]: messages },
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load messages';
      set({ error: message, loading: false });
    }
  },

  sendMessage: async (otherUserId, content) => {
    const token = useAuthStore.getState().token;
    const currentUser = useAuthStore.getState().user;
    if (!token || !currentUser) return;

    try {
      const message = await api.sendMessage(token, otherUserId, content);
      const key = conversationKey(currentUser.id, otherUserId);
      set((state) => ({
        conversations: {
          ...state.conversations,
          [key]: [...(state.conversations[key] ?? []), message],
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send message';
      set({ error: message });
    }
  },

  getMessagesForChat: (userId1, userId2) => {
    const key = conversationKey(userId1, userId2);
    return get().conversations[key] ?? [];
  },

  reset: () => set(initialState),
}));
