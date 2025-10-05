import { create } from 'zustand';
import {
  AccessControlledEntity,
  Visibility,
  canReadEntity,
  resolveLayerIds,
} from '../lib/permissions';

export interface Message extends AccessControlledEntity {
  id: string;
  fromUserId: string;
  toUserId: string;
  ownerId: string;
  content: string;
  timestamp: number;
}

interface SendMessageInput {
  fromUserId: string;
  toUserId: string;
  content: string;
  layerIds?: string[];
  visibility?: Visibility;
}

interface ChatState {
  activeChat: string | null;
  messages: Message[];
  setActiveChat: (userId: string | null) => void;
  sendMessage: (input: SendMessageInput) => void;
  getMessagesForChat: (
    userId1: string,
    userId2: string,
    viewerId?: string | null
  ) => Message[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChat: null,
  messages: [],

  setActiveChat: (userId) => set({ activeChat: userId }),

  sendMessage: ({ fromUserId, toUserId, content, layerIds, visibility }) => {
    const timestamp = Date.now();
    const message: Message = {
      id: timestamp.toString(),
      fromUserId,
      toUserId,
      ownerId: fromUserId,
      content,
      timestamp,
      layerIds: resolveLayerIds(layerIds),
      visibility: visibility ?? Visibility.MEMBERS,
    };

    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  getMessagesForChat: (userId1, userId2, viewerId = null) =>
    get()
      .messages.filter(
        (msg) =>
          ((msg.fromUserId === userId1 && msg.toUserId === userId2) ||
            (msg.fromUserId === userId2 && msg.toUserId === userId1)) &&
          canReadEntity(viewerId, msg)
      )
      .sort((a, b) => a.timestamp - b.timestamp),
}));
