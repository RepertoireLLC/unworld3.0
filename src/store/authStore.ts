import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';
import { useThemeStore, type ThemePreferencesSnapshot } from './themeStore';
import type { ChessGameSummary } from '../types/chess';

interface User {
  id: string;
  name: string;
  color: string;
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
  themePreferences?: ThemePreferencesSnapshot;
  status: 'active' | 'deactivated';
  contentPreferences: {
    nsfw: boolean;
  };
  chessProfile: {
    history: ChessGameSummary[];
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  registeredUsers: User[];
  login: (credentials: { email: string; password: string }) => boolean;
  register: (userData: { email: string; password: string; name: string; color: string }) => boolean;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  updateContentPreferences: (preferences: Partial<User['contentPreferences']>) => void;
  deactivateAccount: () => void;
  deleteAccount: () => boolean;
  recordChessGame: (userId: string, summary: ChessGameSummary) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      registeredUsers: [],

      register: (userData) => {
        const { registeredUsers } = get();
        const existingUser = registeredUsers.find(u => u.email === userData.email);
        
        if (existingUser) {
          return false;
        }

        const defaultThemePreferences: ThemePreferencesSnapshot = {
          activeThemeId: 'classic',
          customThemes: [],
        };

        const newUser: User = {
          id: `user_${Date.now()}`,
          name: userData.name || userData.email.split('@')[0],
          email: userData.email,
          password: userData.password,
          color: userData.color || '#' + Math.floor(Math.random()*16777215).toString(16),
          themePreferences: defaultThemePreferences,
          status: 'active',
          contentPreferences: {
            nsfw: false,
          },
          chessProfile: {
            history: [],
          },
        };

        set(state => ({
          registeredUsers: [...state.registeredUsers, newUser],
          user: newUser,
          isAuthenticated: true
        }));

        useThemeStore.getState().hydrateFromPreferences(defaultThemePreferences);

        // Add user to the online users
        const { addUser, setOnlineStatus } = useUserStore.getState();
        addUser({
          id: newUser.id,
          name: newUser.name,
          color: newUser.color,
          online: true
        });
        setOnlineStatus(newUser.id, true);

        return true;
      },

      login: (credentials) => {
        const { registeredUsers } = get();
        const user = registeredUsers.find(
          u => u.email === credentials.email && u.password === credentials.password
        );

        if (user) {
          const restoredUser: User = {
            ...user,
            status: 'active',
            contentPreferences: user.contentPreferences ?? { nsfw: false },
            chessProfile: user.chessProfile ?? { history: [] },
          };

          set((state) => ({
            user: restoredUser,
            isAuthenticated: true,
            registeredUsers: state.registeredUsers.map((registered) =>
              registered.id === restoredUser.id
                ? {
                    ...registered,
                    status: 'active',
                    contentPreferences: restoredUser.contentPreferences,
                    chessProfile: restoredUser.chessProfile,
                  }
                : registered
            ),
          }));

          useThemeStore.getState().hydrateFromPreferences(restoredUser.themePreferences);

          // Set user as online
          const { addUser, setOnlineStatus } = useUserStore.getState();
          addUser({
            id: restoredUser.id,
            name: restoredUser.name,
            color: restoredUser.color,
            online: true
          });
          setOnlineStatus(user.id, true);

          return true;
        }

        return false;
      },

      logout: () => {
        const { user } = get();
        if (user) {
          // Set user as offline before logging out
          const { setOnlineStatus } = useUserStore.getState();
          setOnlineStatus(user.id, false);
        }
        set({ user: null, isAuthenticated: false });
        useThemeStore.getState().hydrateFromPreferences(undefined);
      },

      updateProfile: (updates) =>
        set((state) => {
          if (!state.user) return state;

          const mergedThemePreferences: ThemePreferencesSnapshot | undefined =
            updates.themePreferences
              ? {
                  activeThemeId:
                    updates.themePreferences.activeThemeId ??
                    state.user.themePreferences?.activeThemeId ??
                    'classic',
                  customThemes:
                    updates.themePreferences.customThemes ??
                    state.user.themePreferences?.customThemes ??
                    [],
                }
              : state.user.themePreferences;

          const updatedUser: User = {
            ...state.user,
            ...updates,
            themePreferences: mergedThemePreferences,
            contentPreferences: {
              ...state.user.contentPreferences,
              ...(updates.contentPreferences ?? {}),
            },
            status: updates.status ?? state.user.status,
            chessProfile: updates.chessProfile ?? state.user.chessProfile,
          };

          // Update in registered users list
          const updatedRegisteredUsers = state.registeredUsers.map(u =>
            u.id === updatedUser.id ? updatedUser : u
          );

          // Update in user store
          const { updateUserColor } = useUserStore.getState();
          if (updates.color) {
            updateUserColor(updatedUser.id, updates.color);
          }

          useThemeStore.getState().hydrateFromPreferences(updatedUser.themePreferences);

          return {
            user: updatedUser,
            registeredUsers: updatedRegisteredUsers
          };
        }),
      updateContentPreferences: (preferences) =>
        set((state) => {
          if (!state.user) {
            return state;
          }

          const updatedUser: User = {
            ...state.user,
            contentPreferences: {
              ...state.user.contentPreferences,
              ...preferences,
            },
          };

          return {
            user: updatedUser,
            registeredUsers: state.registeredUsers.map((registered) =>
              registered.id === updatedUser.id ? updatedUser : registered
            ),
          };
        }),
      deactivateAccount: () =>
        set((state) => {
          if (!state.user) {
            return state;
          }

          const updatedUser: User = {
            ...state.user,
            status: 'deactivated',
          };

          const { setOnlineStatus } = useUserStore.getState();
          setOnlineStatus(updatedUser.id, false);

          return {
            user: updatedUser,
            isAuthenticated: false,
            registeredUsers: state.registeredUsers.map((registered) =>
              registered.id === updatedUser.id ? updatedUser : registered
            ),
          };
        }),
      deleteAccount: () => {
        const state = get();
        const user = state.user;
        if (!user) {
          return false;
        }

        const filteredUsers = state.registeredUsers.filter((registered) => registered.id !== user.id);

        const { removeUser } = useUserStore.getState();
        removeUser(user.id);

        useThemeStore.getState().hydrateFromPreferences(undefined);

        set({
          user: null,
          isAuthenticated: false,
          registeredUsers: filteredUsers,
        });

        return true;
      },
      recordChessGame: (userId, summary) =>
        set((state) => {
          const applyHistory = (user: User): User => {
            const existingHistory = user.chessProfile?.history ?? [];
            const filtered = existingHistory.filter((entry) => entry.id !== summary.id);
            return {
              ...user,
              chessProfile: {
                history: [summary, ...filtered],
              },
            };
          };

          const registeredUsers = state.registeredUsers.map((registered) =>
            registered.id === userId ? applyHistory(registered) : registered
          );

          const currentUser =
            state.user && state.user.id === userId ? applyHistory(state.user) : state.user;

          return {
            registeredUsers,
            user: currentUser ?? state.user,
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