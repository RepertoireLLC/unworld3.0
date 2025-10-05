import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';

interface User {
  id: string;
  name: string;
  color: string;
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
  roles: string[];
  location?: { lat: number; lon: number };
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

        const newUser = {
          id: `user_${Date.now()}`,
          name: userData.name || userData.email.split('@')[0],
          email: userData.email,
          password: userData.password,
          color: userData.color || '#' + Math.floor(Math.random()*16777215).toString(16),
          roles: ['user'],
          location: { lat: 37.7749, lon: -122.4194 },
        };

        set(state => ({
          registeredUsers: [...state.registeredUsers, newUser],
          user: newUser,
          isAuthenticated: true
        }));

        localStorage.setItem('enclypse_token', btoa(JSON.stringify({
          id: newUser.id,
          name: newUser.name,
          roles: newUser.roles,
        })));

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
          const normalizedUser = {
            ...user,
            roles: user.roles?.length ? user.roles : ['user'],
            location: user.location ?? { lat: 37.7749, lon: -122.4194 },
          };
          set({ user: normalizedUser, isAuthenticated: true });

          localStorage.setItem('enclypse_token', btoa(JSON.stringify({
            id: normalizedUser.id,
            name: normalizedUser.name,
            roles: normalizedUser.roles,
          })));

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
        localStorage.removeItem('enclypse_token');
      },

      updateProfile: (updates) =>
        set((state) => {
          if (!state.user) return state;

          const updatedUser = { ...state.user, ...updates };

          // Update in registered users list
          const updatedRegisteredUsers = state.registeredUsers.map(u =>
            u.id === updatedUser.id ? updatedUser : u
          );

          // Update in user store
          const { updateUserColor } = useUserStore.getState();
          if (updates.color) {
            updateUserColor(updatedUser.id, updates.color);
          }

          if (updates.roles) {
            localStorage.setItem('enclypse_token', btoa(JSON.stringify({
              id: updatedUser.id,
              name: updatedUser.name,
              roles: updatedUser.roles,
            })));
          }

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