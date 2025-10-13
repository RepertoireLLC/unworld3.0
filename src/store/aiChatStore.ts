import { create } from 'zustand';
import { routeAIQueryForConnection } from '../core/aiRouter';
import { useAIStore } from './aiStore';
import { useToastStore } from './toastStore';
import { logAIIntegration } from '../utils/logger';
import {
  persistAIChatHistory,
  retrieveAIChatHistory,
  clearAIChatHistory,
} from '../utils/encryption';
import { useAuthStore } from './authStore';

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
  isHydrated: boolean;
  hydratedUserId: string | null;
  hydrate: (userId?: string | null) => Promise<void>;
  clearChats: () => Promise<void>;
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

export const useAIChatStore = create<AIChatState>((set, get) => {
  const persistForCurrentUser = async () => {
    const userId = useAuthStore.getState().user?.id ?? null;
    await persistAIChatHistory(get().messages, userId);
  };

  const resolveUserId = (provided?: string | null) =>
    provided ?? useAuthStore.getState().user?.id ?? null;

  return {
    openChats: [],
    messages: {},
    isHydrated: false,
    hydratedUserId: null,

    hydrate: async (userId) => {
      const effectiveUserId = resolveUserId(userId);
      const alreadyHydrated = get().isHydrated && get().hydratedUserId === effectiveUserId;
      if (alreadyHydrated) {
        return;
      }

      if (!effectiveUserId) {
        set({
          openChats: [],
          messages: {},
          isHydrated: true,
          hydratedUserId: null,
        });
        return;
      }

      try {
        const stored = await retrieveAIChatHistory(effectiveUserId);
        set({
          openChats: [],
          messages: stored,
          isHydrated: true,
          hydratedUserId: effectiveUserId,
        });
      } catch (error) {
        console.error('Failed to hydrate AI chat history', error);
        set({
          openChats: [],
          messages: {},
          isHydrated: true,
          hydratedUserId: effectiveUserId,
        });
        clearAIChatHistory(effectiveUserId);
      }
    },

    clearChats: async () => {
      set({ openChats: [], messages: {} });
      await persistForCurrentUser();
    },

    openChat: (connectionId) => {
      let createdRecord = false;
      set((state) => {
        const isAlreadyOpen = state.openChats.some(
          (chat) => chat.connectionId === connectionId
        );

        const nextOpenChats = isAlreadyOpen
          ? state.openChats.map((chat) =>
              chat.connectionId === connectionId
                ? { ...chat, minimized: false }
                : chat
            )
          : [...state.openChats, { connectionId, minimized: false }];

        if (!state.messages[connectionId]) {
          createdRecord = true;
        }

        return {
          openChats: nextOpenChats,
          messages: state.messages[connectionId]
            ? state.messages
            : { ...state.messages, [connectionId]: [] },
        };
      });

      if (createdRecord) {
        void persistForCurrentUser();
      }
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

      const history =
        get().messages[connectionId]?.filter((message) => message.id !== assistantPlaceholderId) ?? [];

      await persistForCurrentUser();

      try {
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

        await persistForCurrentUser();
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

        await persistForCurrentUser();

        useToastStore.getState().addToast({
          title: 'Chat delivery failed',
          description: failureNotice,
          variant: 'error',
        });
      }
    },
  };
});
