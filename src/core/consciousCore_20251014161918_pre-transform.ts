import { useAIStore } from '../store/aiStore';
import { useMemoryStore } from '../store/memoryStore';
import { logAIIntegration } from '../utils/logger';

export type ConsciousEventType =
  | 'ai:response'
  | 'memory:updated'
  | 'sync:heal'
  | 'profile:opened';

export interface ConsciousEvent<TPayload = unknown> {
  type: ConsciousEventType;
  payload?: TPayload;
  timestamp?: string;
  nodeId?: string;
}

export interface ConsciousModule {
  id: string;
  name: string;
  description: string;
  initialize?: () => Promise<void> | void;
  onEvent?: (event: ConsciousEvent) => Promise<void> | void;
}

interface ConsciousCoreState {
  modules: Map<string, ConsciousModule>;
  initialized: boolean;
}

const state: ConsciousCoreState = {
  modules: new Map(),
  initialized: false,
};

export function registerConsciousModule(module: ConsciousModule) {
  if (state.modules.has(module.id)) {
    return;
  }
  state.modules.set(module.id, module);
}

async function initializeModules() {
  for (const module of state.modules.values()) {
    if (module.initialize) {
      await module.initialize();
    }
  }
}

export async function initializeConsciousCore() {
  if (state.initialized) {
    return;
  }

  registerConsciousModule({
    id: 'harmonia-ai-heart',
    name: 'Harmonia Conscious Heart',
    description: 'Aligns AI responses with Harmonia ethics and resonance metadata.',
    async initialize() {
      const aiState = useAIStore.getState();
      if (!aiState.isHydrated) {
        await aiState.hydrate();
      }
    },
    async onEvent(event) {
      if (event.type !== 'ai:response') {
        return;
      }
      await logAIIntegration('Conscious Core harmonized AI response.');
    },
  });

  registerConsciousModule({
    id: 'harmonia-memory-weaver',
    name: 'Memory Weaver',
    description: 'Preserves node conversations with encrypted resonance cues.',
    async initialize() {
      const memory = useMemoryStore.getState();
      if (!memory.isHydrated) {
        await memory.hydrate();
      }
    },
    async onEvent(event) {
      if (event.type !== 'memory:updated') {
        return;
      }
      if (event.nodeId) {
        await useMemoryStore.getState().selfHeal(event.nodeId);
      }
    },
  });

  await initializeModules();
  state.initialized = true;
}

export async function dispatchConsciousEvent(event: ConsciousEvent) {
  if (!state.initialized) {
    await initializeConsciousCore();
  }

  const enrichedEvent: ConsciousEvent = {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString(),
  };

  for (const module of state.modules.values()) {
    if (module.onEvent) {
      await module.onEvent(enrichedEvent);
    }
  }
}

export function listConsciousModules(): ConsciousModule[] {
  return Array.from(state.modules.values());
}
