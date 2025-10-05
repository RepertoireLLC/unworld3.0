import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';
import { apiUpdatePresence } from '../lib/api';

interface User {
  id: string;
  name: string;
  color: string;
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  registeredUsers: User[];
  login: (credentials: { email: string; password: string }) => Promise<boolean>;
  register: (userData: { email: string; password: string; name: string; color: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      registeredUsers: [],

      register: async (userData) => {
        const { registeredUsers } = get();
        const existingUser = registeredUsers.find((u) => u.email === userData.email);

        if (existingUser) {
          return false;
        }

        const id = `user_${Date.now()}`;
        const newUser: User = {
          id,
          name: userData.name || userData.email.split('@')[0],
          email: userData.email,
          password: userData.password,
          color: userData.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        };

        set((state) => ({
          registeredUsers: [...state.registeredUsers, newUser],
          user: newUser,
          isAuthenticated: true,
        }));

        const userStore = useUserStore.getState();
        userStore.setCurrentUser(newUser.id);
        userStore.upsertUser({
          id: newUser.id,
          name: newUser.name,
          color: newUser.color,
          email: newUser.email,
        }).catch(() => undefined);

        apiUpdatePresence({ userId: newUser.id, presence: 'online' })
          .then((remote) => userStore.handlePresenceUpdate(remote))
          .catch(() => undefined);

        return true;
      },

      login: async (credentials) => {
        const { registeredUsers } = get();
        const user = registeredUsers.find(
          (u) => u.email === credentials.email && u.password === credentials.password
        );

        if (!user) {
          return false;
        }

        set({ user, isAuthenticated: true });

        const userStore = useUserStore.getState();
        userStore.setCurrentUser(user.id);
        await userStore.upsertUser({
          id: user.id,
          name: user.name,
          color: user.color,
          email: user.email,
        }).catch(() => undefined);

        apiUpdatePresence({ userId: user.id, presence: 'online' })
          .then((remote) => userStore.handlePresenceUpdate(remote))
          .catch(() => undefined);

        return true;
      },

      logout: async () => {
        const current = get().user;
        set({ user: null, isAuthenticated: false });
        const userStore = useUserStore.getState();
        userStore.setCurrentUser(null);
        if (current) {
          apiUpdatePresence({ userId: current.id, presence: 'offline', lastSeen: Date.now() })
            .then((remote) => userStore.handlePresenceUpdate(remote))
            .catch(() => undefined);
        }
      },

      updateProfile: (updates) =>
        set((state) => {
          if (!state.user) return state;

          const updatedUser: User = { ...state.user, ...updates };

          const updatedRegisteredUsers = state.registeredUsers.map((u) =>
            u.id === updatedUser.id ? updatedUser : u
          );

          const userStore = useUserStore.getState();
          userStore.upsertUser({
            id: updatedUser.id,
            name: updatedUser.name,
            color: updatedUser.color,
            email: updatedUser.email,
          }).catch(() => undefined);

          return {
            user: updatedUser,
            registeredUsers: updatedRegisteredUsers,
          };
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        registeredUsers: state.registeredUsers,
      }),
    }
  )
);
