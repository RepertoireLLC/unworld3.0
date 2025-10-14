import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';
import { useThemeStore, type ThemePreferencesSnapshot } from './themeStore';

interface User {
  id: string;
  name: string;
  color: string;
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
  themePreferences?: ThemePreferencesSnapshot;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  registeredUsers: User[];
  login: (credentials: { email: string; password: string }) => boolean;
  register: (userData: { email: string; password: string; name: string; color: string }) => boolean;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
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
          set({ user, isAuthenticated: true });

          useThemeStore.getState().hydrateFromPreferences(user.themePreferences);
          
          // Set user as online
          const { addUser, setOnlineStatus } = useUserStore.getState();
          addUser({
            id: user.id,
            name: user.name,
            color: user.color,
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
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        registeredUsers: state.registeredUsers,
      }),
    }
  )
);