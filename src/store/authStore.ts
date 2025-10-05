import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore, PresenceUser } from './userStore';
import { Visibility, resolveLayerIds } from '../lib/permissions';

interface AuthUser extends PresenceUser {
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  registeredUsers: AuthUser[];
  login: (credentials: { email: string; password: string }) => boolean;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    color: string;
    layerIds?: string[];
    visibility?: Visibility;
  }) => boolean;
  logout: () => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      registeredUsers: [],

      register: (userData) => {
        const { registeredUsers } = get();
        const existingUser = registeredUsers.find(
          (u) => u.email === userData.email
        );

        if (existingUser) {
          return false;
        }

        const layerIds = resolveLayerIds(userData.layerIds);
        const userId = `user_${Date.now()}`;
        const newUser: AuthUser = {
          id: userId,
          ownerId: userId,
          name: userData.name || userData.email.split('@')[0],
          email: userData.email,
          password: userData.password,
          color:
            userData.color ||
            '#' + Math.floor(Math.random() * 16777215).toString(16),
          online: true,
          layerIds,
          visibility: userData.visibility ?? Visibility.MEMBERS,
        };
        newUser.ownerId = newUser.id;

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
          layerIds: newUser.layerIds,
          visibility: newUser.visibility,
          profilePicture: newUser.profilePicture,
          bio: newUser.bio,
        });
        setOnlineStatus(newUser.id, true);

        return true;
      },

      login: (credentials) => {
        const { registeredUsers } = get();
        const user = registeredUsers.find(
          (u) =>
            u.email === credentials.email &&
            u.password === credentials.password
        );

        if (user) {
          set({ user, isAuthenticated: true });

          const { addUser, setOnlineStatus } = useUserStore.getState();
          addUser({
            id: user.id,
            name: user.name,
            color: user.color,
            online: true,
            layerIds: user.layerIds,
            visibility: user.visibility,
            profilePicture: user.profilePicture,
            bio: user.bio,
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

          const updatedUser: AuthUser = {
            ...state.user,
            ...updates,
            ownerId: state.user.ownerId,
            layerIds: updates.layerIds
              ? resolveLayerIds(updates.layerIds)
              : state.user.layerIds,
            visibility: updates.visibility ?? state.user.visibility,
          };

          const updatedRegisteredUsers = state.registeredUsers.map((u) =>
            u.id === updatedUser.id ? updatedUser : u
          );

          const {
            updateUserColor,
            updateUserProfile,
            setUserLayers,
            setUserVisibility,
          } = useUserStore.getState();
          if (updates.color) {
            updateUserColor(updatedUser.id, updates.color);
          }
          if (updates.name || updates.profilePicture || updates.bio) {
            updateUserProfile(updatedUser.id, {
              name: updatedUser.name,
              profilePicture: updatedUser.profilePicture,
              bio: updatedUser.bio,
            });
          }
          if (updates.layerIds) {
            setUserLayers(updatedUser.id, updatedUser.layerIds);
          }
          if (updates.visibility) {
            setUserVisibility(updatedUser.id, updatedUser.visibility);
          }

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
