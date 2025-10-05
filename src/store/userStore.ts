import { create } from 'zustand';
import { EnclypseUser, VisibilityPreferences } from '../types/user';
import { LayerVisibilityMap } from '../types/visibility';

export interface UserNode extends Omit<EnclypseUser, 'password'> {
  online: boolean;
  lastSeen?: number;
  position?: [number, number, number];
}

interface UserState {
  users: UserNode[];
  onlineUsers: Set<string>;
  addUser: (user: UserNode) => void;
  removeUser: (userId: string) => void;
  setOnlineStatus: (userId: string, online: boolean) => void;
  updateUserPosition: (userId: string, position: [number, number, number]) => void;
  updateUserColor: (userId: string, color: string) => void;
  updateUserVisibilityLayers: (userId: string, layers: LayerVisibilityMap) => void;
  updateVisibilityPreferences: (userId: string, preferences: VisibilityPreferences) => void;
  getOnlineUsers: () => UserNode[];
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  onlineUsers: new Set<string>(),

  addUser: (user) =>
    set((state) => ({
      users: state.users.filter((u) => u.id !== user.id).concat(user),
    })),

  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((user) => user.id !== userId),
      onlineUsers: new Set([...state.onlineUsers].filter((id) => id !== userId)),
    })),

  setOnlineStatus: (userId, online) =>
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      if (online) {
        newOnlineUsers.add(userId);
      } else {
        newOnlineUsers.delete(userId);
      }

      return {
        users: state.users.map((user) =>
          user.id === userId
            ? { ...user, online, lastSeen: online ? undefined : Date.now() }
            : user
        ),
        onlineUsers: newOnlineUsers,
      };
    }),

  updateUserPosition: (userId, position) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, position } : user
      ),
    })),

  updateUserColor: (userId, color) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, color } : user
      ),
    })),

  updateUserVisibilityLayers: (userId, layers) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, visibilityLayers: layers } : user
      ),
    })),

  updateVisibilityPreferences: (userId, preferences) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId
          ? {
              ...user,
              visibilityPreferences: {
                ...user.visibilityPreferences,
                ...preferences,
              },
            }
          : user
      ),
    })),

  getOnlineUsers: () => {
    const state = get();
    return state.users.filter((user) => state.onlineUsers.has(user.id));
  },
}));
