import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initializeP2PNode, broadcastMessage, type NodeRole, type P2PNodeContext } from '../core/p2p';
import { burnIdentity, rotateIdentity } from '../core/security/identity';

interface P2PStoreState {
  context?: P2PNodeContext;
  status: 'idle' | 'starting' | 'online' | 'error';
  relayMode: boolean;
  lastError?: string;
  initialize: (role?: NodeRole) => Promise<void>;
  toggleRelayMode: (nextState: boolean) => Promise<void>;
  publish: <TPayload>(topic: string, payload: TPayload) => Promise<void>;
  rotateIdentity: () => Promise<void>;
  burnIdentity: () => Promise<void>;
}

export const useP2PStore = create<P2PStoreState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      relayMode: false,
      async initialize(role = 'standard') {
        set({ status: 'starting', lastError: undefined });
        try {
          const context = await initializeP2PNode({ enableRelay: role === 'relay' }, role);
          set({ context, status: context.node ? 'online' : 'error', relayMode: role === 'relay' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('Failed to initialize P2P node', error);
          set({ status: 'error', lastError: message });
        }
      },
      async toggleRelayMode(nextState) {
        const current = get().context;
        if (current) {
          await current.stop();
        }
        await get().initialize(nextState ? 'relay' : 'standard');
      },
      async publish(topic, payload) {
        const context = get().context;
        if (!context) {
          throw new Error('Mesh node not initialized');
        }
        await broadcastMessage(context, topic, payload);
      },
      async rotateIdentity() {
        await rotateIdentity();
        if (get().context) {
          await get().context?.stop();
        }
        await get().initialize(get().relayMode ? 'relay' : 'standard');
      },
      async burnIdentity() {
        await get().context?.stop();
        await burnIdentity();
        set({ context: undefined, status: 'idle' });
      },
    }),
    {
      name: 'harmonia:p2p',
      partialize: ({ relayMode }) => ({ relayMode }),
    },
  ),
);

