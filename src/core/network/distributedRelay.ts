import { create } from 'zustand';
import { logAIIntegration } from '../../utils/logger';

export interface RelayEndpoint {
  id: string;
  url: string;
  lastSeen: string;
  latencyMs: number;
  healthy: boolean;
}

interface RelayState {
  endpoints: RelayEndpoint[];
  registerEndpoint: (endpoint: Omit<RelayEndpoint, 'lastSeen' | 'latencyMs' | 'healthy'>) => Promise<void>;
  markHeartbeat: (id: string, latencyMs: number) => void;
}

export const useRelayStore = create<RelayState>((set, get) => ({
  endpoints: [],
  registerEndpoint: async (endpoint) => {
    const newEndpoint: RelayEndpoint = {
      ...endpoint,
      lastSeen: new Date().toISOString(),
      latencyMs: 0,
      healthy: true,
    };
    set((state) => ({ endpoints: [...state.endpoints, newEndpoint] }));
    await logAIIntegration(`Relay endpoint registered: ${endpoint.url}`);
  },
  markHeartbeat: (id, latencyMs) => {
    set((state) => ({
      endpoints: state.endpoints.map((endpoint) =>
        endpoint.id === id
          ? {
              ...endpoint,
              lastSeen: new Date().toISOString(),
              latencyMs,
              healthy: latencyMs < 1500,
            }
          : endpoint
      ),
    }));
  },
}));

export async function broadcastResonanceSignal(message: string) {
  const state = useRelayStore.getState();
  for (const endpoint of state.endpoints.filter((item) => item.healthy)) {
    await logAIIntegration(`Signal dispatched to ${endpoint.url}: ${message}`);
  }
}
