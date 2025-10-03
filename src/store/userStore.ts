import { create } from 'zustand';
import type { WifiNetwork } from '../types/network';

interface User {
  id: string;
  name: string;
  color: string;
  online: boolean;
  lastSeen?: number;
  position?: [number, number, number];
  statusMessage?: string;
  availability?: 'available' | 'focus' | 'away';
  languages?: string[];
  wifiNetworks?: WifiNetwork[];
}

interface UserState {
  users: User[];
  onlineUsers: Set<string>;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  setOnlineStatus: (userId: string, online: boolean) => void;
  updateUserPosition: (userId: string, position: [number, number, number]) => void;
  updateUserColor: (userId: string, color: string) => void;
  updateUserPresence: (
    userId: string,
    presence: { statusMessage?: string; availability?: 'available' | 'focus' | 'away' }
  ) => void;
  getOnlineUsers: () => User[];
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  onlineUsers: new Set<string>(),

  addUser: (user) =>
    set((state) => ({
      users: state.users
        .filter((u) => u.id !== user.id)
        .concat({ ...user, online: user.online ?? false }),
    })),

  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((user) => user.id !== userId),
      onlineUsers: new Set([...state.onlineUsers].filter(id => id !== userId)),
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

  updateUserPresence: (userId, presence) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId
          ? {
              ...user,
              statusMessage:
                presence.statusMessage !== undefined
                  ? presence.statusMessage
                  : user.statusMessage,
              availability:
                presence.availability !== undefined
                  ? presence.availability
                  : user.availability,
            }
          : user
      ),
    })),

  getOnlineUsers: () => {
    const state = get();
    return state.users.filter((user) => state.onlineUsers.has(user.id));
  },
}));