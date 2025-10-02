import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';
import type { ApiUser } from '../types';
import { useUserStore } from './userStore';
import { useFriendStore } from './friendStore';
import { useStoryStore } from './storyStore';
import { useChatStore } from './chatStore';

interface AuthState {
  user: ApiUser | null;
  token: string | null;
  isAuthenticated: boolean;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (credentials: { email: string; password: string }) => Promise<boolean>;
  register: (payload: { email: string; password: string; name?: string; color?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<ApiUser, 'name' | 'color' | 'bio' | 'profilePicture'>>) => Promise<void>;
  clearError: () => void;
}

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  initialized: false,
  loading: false,
  error: null as string | null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      initialize: async () => {
        const { initialized, token } = get();
        if (initialized) return;

        if (!token) {
          set({ initialized: true });
          return;
        }

        try {
          const user = await api.getSession(token);
          set({ user, isAuthenticated: true, initialized: true });
        } catch (error) {
          console.error('Session check failed', error);
          set({ token: null, user: null, isAuthenticated: false, initialized: true });
        }
      },

      login: async (credentials) => {
        set({ loading: true, error: null });
        try {
          const { token, user } = await api.login(credentials);
          set({ token, user, isAuthenticated: true, loading: false });
          await Promise.all([
            useUserStore.getState().fetchUsers(),
            useFriendStore.getState().fetchFriendRequests(),
            useStoryStore.getState().fetchStories(),
          ]);
          useChatStore.getState().reset();
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to sign in';
          set({ error: message, loading: false, isAuthenticated: false });
          return false;
        }
      },

      register: async (payload) => {
        set({ loading: true, error: null });
        try {
          const { token, user } = await api.register(payload);
          set({ token, user, isAuthenticated: true, loading: false });
          await Promise.all([
            useUserStore.getState().fetchUsers(),
            useFriendStore.getState().fetchFriendRequests(),
            useStoryStore.getState().fetchStories(),
          ]);
          useChatStore.getState().reset();
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to register';
          set({ error: message, loading: false, isAuthenticated: false });
          return false;
        }
      },

      logout: async () => {
        const { token } = get();
        try {
          if (token) {
            await api.logout(token);
          }
        } catch (error) {
          console.warn('Failed to logout cleanly', error);
        }

        set({ ...initialState, initialized: true });
        useUserStore.getState().reset();
        useFriendStore.getState().reset();
        useStoryStore.getState().reset();
        useChatStore.getState().reset();
      },

      updateProfile: async (updates) => {
        const { user, token } = get();
        if (!user || !token) return;

        try {
          const updated = await api.updateProfile(token, user.id, updates);
          set({ user: updated });
          useUserStore.getState().updateUser(updated);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Profile update failed';
          set({ error: message });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
