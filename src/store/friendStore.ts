import { create } from 'zustand';
import {
  AccessControlledEntity,
  Visibility,
  canReadEntity,
  resolveLayerIds,
} from '../lib/permissions';

interface FriendRequest extends AccessControlledEntity {
  id: string;
  fromUserId: string;
  toUserId: string;
  ownerId: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface SendFriendRequestInput {
  fromUserId: string;
  toUserId: string;
  layerIds?: string[];
  visibility?: Visibility;
}

interface FriendState {
  friendRequests: FriendRequest[];
  sendFriendRequest: (input: SendFriendRequestInput) => void;
  acceptFriendRequest: (requestId: string, actorId: string) => void;
  rejectFriendRequest: (requestId: string, actorId: string) => void;
  isFriend: (userId1: string, userId2: string, viewerId?: string | null) => boolean;
  hasPendingRequest: (
    fromUserId: string,
    toUserId: string,
    viewerId?: string | null
  ) => boolean;
  getVisibleRequests: (viewerId?: string | null) => FriendRequest[];
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friendRequests: [],

  sendFriendRequest: ({ fromUserId, toUserId, layerIds, visibility }) => {
    const id = Date.now().toString();
    const request: FriendRequest = {
      id,
      fromUserId,
      toUserId,
      ownerId: fromUserId,
      status: 'pending',
      layerIds: resolveLayerIds(layerIds),
      visibility: visibility ?? Visibility.MEMBERS,
    };

    set((state) => ({
      friendRequests: [...state.friendRequests, request],
    }));
  },

  acceptFriendRequest: (requestId, actorId) => {
    set((state) => ({
      friendRequests: state.friendRequests.map((request) =>
        request.id === requestId && canReadEntity(actorId, request)
          ? { ...request, status: 'accepted' }
          : request
      ),
    }));
  },

  rejectFriendRequest: (requestId, actorId) => {
    set((state) => ({
      friendRequests: state.friendRequests.map((request) =>
        request.id === requestId && canReadEntity(actorId, request)
          ? { ...request, status: 'rejected' }
          : request
      ),
    }));
  },

  isFriend: (userId1, userId2, viewerId = null) =>
    get().friendRequests.some(
      (request) =>
        request.status === 'accepted' &&
        canReadEntity(viewerId, request) &&
        ((request.fromUserId === userId1 && request.toUserId === userId2) ||
          (request.fromUserId === userId2 && request.toUserId === userId1))
    ),

  hasPendingRequest: (fromUserId, toUserId, viewerId = null) =>
    get().friendRequests.some(
      (request) =>
        request.status === 'pending' &&
        canReadEntity(viewerId, request) &&
        request.fromUserId === fromUserId &&
        request.toUserId === toUserId
    ),

  getVisibleRequests: (viewerId = null) =>
    get().friendRequests.filter((request) => canReadEntity(viewerId, request)),
}));
