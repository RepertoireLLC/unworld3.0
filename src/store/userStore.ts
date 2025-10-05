import { create } from 'zustand';
import {
  apiFetchUsers,
  apiUpsertUser,
  RemoteUser,
} from '../lib/api';

export interface User {
  id: string;
  name: string;
  color?: string;
  email?: string;
  bio?: string | null;
  profilePicture?: string | null;
  presence: 'online' | 'offline';
  lastSeen?: number | null;
}

interface UserState {
  users: User[];
  initialized: boolean;
  isLoading: boolean;
  currentUserId: string | null;
  initialize: () => Promise<void>;
  setCurrentUser: (userId: string | null) => void;
  handlePresenceSnapshot: (users: RemoteUser[]) => void;
  handlePresenceUpdate: (user: RemoteUser) => void;
  upsertUser: (user: Partial<User> & { id: string }) => Promise<User>;
  setUserColor: (userId: string, color: string) => void;
  getUserById: (userId: string) => User | undefined;
  getOnlineUsers: () => User[];
}

function toUser(remote: RemoteUser): User {
  return {
    id: remote.id,
    name: remote.name,
    color: remote.color ?? undefined,
    email: remote.email ?? undefined,
    bio: remote.bio ?? null,
    profilePicture: remote.profilePicture ?? null,
    presence: remote.presence,
    lastSeen: remote.lastSeen ?? null,
  };
}

function sortUsers(users: User[]): User[] {
  return [...users].sort((a, b) => a.name.localeCompare(b.name));
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  initialized: false,
  isLoading: false,
  currentUserId: null,

  initialize: async () => {
    if (get().initialized || get().isLoading) return;
    set({ isLoading: true });
    try {
      const remoteUsers = await apiFetchUsers();
      set({
        users: sortUsers(remoteUsers.map(toUser)),
        initialized: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setCurrentUser: (userId) => set({ currentUserId: userId ?? null }),

  handlePresenceSnapshot: (remoteUsers) => {
    set({ users: sortUsers(remoteUsers.map(toUser)) });
  },

  handlePresenceUpdate: (remoteUser) => {
    set((state) => {
      const existing = state.users.find((user) => user.id === remoteUser.id);
      const updatedUser = toUser(remoteUser);
      if (!existing) {
        return { users: sortUsers([...state.users, updatedUser]) };
      }
      return {
        users: sortUsers(
          state.users.map((user) => (user.id === remoteUser.id ? { ...user, ...updatedUser } : user))
        ),
      };
    });
  },

  upsertUser: async (user) => {
    const remote = await apiUpsertUser({ id: user.id, ...user });
    const mapped = toUser(remote);
    set((state) => {
      const exists = state.users.some((item) => item.id === mapped.id);
      const users = exists
        ? state.users.map((item) => (item.id === mapped.id ? { ...item, ...mapped } : item))
        : [...state.users, mapped];
      return { users: sortUsers(users) };
    });
    return mapped;
  },

  setUserColor: (userId, color) => {
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId
          ? { ...user, color }
          : user
      ),
    }));
  },

  getUserById: (userId) => get().users.find((user) => user.id === userId),

  getOnlineUsers: () => get().users.filter((user) => user.presence === 'online'),
}));
