import { create } from 'zustand';

export interface EncryptedAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'file';
  size: number;
  mimeType: string;
  encryptedData: string;
  iv: string;
}

export interface EncryptedMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  encryptedContent: string;
  iv: string;
  attachments: EncryptedAttachment[];
  algorithm: 'AES-GCM';
  timestamp: number;
}

interface ChatState {
  activeChat: string | null;
  messages: EncryptedMessage[];
  setActiveChat: (userId: string | null) => void;
  sendMessage: (message: Omit<EncryptedMessage, 'id' | 'timestamp'> & { id?: string }) => void;
  getMessagesForChat: (userId1: string, userId2: string) => EncryptedMessage[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChat: null,
  messages: [],

  setActiveChat: (userId) => set({ activeChat: userId }),

  sendMessage: ({
    id,
    fromUserId,
    toUserId,
    encryptedContent,
    iv,
    attachments,
    algorithm,
  }) => {
    const newMessage: EncryptedMessage = {
      id: id ?? Date.now().toString(),
      fromUserId,
      toUserId,
      encryptedContent,
      iv,
      attachments,
      algorithm: algorithm ?? 'AES-GCM',
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },
  
  getMessagesForChat: (userId1, userId2) => {
    return get().messages.filter(
      (msg) =>
        (msg.fromUserId === userId1 && msg.toUserId === userId2) ||
        (msg.fromUserId === userId2 && msg.toUserId === userId1)
    ).sort((a, b) => a.timestamp - b.timestamp);
  },
}));
