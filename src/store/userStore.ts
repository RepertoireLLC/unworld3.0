import { create } from 'zustand';
import {
  AccessControlledEntity,
  Visibility,
  filterReadableEntities,
  resolveLayerIds,
} from '../lib/permissions';
import { useLayerStore } from './layerStore';

export interface PresenceUser extends AccessControlledEntity {
  id: string;
  name: string;
  color: string;
  online: boolean;
  lastSeen?: number;
  position?: [number, number, number];
  profilePicture?: string;
  bio?: string;
  ownerId: string;
}

type NewUserPayload = Omit<
  PresenceUser,
  'online' | 'ownerId' | 'layerIds' | 'visibility'
> &
  Partial<Pick<PresenceUser, 'online' | 'layerIds' | 'visibility'>>;

interface UserState {
  users: PresenceUser[];
  onlineUsers: Set<string>;
  addUser: (user: NewUserPayload) => PresenceUser;
  removeUser: (userId: string) => void;
  setOnlineStatus: (userId: string, online: boolean) => void;
  updateUserPosition: (userId: string, position: [number, number, number]) => void;
  updateUserColor: (userId: string, color: string) => void;
  updateUserProfile: (
    userId: string,
    updates: Partial<Pick<PresenceUser, 'name' | 'profilePicture' | 'bio'>>
  ) => void;
  setUserLayers: (userId: string, layerIds: string[]) => void;
  setUserVisibility: (userId: string, visibility: Visibility) => void;
  getVisibleUsers: (viewerId?: string | null) => PresenceUser[];
  getOnlineUsers: (viewerId?: string | null) => PresenceUser[];
  getUserById: (userId: string) => PresenceUser | undefined;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  onlineUsers: new Set<string>(),

  addUser: (userInput) => {
    const existing = get().users.find((user) => user.id === userInput.id);
    const { assignUserToLayer, removeUserFromLayer } = useLayerStore.getState();

    if (existing) {
      existing.layerIds.forEach((layerId) => removeUserFromLayer(existing.id, layerId));
    }

    const layerIds = resolveLayerIds(userInput.layerIds);
    const presenceUser: PresenceUser = {
      id: userInput.id,
      name: userInput.name,
      color: userInput.color,
      position: userInput.position,
      lastSeen: userInput.lastSeen,
      profilePicture: userInput.profilePicture,
      bio: userInput.bio,
      online: userInput.online ?? false,
      layerIds,
      visibility: userInput.visibility ?? Visibility.MEMBERS,
      ownerId: userInput.id,
    };

    set((state) => {
      const filtered = state.users.filter((user) => user.id !== presenceUser.id);
      const newOnlineUsers = new Set(state.onlineUsers);
      if (presenceUser.online) {
        newOnlineUsers.add(presenceUser.id);
      } else {
        newOnlineUsers.delete(presenceUser.id);
      }

      return {
        users: [...filtered, presenceUser],
        onlineUsers: newOnlineUsers,
      };
    });

    layerIds.forEach((layerId) => assignUserToLayer(presenceUser.id, layerId));

    return presenceUser;
  },

  removeUser: (userId) => {
    const existing = get().users.find((user) => user.id === userId);
    if (existing) {
      const { removeUserFromLayer } = useLayerStore.getState();
      existing.layerIds.forEach((layerId) => removeUserFromLayer(userId, layerId));
    }

    set((state) => ({
      users: state.users.filter((user) => user.id !== userId),
      onlineUsers: new Set([...state.onlineUsers].filter((id) => id !== userId)),
    }));
  },

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

  updateUserProfile: (userId, updates) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, ...updates } : user
      ),
    })),

  setUserLayers: (userId, layerIds) => {
    const currentUser = get().users.find((user) => user.id === userId);
    if (!currentUser) {
      return;
    }

    const normalized = resolveLayerIds(layerIds);
    const { assignUserToLayer, removeUserFromLayer } = useLayerStore.getState();

    currentUser.layerIds
      .filter((layerId) => !normalized.includes(layerId))
      .forEach((layerId) => removeUserFromLayer(userId, layerId));

    normalized
      .filter((layerId) => !currentUser.layerIds.includes(layerId))
      .forEach((layerId) => assignUserToLayer(userId, layerId));

    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, layerIds: normalized } : user
      ),
    }));
  },

  setUserVisibility: (userId, visibility) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, visibility } : user
      ),
    })),

  getVisibleUsers: (viewerId = null) => {
    const state = get();
    return filterReadableEntities(viewerId, state.users);
  },

  getOnlineUsers: (viewerId = null) => {
    const state = get();
    const visibleUserIds = new Set(
      state.getVisibleUsers(viewerId).map((user) => user.id)
    );

    return state.users.filter(
      (user) => visibleUserIds.has(user.id) && state.onlineUsers.has(user.id)
    );
  },

  getUserById: (userId) => get().users.find((user) => user.id === userId),
}));
