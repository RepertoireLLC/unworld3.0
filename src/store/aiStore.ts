import { create } from 'zustand';
import { persistAIConnections, retrieveAIConnections } from '../utils/encryption';
import { logAIIntegration } from '../utils/logger';
import { testAIConnection } from '../core/aiRouter';

export type AIModelType =
  | 'ChatGPT'
  | 'Gemini'
  | 'Grok'
  | 'DeepBlue'
  | 'Custom API'
  | 'Local Model';

type ConnectionStatus = 'idle' | 'online' | 'error' | 'testing';

export interface AIConnection {
  id: string;
  name: string;
  modelType: AIModelType;
  endpoint: string;
  apiKey?: string;
  notes?: string;
  isEnabled: boolean;
  status: ConnectionStatus;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

interface TestResult {
  success: boolean;
  message: string;
}

interface AIStoreState {
  connections: AIConnection[];
  activeConnectionId: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  addConnection: (connection: Omit<AIConnection, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }) => Promise<AIConnection>;
  updateConnection: (id: string, updates: Partial<Omit<AIConnection, 'id' | 'createdAt'>>) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
  toggleConnection: (id: string) => Promise<void>;
  setActiveConnection: (id: string) => void;
  markStatus: (id: string, status: ConnectionStatus, errorMessage?: string) => void;
  testConnection: (id: string, options?: { silent?: boolean }) => Promise<TestResult>;
  clearStore: () => Promise<void>;
}

export const useAIStore = create<AIStoreState>((set, get) => ({
  connections: [],
  activeConnectionId: null,
  isHydrated: false,
  hydrate: async () => {
    if (get().isHydrated) {
      return;
    }

    if (typeof window === 'undefined') {
      set({ isHydrated: true });
      return;
    }

    try {
      const { connections, activeConnectionId } = await retrieveAIConnections();
      set({
        connections,
        activeConnectionId: connections.length > 0 ? activeConnectionId ?? connections[0].id : null,
        isHydrated: true,
      });
    } catch (error) {
      await logAIIntegration(`Hydration error: ${(error as Error).message}`);
      set({ connections: [], activeConnectionId: null, isHydrated: true });
    }
  },
  addConnection: async (connection) => {
    const id = connection.id ?? crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const nextConnection: AIConnection = {
      ...connection,
      id,
      status: 'idle',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    set((state) => ({
      connections: [...state.connections, nextConnection],
      activeConnectionId: state.activeConnectionId ?? id,
    }));

    await persistAIConnections(get().connections, get().activeConnectionId);
    await logAIIntegration(`Connection added: ${nextConnection.name} (${nextConnection.modelType})`);
    return nextConnection;
  },
  updateConnection: async (id, updates) => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      connections: state.connections.map((connection) =>
        connection.id === id
          ? {
              ...connection,
              ...updates,
              updatedAt: timestamp,
            }
          : connection
      ),
    }));

    await persistAIConnections(get().connections, get().activeConnectionId);
    await logAIIntegration(`Connection updated: ${id}`);
  },
  removeConnection: async (id) => {
    set((state) => ({
      connections: state.connections.filter((connection) => connection.id !== id),
      activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId,
    }));

    const { connections } = get();
    const nextActive = connections[0]?.id ?? null;
    set({ activeConnectionId: nextActive });

    await persistAIConnections(get().connections, get().activeConnectionId);
    await logAIIntegration(`Connection removed: ${id}`);
  },
  toggleConnection: async (id) => {
    const connection = get().connections.find((item) => item.id === id);
    if (!connection) {
      return;
    }

    const isEnabled = !connection.isEnabled;
    set((state) => ({
      connections: state.connections.map((item) =>
        item.id === id
          ? {
              ...item,
              isEnabled,
              updatedAt: new Date().toISOString(),
              status: isEnabled ? item.status : 'idle',
            }
          : item
      ),
    }));

    await persistAIConnections(get().connections, get().activeConnectionId);
    await logAIIntegration(`Connection ${isEnabled ? 'enabled' : 'disabled'}: ${connection.name}`);
  },
  setActiveConnection: (id) => {
    set((state) => ({
      activeConnectionId: id,
      connections: state.connections.map((connection) =>
        connection.id === id
          ? { ...connection, isEnabled: true }
          : connection
      ),
    }));
    void persistAIConnections(get().connections, id);
    void logAIIntegration(`Active AI route set to ${id}`);
  },
  markStatus: (id, status, errorMessage) => {
    set((state) => ({
      connections: state.connections.map((connection) =>
        connection.id === id
          ? {
              ...connection,
              status,
              lastTestedAt: status === 'testing' ? connection.lastTestedAt : new Date().toISOString(),
              lastError: errorMessage,
            }
          : connection
      ),
    }));
  },
  testConnection: async (id, options) => {
    const connection = get().connections.find((item) => item.id === id);
    if (!connection) {
      return { success: false, message: 'Connection not found' };
    }

    get().markStatus(id, 'testing');

    try {
      const result = await testAIConnection(connection);
      get().markStatus(id, result.success ? 'online' : 'error', result.success ? undefined : result.message);
      await persistAIConnections(get().connections, get().activeConnectionId);
      if (!options?.silent) {
        await logAIIntegration(`Test result for ${connection.name}: ${result.message}`);
      }
      return result;
    } catch (error) {
      const message = (error as Error).message;
      get().markStatus(id, 'error', message);
      await persistAIConnections(get().connections, get().activeConnectionId);
      if (!options?.silent) {
        await logAIIntegration(`Test failed for ${connection.name}: ${message}`);
      }
      return { success: false, message };
    }
  },
  clearStore: async () => {
    set({ connections: [], activeConnectionId: null });
    await persistAIConnections([], null);
    await logAIIntegration('AI store cleared.');
  },
}));
