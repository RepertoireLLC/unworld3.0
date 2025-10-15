import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  color: string;
  online: boolean;
  lastSeen?: number;
  position?: [number, number, number];
}

interface UserState {
  users: User[];
  onlineUsers: Set<string>;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  setOnlineStatus: (userId: string, online: boolean) => void;
  updateUserPosition: (userId: string, position: [number, number, number]) => void;
  updateUserColor: (userId: string, color: string) => void;
  getOnlineUsers: () => User[];
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  onlineUsers: new Set<string>(),

  addUser: (user) =>
    set((state) => {
      const users = state.users.filter((existing) => existing.id !== user.id);
      const onlineUsers = new Set(state.onlineUsers);

      if (user.online) {
        onlineUsers.add(user.id);
      } else {
        onlineUsers.delete(user.id);
      }

      return {
        users: users.concat({
          ...user,
          lastSeen: user.online ? undefined : user.lastSeen ?? Date.now(),
        }),
        onlineUsers,
      };
    }),

  removeUser: (userId) =>
    set((state) => {
      const onlineUsers = new Set(state.onlineUsers);
      onlineUsers.delete(userId);

      return {
        users: state.users.filter((user) => user.id !== userId),
        onlineUsers,
      };
    }),

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

  getOnlineUsers: () => {
    const state = get();
    return state.users.filter((user) => state.onlineUsers.has(user.id));
  },
}));