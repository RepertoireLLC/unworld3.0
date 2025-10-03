import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';
import { generateColor } from '../utils/color';

interface User {
  id: string;
  name: string;
  color: string;
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
  statusMessage?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  registeredUsers: User[];
  login: (credentials: { email: string; password: string }) => boolean;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    color: string;
    statusMessage?: string;
  }) => boolean;
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
        const existingUser = registeredUsers.find((u) => u.email === userData.email);

        if (existingUser) {
          return false;
        }

        const newUser: User = {
          id: `user_${Date.now()}`,
          name: userData.name || userData.email.split('@')[0],
          email: userData.email,
          password: userData.password,
          color: userData.color || generateColor(),
          statusMessage: userData.statusMessage || 'Available',
        };

        set((state) => ({
          registeredUsers: [...state.registeredUsers, newUser],
          user: newUser,
          isAuthenticated: true,
        }));

        const { addUser, setOnlineStatus } = useUserStore.getState();
        addUser({
          id: newUser.id,
          name: newUser.name,
          color: newUser.color,
          online: true,
          profilePicture: newUser.profilePicture,
          statusMessage: newUser.statusMessage,
        });
        setOnlineStatus(newUser.id, true);

        return true;
      },

      login: (credentials) => {
        const { registeredUsers } = get();
        const user = registeredUsers.find(
          (u) => u.email === credentials.email && u.password === credentials.password
        );

        if (user) {
          set({ user, isAuthenticated: true });

          const { addUser, setOnlineStatus } = useUserStore.getState();
          addUser({
            id: user.id,
            name: user.name,
            color: user.color,
            online: true,
            profilePicture: user.profilePicture,
            statusMessage: user.statusMessage,
          });
          setOnlineStatus(user.id, true);

          return true;
        }

        return false;
      },

      logout: () => {
        const { user } = get();
        if (user) {
          const { setOnlineStatus } = useUserStore.getState();
          setOnlineStatus(user.id, false);
        }
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: (updates) =>
        set((state) => {
          if (!state.user) return state;

          const updatedUser = { ...state.user, ...updates };

          const updatedRegisteredUsers = state.registeredUsers.map((u) =>
            u.id === updatedUser.id ? updatedUser : u
          );

          const { updateUserColor, updateUserProfile } = useUserStore.getState();
          if (updates.color) {
            updateUserColor(updatedUser.id, updates.color);
          }
          updateUserProfile(updatedUser.id, {
            name: updatedUser.name,
            color: updatedUser.color,
            profilePicture: updatedUser.profilePicture,
            statusMessage: updatedUser.statusMessage,
          });

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
