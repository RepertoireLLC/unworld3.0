import { create } from 'zustand';

type Transport = 'bluetooth' | 'wifi';

interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  timestamp: number;
  transport: Transport;
  encrypted: boolean;
  encryptedPayload: string | null;
}

interface MessageMetadata {
  transport?: Transport;
  encrypted?: boolean;
  encryptedPayload?: string | null;
}

interface ChatState {
  activeChat: string | null;
  messages: Message[];
  setActiveChat: (userId: string | null) => void;
  sendMessage: (
    fromUserId: string,
    toUserId: string,
    content: string,
    metadata?: MessageMetadata
  ) => void;
  getMessagesForChat: (userId1: string, userId2: string) => Message[];
  updateTransportForChat: (
    userId1: string,
    userId2: string,
    transport: Transport
  ) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChat: null,
  messages: [],

  setActiveChat: (userId) => set({ activeChat: userId }),

  sendMessage: (fromUserId, toUserId, content, metadata) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      fromUserId,
      toUserId,
      content,
      timestamp: Date.now(),
      transport: metadata?.transport ?? 'wifi',
      encrypted: metadata?.encrypted ?? false,
      encryptedPayload: metadata?.encryptedPayload ?? null,
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  getMessagesForChat: (userId1, userId2) => {
    return get()
      .messages.filter(
        (msg) =>
          (msg.fromUserId === userId1 && msg.toUserId === userId2) ||
          (msg.fromUserId === userId2 && msg.toUserId === userId1)
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  updateTransportForChat: (userId1, userId2, transport) => {
    set((state) => ({
      messages: state.messages.map((message) => {
        const participantsMatch =
          (message.fromUserId === userId1 && message.toUserId === userId2) ||
          (message.fromUserId === userId2 && message.toUserId === userId1);

        if (!participantsMatch) {
          return message;
        }

        return {
          ...message,
          transport,
          encrypted: transport === 'bluetooth' ? message.encrypted : false,
          encryptedPayload: transport === 'bluetooth' ? message.encryptedPayload : null,
        };
      }),
    }));
  },
}));
