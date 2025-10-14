import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';
import { useLayerStore } from './layerStore';

interface User {
  id: string;
  name: string;
  color: string;
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
  layers?: string[];
  proposedLayer?: string | null;
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
    layers?: string[];
    proposedLayer?: string | null;
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
        const existingUser = registeredUsers.find(u => u.email === userData.email);

        if (existingUser) {
          return false;
        }

        const normalizedLayers = Array.from(new Set((userData.layers || []).filter(Boolean)));
        const proposedLayer = userData.proposedLayer?.trim() || null;

        const newUser = {
          id: `user_${Date.now()}`,
          name: userData.name || userData.email.split('@')[0],
          email: userData.email,
          password: userData.password,
          color: userData.color || '#' + Math.floor(Math.random()*16777215).toString(16),
          layers: normalizedLayers,
          proposedLayer,
        };

        set(state => ({
          registeredUsers: [...state.registeredUsers, newUser],
          user: newUser,
          isAuthenticated: true
        }));

        // Add user to the online users
        const { addUser, setOnlineStatus } = useUserStore.getState();
        const { assignUserToLayers, proposeDomain } = useLayerStore.getState();
        addUser({
          id: newUser.id,
          name: newUser.name,
          color: newUser.color,
          online: true,
          layers: normalizedLayers,
        });
        setOnlineStatus(newUser.id, true);
        assignUserToLayers(newUser.id, normalizedLayers);
        proposeDomain(newUser.id, proposedLayer);

        return true;
      },

      login: (credentials) => {
        const { registeredUsers } = get();
        const user = registeredUsers.find(
          u => u.email === credentials.email && u.password === credentials.password
        );

        if (user) {
          set({ user, isAuthenticated: true });

          // Set user as online
          const { addUser, setOnlineStatus } = useUserStore.getState();
          const { assignUserToLayers, proposeDomain } = useLayerStore.getState();
          addUser({
            id: user.id,
            name: user.name,
            color: user.color,
            online: true,
            layers: user.layers || [],
          });
          setOnlineStatus(user.id, true);
          assignUserToLayers(user.id, user.layers || []);
          proposeDomain(user.id, user.proposedLayer || null);

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
      },

      updateProfile: (updates) =>
        set((state) => {
          if (!state.user) return state;

          const updatedUser = { ...state.user, ...updates };

          // Update in registered users list
          const updatedRegisteredUsers = state.registeredUsers.map(u =>
            u.id === updatedUser.id ? updatedUser : u
          );

          // Update in user store & layer store
          const { updateUserColor, updateUserLayers } = useUserStore.getState();
          const { assignUserToLayers, proposeDomain } = useLayerStore.getState();

          if (updates.color) {
            updateUserColor(updatedUser.id, updates.color);
          }

          if (updates.layers) {
            const normalizedLayers = Array.from(new Set(updates.layers.filter(Boolean)));
            updateUserLayers(updatedUser.id, normalizedLayers);
            assignUserToLayers(updatedUser.id, normalizedLayers);
            updatedUser.layers = normalizedLayers;
          }

          if ('proposedLayer' in updates) {
            const proposal = updates.proposedLayer?.trim() || null;
            proposeDomain(updatedUser.id, proposal);
            updatedUser.proposedLayer = proposal;
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