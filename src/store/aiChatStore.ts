import { create } from 'zustand';
import { routeAIQueryForConnection } from '../core/aiRouter';
import { useAIStore } from './aiStore';
import { useToastStore } from './toastStore';
import { logAIIntegration } from '../utils/logger';

export type AIChatRole = 'user' | 'assistant' | 'system';

type MessageStatus = 'pending' | 'sent' | 'error';

export interface AIChatMessage {
  id: string;
  connectionId: string;
  role: AIChatRole;
  content: string;
  timestamp: string;
  status: MessageStatus;
  reasoning?: string;
  error?: string;
}

export interface OpenAIChat {
  connectionId: string;
  minimized: boolean;
}

interface AIChatState {
  openChats: OpenAIChat[];
  messages: Record<string, AIChatMessage[]>;
  openChat: (connectionId: string) => void;
  closeChat: (connectionId: string) => void;
  toggleMinimize: (connectionId: string) => void;
  sendMessage: (connectionId: string, content: string) => Promise<void>;
}

function generateId() {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function buildConversationPrompt(history: AIChatMessage[], latest: string) {
  const relevant = history.filter(
    (message) => message.status === 'sent' && message.content.trim().length > 0
  );

  if (relevant.length === 0) {
    return latest;
  }

  const formatted = relevant
    .map((message) => {
      const prefix = message.role === 'assistant' ? 'AI' : message.role === 'system' ? 'System' : 'User';
      const baseLine = `${prefix}: ${message.content}`;
      if (message.role === 'assistant' && message.reasoning) {
        return `${baseLine}\nAI reasoning: ${message.reasoning}`;
      }
      return baseLine;
    })
    .join('\n');

  return `${formatted}\nUser: ${latest}`;
}

export const useAIChatStore = create<AIChatState>((set, get) => ({
  openChats: [],
  messages: {},

  openChat: (connectionId) => {
    set((state) => {
      if (state.openChats.some((chat) => chat.connectionId === connectionId)) {
        return {
          openChats: state.openChats.map((chat) =>
            chat.connectionId === connectionId
              ? { ...chat, minimized: false }
              : chat
          ),
        };
      }

      return {
        openChats: [
          ...state.openChats,
          { connectionId, minimized: false },
        ],
      };
    });
  },

  closeChat: (connectionId) => {
    set((state) => ({
      openChats: state.openChats.filter((chat) => chat.connectionId !== connectionId),
    }));
  },

  toggleMinimize: (connectionId) => {
    set((state) => ({
      openChats: state.openChats.map((chat) =>
        chat.connectionId === connectionId
          ? { ...chat, minimized: !chat.minimized }
          : chat
      ),
    }));
  },

  sendMessage: async (connectionId, content) => {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    const connection = useAIStore.getState().connections.find((item) => item.id === connectionId);
    if (!connection) {
      useToastStore.getState().addToast({
        title: 'Connection unavailable',
        description: 'The AI link you selected is no longer available.',
        variant: 'error',
      });
      return;
    }

    if (!connection.isEnabled) {
      useToastStore.getState().addToast({
        title: `${connection.name} is disabled`,
        description: 'Enable the connection inside the integration panel to start chatting.',
        variant: 'warning',
      });
      return;
    }

    const now = new Date().toISOString();
    const userMessage: AIChatMessage = {
      id: generateId(),
      connectionId,
      role: 'user',
      content: trimmed,
      timestamp: now,
      status: 'sent',
    };

    const assistantPlaceholderId = generateId();
    const assistantPlaceholder: AIChatMessage = {
      id: assistantPlaceholderId,
      connectionId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    set((state) => {
      const history = state.messages[connectionId] ?? [];
      return {
        messages: {
          ...state.messages,
          [connectionId]: [...history, userMessage, assistantPlaceholder],
        },
      };
    });

    try {
      const history = get().messages[connectionId]?.filter((message) => message.id !== assistantPlaceholderId) ?? [];
      const prompt = buildConversationPrompt(history, trimmed);
      const response = await routeAIQueryForConnection(connectionId, prompt);

      set((state) => ({
        messages: {
          ...state.messages,
          [connectionId]: state.messages[connectionId]?.map((message) =>
            message.id === assistantPlaceholderId
              ? {
                  ...message,
                  content: response.text,
                  status: 'sent',
                  reasoning: response.reasoning,
                }
              : message
          ) ?? [],
        },
      }));

      await logAIIntegration(`AI chat message exchanged with ${connection.name}.`);
    } catch (error) {
      const message = (error as Error).message;
      const failureNotice = `Harmonia couldn't reach ${connection.name}. ${message}`;
      set((state) => ({
        messages: {
          ...state.messages,
          [connectionId]: state.messages[connectionId]?.map((item) =>
            item.id === assistantPlaceholderId
              ? {
                  ...item,
                  content: failureNotice,
                  status: 'error',
                  error: message,
                }
              : item
          ) ?? [],
        },
      }));

      useToastStore.getState().addToast({
        title: 'Chat delivery failed',
        description: failureNotice,
        variant: 'error',
      });
    }
  },
}));
