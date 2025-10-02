import { create } from 'zustand';
import { api } from '../services/api';
import type { ApiUser } from '../types';
import { useAuthStore } from './authStore';

interface UserState {
  users: ApiUser[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  updateUser: (user: ApiUser) => void;
  reset: () => void;
  getOnlineUsers: () => ApiUser[];
}

const initialState = {
  users: [] as ApiUser[],
  loading: false,
  error: null as string | null,
};

export const useUserStore = create<UserState>((set, get) => ({
  ...initialState,

  fetchUsers: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ loading: true, error: null });
    try {
      const users = await api.getUsers(token);
      set({ users, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load users';
      set({ error: message, loading: false });
    }
  },

  updateUser: (user) =>
    set((state) => {
      const exists = state.users.some((existing) => existing.id === user.id);
      return {
        users: exists
          ? state.users.map((existing) => (existing.id === user.id ? user : existing))
          : state.users.concat(user),
      };
    }),

  reset: () => set(initialState),

  getOnlineUsers: () => {
    const state = get();
    return state.users.filter((user) => user.online);
  },
}));
