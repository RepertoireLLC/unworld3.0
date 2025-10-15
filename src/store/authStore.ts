import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';
import { useThemeStore, type ThemePreferencesSnapshot } from './themeStore';
import { useInterestStore } from './interestStore';
import { useMeshStore } from './meshStore';
import { useForumStore } from './forumStore';
import { useFriendStore } from './friendStore';
import { useChatStore } from './chatStore';
import { useMemoryStore } from './memoryStore';
import { useStorageStore } from './storageStore';

const HEX_FULL_PATTERN = /^#?[0-9a-fA-F]{6}$/;
const HEX_SHORT_PATTERN = /^#?[0-9a-fA-F]{3}$/;

const generateRandomColor = () =>
  `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')}`;

const normalizeHexColor = (input: string | undefined | null, fallback?: string) => {
  if (!input) {
    return fallback ?? generateRandomColor();
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return fallback ?? generateRandomColor();
  }

  if (HEX_FULL_PATTERN.test(trimmed)) {
    const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    return `#${normalized.toUpperCase()}`;
  }

  if (HEX_SHORT_PATTERN.test(trimmed)) {
    const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    const expanded = normalized
      .split('')
      .map((char) => char + char)
      .join('');
    return `#${expanded.toUpperCase()}`;
  }

  return fallback ?? generateRandomColor();
};

interface UserPreferences {
  nsfwAllowed: boolean;
}

interface User {
  id: string;
  name: string;
  color: string;
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
  themePreferences?: ThemePreferencesSnapshot;
  preferences: UserPreferences;
  accountStatus: 'active' | 'deactivated';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  registeredUsers: User[];
  login: (credentials: { email: string; password: string }) => boolean;
  register: (userData: { email: string; password: string; name: string; color: string }) => boolean;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  deactivateAccount: () => void;
  reactivateAccount: () => void;
  deleteAccount: () => Promise<void>;
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

        const defaultPreferences: UserPreferences = {
          nsfwAllowed: false,
        };

        const resolvedColor = normalizeHexColor(userData.color);

        const newUser: User = {
          id: `user_${Date.now()}`,
          name: userData.name || userData.email.split('@')[0],
          email: userData.email,
          password: userData.password,
          color: resolvedColor,
          themePreferences: defaultThemePreferences,
          preferences: defaultPreferences,
          accountStatus: 'active',
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
        const foundUser = registeredUsers.find(
          u => u.email === credentials.email && u.password === credentials.password
        );

        if (foundUser) {
          const normalizedColor = normalizeHexColor(foundUser.color, foundUser.color);
          const normalizedPreferences: UserPreferences = {
            nsfwAllowed: foundUser.preferences?.nsfwAllowed ?? false,
          };

          const normalizedUser: User = {
            ...foundUser,
            color: normalizedColor,
            themePreferences: foundUser.themePreferences,
            preferences: normalizedPreferences,
            accountStatus: foundUser.accountStatus ?? 'active',
          };

          const updatedRegisteredUsers = registeredUsers.map((existing) =>
            existing.id === normalizedUser.id ? { ...normalizedUser } : existing
          );

          if (normalizedUser.accountStatus === 'deactivated') {
            normalizedUser.accountStatus = 'active';
          }

          set({ user: normalizedUser, isAuthenticated: true, registeredUsers: updatedRegisteredUsers });

          useThemeStore.getState().hydrateFromPreferences(normalizedUser.themePreferences);

          // Set user as online
          const { addUser, setOnlineStatus } = useUserStore.getState();
          addUser({
            id: normalizedUser.id,
            name: normalizedUser.name,
            color: normalizedUser.color,
            online: true
          });
          setOnlineStatus(normalizedUser.id, true);

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

          const sanitizedUpdates: Partial<User> = { ...updates };
          if (updates.color !== undefined) {
            sanitizedUpdates.color = normalizeHexColor(updates.color, state.user.color);
          }

          const mergedPreferences: UserPreferences = updates.preferences
            ? {
                ...state.user.preferences,
                ...updates.preferences,
              }
            : state.user.preferences ?? { nsfwAllowed: false };

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
            ...sanitizedUpdates,
            themePreferences: mergedThemePreferences,
            preferences: mergedPreferences,
            accountStatus: updates.accountStatus ?? state.user.accountStatus ?? 'active',
          };

          // Update in registered users list
          const updatedRegisteredUsers = state.registeredUsers.map(u =>
            u.id === updatedUser.id ? updatedUser : u
          );

          // Update in user store
          const { updateUserColor } = useUserStore.getState();
          if (updates.color !== undefined) {
            updateUserColor(updatedUser.id, updatedUser.color);
          }

          useThemeStore.getState().hydrateFromPreferences(updatedUser.themePreferences);

          return {
            user: updatedUser,
            registeredUsers: updatedRegisteredUsers
          };
        }),
      updatePreferences: (preferences) => {
        const state = get();
        if (!state.user) {
          return;
        }
        const nextPreferences: UserPreferences = {
          ...state.user.preferences,
          ...preferences,
        };
        state.updateProfile({ preferences: nextPreferences });
      },
      deactivateAccount: () => {
        const state = get();
        const currentUser = state.user;
        if (!currentUser) {
          return;
        }

        const updatedUser: User = {
          ...currentUser,
          accountStatus: 'deactivated',
        };

        const updatedRegisteredUsers = state.registeredUsers.map((entry) =>
          entry.id === updatedUser.id ? updatedUser : entry
        );

        const { setOnlineStatus } = useUserStore.getState();
        setOnlineStatus(updatedUser.id, false);

        set({
          user: null,
          isAuthenticated: false,
          registeredUsers: updatedRegisteredUsers,
        });
      },
      reactivateAccount: () => {
        const state = get();
        const currentUser = state.user;
        if (!currentUser || currentUser.accountStatus === 'active') {
          return;
        }

        state.updateProfile({ accountStatus: 'active' });
      },
      deleteAccount: async () => {
        const state = get();
        const currentUser = state.user;
        if (!currentUser) {
          return;
        }

        const nextRegistered = state.registeredUsers.filter((entry) => entry.id !== currentUser.id);

        const { removeUser } = useUserStore.getState();
        removeUser(currentUser.id);
        useInterestStore.getState().removeProfile(currentUser.id);
        useFriendStore.getState().removeUser(currentUser.id);
        useForumStore.getState().removeUserContent(currentUser.id);
        useMeshStore.getState().reset();
        useChatStore.getState().purgeUser(currentUser.id);
        await useMemoryStore.getState().removeUser(currentUser.id);
        await useStorageStore.getState().reset();

        set({ user: null, isAuthenticated: false, registeredUsers: nextRegistered });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        registeredUsers: state.registeredUsers,
      }),
    }
  )
);