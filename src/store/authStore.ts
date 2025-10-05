import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore, UserNode } from './userStore';
import {
  EnclypseUser,
  createDefaultUserProfile,
  VisibilityPreferences,
} from '../types/user';
import { LayerVisibilityMap } from '../types/visibility';

interface AuthState {
  user: EnclypseUser | null;
  isAuthenticated: boolean;
  registeredUsers: EnclypseUser[];
  login: (credentials: { email: string; password: string }) => boolean;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    color?: string;
    industries?: string[];
  }) => boolean;
  logout: () => void;
  updateProfile: (updates: Partial<Omit<EnclypseUser, 'id' | 'email' | 'password'>>) => void;
  updateVisibilityPreferences: (preferences: Partial<VisibilityPreferences>) => void;
  updateLayerVisibility: (layers: Partial<LayerVisibilityMap>) => void;
}

const toUserNode = (user: EnclypseUser, overrides?: Partial<UserNode>): UserNode => ({
  id: user.id,
  name: user.name,
  color: user.color,
  email: user.email,
  profilePicture: user.profilePicture,
  bio: user.bio,
  industries: user.industries,
  interests: user.interests,
  skills: user.skills,
  location: user.location,
  visibilityLayers: user.visibilityLayers,
  visibilityPreferences: user.visibilityPreferences,
  online: false,
  ...overrides,
});

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

        const baseProfile = createDefaultUserProfile({
          name: userData.name || userData.email.split('@')[0],
          email: userData.email,
          password: userData.password,
          color: userData.color,
          industries: userData.industries ?? ['Independent'],
        });

        const newUser: EnclypseUser = {
          ...baseProfile,
          id: `user_${Date.now()}`,
        };

        set((state) => ({
          registeredUsers: [...state.registeredUsers, newUser],
          user: newUser,
          isAuthenticated: true,
        }));

        const { addUser, setOnlineStatus } = useUserStore.getState();
        addUser(
          toUserNode(newUser, {
            online: true,
          })
        );
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
          addUser(
            toUserNode(user, {
              online: true,
            })
          );
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

          const updatedUser: EnclypseUser = {
            ...state.user,
            ...updates,
            visibilityLayers: updates.visibilityLayers ?? state.user.visibilityLayers,
            visibilityPreferences:
              updates.visibilityPreferences ?? state.user.visibilityPreferences,
          };

          const updatedRegisteredUsers = state.registeredUsers.map((u) =>
            u.id === updatedUser.id ? updatedUser : u
          );

          const { updateUserColor, addUser } = useUserStore.getState();
          if (updates.color) {
            updateUserColor(updatedUser.id, updates.color);
          }

          addUser(
            toUserNode(updatedUser, {
              online: true,
            })
          );

          return {
            user: updatedUser,
            registeredUsers: updatedRegisteredUsers,
          };
        }),

      updateVisibilityPreferences: (preferences) =>
        set((state) => {
          if (!state.user) return state;
          const mergedPreferences: VisibilityPreferences = {
            ...state.user.visibilityPreferences,
            ...preferences,
          };

          const updatedUser: EnclypseUser = {
            ...state.user,
            visibilityPreferences: mergedPreferences,
          };

          const updatedRegisteredUsers = state.registeredUsers.map((u) =>
            u.id === updatedUser.id ? updatedUser : u
          );

          const { updateVisibilityPreferences } = useUserStore.getState();
          updateVisibilityPreferences(updatedUser.id, mergedPreferences);

          return {
            user: updatedUser,
            registeredUsers: updatedRegisteredUsers,
          };
        }),

      updateLayerVisibility: (layers) =>
        set((state) => {
          if (!state.user) return state;
          const mergedLayers: LayerVisibilityMap = {
            ...state.user.visibilityLayers,
            ...layers,
          };

          const updatedUser: EnclypseUser = {
            ...state.user,
            visibilityLayers: mergedLayers,
          };

          const updatedRegisteredUsers = state.registeredUsers.map((u) =>
            u.id === updatedUser.id ? updatedUser : u
          );

          const { updateUserVisibilityLayers } = useUserStore.getState();
          updateUserVisibilityLayers(updatedUser.id, mergedLayers);

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
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.user) return;
        const { addUser } = useUserStore.getState();
        addUser(toUserNode(state.user));
      },
    }
  )
);
