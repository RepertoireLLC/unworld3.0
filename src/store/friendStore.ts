import { create } from 'zustand';
import { api } from '../services/api';
import type { FriendRequest } from '../types';
import { useAuthStore } from './authStore';

interface FriendState {
  friendRequests: FriendRequest[];
  loading: boolean;
  error: string | null;
  fetchFriendRequests: () => Promise<void>;
  sendFriendRequest: (toUserId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  isFriend: (userId1: string, userId2: string) => boolean;
  hasPendingRequest: (fromUserId: string, toUserId: string) => boolean;
  reset: () => void;
}

const initialState = {
  friendRequests: [] as FriendRequest[],
  loading: false,
  error: null as string | null,
};

export const useFriendStore = create<FriendState>((set, get) => ({
  ...initialState,

  fetchFriendRequests: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ loading: true, error: null });
    try {
      const friendRequests = await api.getFriendRequests(token);
      set({ friendRequests, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load requests';
      set({ error: message, loading: false });
    }
  },

  sendFriendRequest: async (toUserId) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const request = await api.sendFriendRequest(token, toUserId);
      set((state) => ({ friendRequests: [...state.friendRequests.filter((r) => r.id !== request.id), request] }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send request';
      set({ error: message });
    }
  },

  acceptFriendRequest: async (requestId) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const updated = await api.respondToFriendRequest(token, requestId, 'accept');
      set((state) => ({
        friendRequests: state.friendRequests.map((request) =>
          request.id === updated.id ? updated : request,
        ),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to accept request';
      set({ error: message });
    }
  },

  rejectFriendRequest: async (requestId) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const updated = await api.respondToFriendRequest(token, requestId, 'reject');
      set((state) => ({
        friendRequests: state.friendRequests.map((request) =>
          request.id === updated.id ? updated : request,
        ),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reject request';
      set({ error: message });
    }
  },

  isFriend: (userId1, userId2) => {
    return get().friendRequests.some(
      (request) =>
        request.status === 'accepted' &&
        ((request.fromUserId === userId1 && request.toUserId === userId2) ||
          (request.fromUserId === userId2 && request.toUserId === userId1)),
    );
  },

  hasPendingRequest: (fromUserId, toUserId) => {
    return get().friendRequests.some(
      (request) =>
        request.status === 'pending' &&
        request.fromUserId === fromUserId &&
        request.toUserId === toUserId,
    );
  },

  reset: () => set(initialState),
}));
