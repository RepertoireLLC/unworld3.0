import { create } from 'zustand';

const DEFAULT_USER_COLOR = '#38BDF8';

const sanitizeColor = (color: unknown, fallback?: string): string => {
  if (typeof color === 'string' && color.trim().length > 0) {
    return color;
  }

  if (fallback && fallback.trim().length > 0) {
    return fallback;
  }

  return DEFAULT_USER_COLOR;
};

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
      const existing = state.users.find((entry) => entry.id === user.id);
      const mergedOnline = user.online ?? existing?.online ?? false;
      const sanitizedUser: User = {
        ...(existing ?? {}),
        ...user,
        color: sanitizeColor(user.color, existing?.color),
        online: mergedOnline,
        position: user.position ?? existing?.position,
        lastSeen: mergedOnline ? undefined : user.lastSeen ?? existing?.lastSeen,
      };

      const users = state.users
        .filter((entry) => entry.id !== sanitizedUser.id)
        .concat(sanitizedUser);

      const onlineUsers = new Set(state.onlineUsers);
      if (sanitizedUser.online) {
        onlineUsers.add(sanitizedUser.id);
      } else {
        onlineUsers.delete(sanitizedUser.id);
      }

      return {
        users,
        onlineUsers,
      };
    }),

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
        user.id === userId
          ? { ...user, color: sanitizeColor(color, user.color) }
          : user
      ),
    })),

  getOnlineUsers: () => {
    const state = get();
    return state.users.filter((user) => state.onlineUsers.has(user.id));
  },
}));