import { create } from 'zustand';
import { generateId } from '../utils/id';
import { ResonanceTone } from '../utils/resonance';

export interface ResonancePulse {
  id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  magnitude: number;
  coherence: number;
  tone: ResonanceTone;
  spectrum: [number, number, number];
  messagePreview: string;
  timestamp: number;
}

interface NodeSummary {
  outbound: number;
  inbound: number;
  averageCoherence: number;
  toneWeights: Partial<Record<ResonanceTone, number>>;
  lastPulse?: ResonancePulse;
}

interface ResonanceState {
  pulses: ResonancePulse[];
  fieldIntegrity: number;
  lastUpdated?: number;
  recordPulse: (pulse: Omit<ResonancePulse, 'id'> & { id?: string }) => ResonancePulse;
  getRecentPulses: (limit?: number) => ResonancePulse[];
  getNodeSummary: (nodeId: string) => NodeSummary;
  decayField: () => void;
}

const MAX_PULSES = 144;

function computeFieldIntegrity(pulses: ResonancePulse[]): number {
  if (pulses.length === 0) {
    return 0.72;
  }
  const recent = pulses.slice(-36);
  const coherenceAverage = recent.reduce((total, pulse) => total + pulse.coherence, 0) / recent.length;
  const toneDiversity = new Set(recent.map((pulse) => pulse.tone)).size / 4;
  return Math.min(1, Math.max(0.2, coherenceAverage * 0.7 + toneDiversity * 0.3));
}

export const useResonanceStore = create<ResonanceState>((set, get) => ({
  pulses: [],
  fieldIntegrity: 0.72,
  lastUpdated: undefined,

  recordPulse: (input) => {
    const id = input.id ?? generateId('pulse');
    const timestamp = input.timestamp ?? Date.now();
    const pulse: ResonancePulse = {
      ...input,
      id,
      timestamp,
    };

    set((state) => {
      const pulses = [...state.pulses, pulse].slice(-MAX_PULSES);
      return {
        pulses,
        fieldIntegrity: computeFieldIntegrity(pulses),
        lastUpdated: timestamp,
      };
    });

    return pulse;
  },

  getRecentPulses: (limit = 6) => {
    const pulses = get().pulses;
    return pulses.slice(-limit).reverse();
  },

  getNodeSummary: (nodeId) => {
    const pulses = get().pulses;
    if (pulses.length === 0) {
      return {
        outbound: 0,
        inbound: 0,
        averageCoherence: 0.72,
        toneWeights: {},
      };
    }

    const relevant = pulses.filter(
      (pulse) => pulse.fromUserId === nodeId || pulse.toUserId === nodeId
    );

    if (relevant.length === 0) {
      return {
        outbound: 0,
        inbound: 0,
        averageCoherence: 0.65,
        toneWeights: {},
      };
    }

    const outbound = relevant.filter((pulse) => pulse.fromUserId === nodeId).length;
    const inbound = relevant.length - outbound;
    const averageCoherence = relevant.reduce((sum, pulse) => sum + pulse.coherence, 0) / relevant.length;
    const toneWeights = relevant.reduce<NodeSummary['toneWeights']>((acc, pulse) => {
      acc[pulse.tone] = (acc[pulse.tone] ?? 0) + 1 / relevant.length;
      return acc;
    }, {});

    return {
      outbound,
      inbound,
      averageCoherence,
      toneWeights,
      lastPulse: relevant[relevant.length - 1],
    };
  },

  decayField: () => {
    set((state) => {
      if (!state.lastUpdated) {
        return {};
      }
      const elapsed = Date.now() - state.lastUpdated;
      if (elapsed < 30000) {
        return {};
      }
      const decay = Math.min(0.18, elapsed / 600000);
      const nextIntegrity = Math.max(0.2, state.fieldIntegrity - decay);
      if (nextIntegrity === state.fieldIntegrity) {
        return {};
      }
      return {
        fieldIntegrity: nextIntegrity,
      };
    });
  },
}));

