import { create } from 'zustand';
import { Color } from 'three';
import type { InterestVector } from '../utils/vector';
import { clamp, normalizeVector } from '../utils/vector';
import { generateId } from '../utils/id';
import {
  RESONANCE_CATEGORIES,
  RESONANCE_DEFAULT_CATEGORY,
  RESONANCE_DEFAULT_COLOR,
  type ResonanceCategoryConfig,
  type ResonanceCategoryId,
  blendCategoryColors,
  resolveCategoriesForTopic,
} from '../config/nodeResonance';
import { useUserStore } from './userStore';

export type NodeColorMode = 'dynamic' | 'locked';

export interface NodeColorPreferences {
  mode: NodeColorMode;
  lockedColor?: string;
}

export interface NodePulseState {
  id: string;
  category: ResonanceCategoryId;
  startedAt: number;
  duration: number;
}

interface CategoryWeights extends Partial<Record<ResonanceCategoryId, number>> {}

interface NodeResonanceEntry {
  recent: CategoryWeights;
  baseline: CategoryWeights;
  recentTimestamp: number;
  baselineTimestamp: number;
  currentColor: string;
  mode: NodeColorMode;
  lockedColor?: string;
  dominantCategory: ResonanceCategoryId | null;
  pulses: NodePulseState[];
}

interface RegisterOptions {
  intensity?: number;
  timestamp?: number;
}

export interface NodeResonanceResult {
  color: string;
  dominantCategory: ResonanceCategoryId | null;
  weights: CategoryWeights;
}

interface NodeResonanceState {
  nodes: Record<string, NodeResonanceEntry>;
  hydrateUserColor: (userId: string, color: string) => void;
  syncManualPreferences: (userId: string, preferences: NodeColorPreferences | undefined) => void;
  registerInterestEngagement: (
    userId: string,
    vector: InterestVector,
    options?: RegisterOptions
  ) => NodeResonanceResult;
  registerCategoryEngagement: (
    userId: string,
    category: ResonanceCategoryId,
    options?: RegisterOptions
  ) => NodeResonanceResult;
  registerCategoryWeights: (
    userId: string,
    weights: CategoryWeights,
    options?: RegisterOptions
  ) => NodeResonanceResult;
  registerContentPulse: (
    userId: string,
    category: ResonanceCategoryId,
    options?: { timestamp?: number; durationMs?: number }
  ) => void;
  clearPulse: (userId: string, pulseId: string) => void;
  removeUser: (userId: string) => void;
}

const RECENT_HALF_LIFE_MS = 1000 * 60 * 6; // 6 minutes memory for recent color shifts
const BASELINE_HALF_LIFE_MS = 1000 * 60 * 60 * 6; // 6 hours for long-term hue memory
const DEFAULT_PULSE_DURATION_MS = 2100;

function normalizeWeights(weights: CategoryWeights): CategoryWeights {
  const sum = Object.values(weights).reduce((total, value) => total + (value ?? 0), 0);
  if (!sum || sum <= 0) {
    return {};
  }
  const normalized: CategoryWeights = {};
  (Object.keys(weights) as ResonanceCategoryId[]).forEach((key) => {
    const value = weights[key] ?? 0;
    if (value > 0) {
      normalized[key] = value / sum;
    }
  });
  return normalized;
}

function decayWeights(
  weights: CategoryWeights,
  lastUpdated: number,
  timestamp: number,
  halfLife: number
): CategoryWeights {
  if (!lastUpdated) {
    return { ...weights };
  }
  const elapsed = Math.max(0, timestamp - lastUpdated);
  if (elapsed === 0 || Object.keys(weights).length === 0) {
    return { ...weights };
  }
  const decayFactor = Math.exp(-elapsed / halfLife);
  const decayed: CategoryWeights = {};
  (Object.keys(weights) as ResonanceCategoryId[]).forEach((key) => {
    const value = weights[key];
    if (value && value > 0.0001) {
      const next = value * decayFactor;
      if (next > 0.0001) {
        decayed[key] = next;
      }
    }
  });
  return decayed;
}

function interestVectorToCategoryWeights(vector: InterestVector): CategoryWeights {
  if (!vector || Object.keys(vector).length === 0) {
    return {};
  }
  const normalized = normalizeVector(vector);
  const weights: CategoryWeights = {};

  Object.entries(normalized).forEach(([topic, value]) => {
    if (!value || value <= 0) {
      return;
    }
    const matches = resolveCategoriesForTopic(topic);
    if (matches.length === 0) {
      weights[RESONANCE_DEFAULT_CATEGORY] =
        (weights[RESONANCE_DEFAULT_CATEGORY] ?? 0) + value;
      return;
    }
    const share = value / matches.length;
    matches.forEach((category) => {
      weights[category] = (weights[category] ?? 0) + share;
    });
  });

  return normalizeWeights(weights);
}

function createDefaultEntry(userId: string): NodeResonanceEntry {
  const user = useUserStore.getState().users.find((candidate) => candidate.id === userId);
  const baseColor = user?.color ?? RESONANCE_DEFAULT_COLOR;
  return {
    recent: {},
    baseline: {},
    recentTimestamp: Date.now(),
    baselineTimestamp: Date.now(),
    currentColor: baseColor,
    mode: 'dynamic',
    lockedColor: undefined,
    dominantCategory: null,
    pulses: [],
  };
}

function mapIntensityToLerp(intensity: number): number {
  const normalized = clamp((intensity - 0.05) / (1.5 - 0.05), 0, 1);
  return 0.25 + normalized * 0.5;
}

function blendWithCurrentColor(
  entry: NodeResonanceEntry,
  target: string,
  intensity: number
): string {
  if (!target) {
    return entry.currentColor;
  }
  if (entry.currentColor === target) {
    return target;
  }
  const current = new Color(entry.currentColor);
  const destination = new Color(target);
  current.lerp(destination, mapIntensityToLerp(intensity));
  return `#${current.getHexString()}`;
}

function applyWeights(
  entry: NodeResonanceEntry,
  weights: CategoryWeights,
  options: RegisterOptions
): { updated: NodeResonanceEntry; result: NodeResonanceResult } {
  const timestamp = options.timestamp ?? Date.now();
  const intensity = clamp(options.intensity ?? 1, 0.05, 1.5);

  const recent = decayWeights(entry.recent, entry.recentTimestamp, timestamp, RECENT_HALF_LIFE_MS);
  const baseline = decayWeights(entry.baseline, entry.baselineTimestamp, timestamp, BASELINE_HALF_LIFE_MS);

  const normalizedWeights = normalizeWeights(weights);
  const baselineContribution = 0.4;
  const recentContribution = 1;

  (Object.keys(normalizedWeights) as ResonanceCategoryId[]).forEach((category) => {
    const weight = normalizedWeights[category] ?? 0;
    if (weight <= 0) {
      return;
    }
    recent[category] = (recent[category] ?? 0) + weight * recentContribution;
    baseline[category] = (baseline[category] ?? 0) + weight * baselineContribution;
  });

  const normalizedRecent = normalizeWeights(recent);
  const normalizedBaseline = normalizeWeights(baseline);

  const composite: CategoryWeights = {};
  const recentBias = 0.65;
  const baselineBias = 1 - recentBias;

  RESONANCE_CATEGORIES.forEach((category) => {
    const r = normalizedRecent[category.id] ?? 0;
    const b = normalizedBaseline[category.id] ?? 0;
    const value = r * recentBias + b * baselineBias;
    if (value > 0.0001) {
      composite[category.id] = value;
    }
  });

  const normalizedComposite = normalizeWeights(composite);
  let dominantCategory: ResonanceCategoryId | null = null;
  let dominantValue = 0;
  Object.entries(normalizedComposite).forEach(([category, value]) => {
    if (value > dominantValue) {
      dominantCategory = category as ResonanceCategoryId;
      dominantValue = value;
    }
  });

  const blendedColor = blendCategoryColors(normalizedComposite);
  const nextColor = entry.mode === 'locked' && entry.lockedColor
    ? entry.lockedColor
    : blendWithCurrentColor(entry, blendedColor, intensity);

  const updated: NodeResonanceEntry = {
    ...entry,
    recent,
    baseline,
    recentTimestamp: timestamp,
    baselineTimestamp: timestamp,
    dominantCategory,
  };

  if (entry.mode !== 'locked') {
    updated.currentColor = nextColor;
  }

  return {
    updated,
    result: {
      color: entry.mode === 'locked' && entry.lockedColor ? entry.lockedColor : nextColor,
      dominantCategory,
      weights: normalizedComposite,
    },
  };
}

export const useNodeResonanceStore = create<NodeResonanceState>((set, get) => ({
  nodes: {},

  hydrateUserColor: (userId, color) => {
    set((state) => {
      const entry = state.nodes[userId] ?? createDefaultEntry(userId);
      const nextEntry: NodeResonanceEntry = {
        ...entry,
        currentColor: entry.mode === 'locked' && entry.lockedColor ? entry.lockedColor : color,
      };
      return {
        nodes: {
          ...state.nodes,
          [userId]: nextEntry,
        },
      };
    });
  },

  syncManualPreferences: (userId, preferences) => {
    const mode = preferences?.mode ?? 'dynamic';
    const lockedColor = preferences?.lockedColor;
    set((state) => {
      const entry = state.nodes[userId] ?? createDefaultEntry(userId);
      const nextColor =
        mode === 'locked' && lockedColor
          ? lockedColor
          : entry.currentColor ?? RESONANCE_DEFAULT_COLOR;
      const nextEntry: NodeResonanceEntry = {
        ...entry,
        mode,
        lockedColor,
        currentColor: mode === 'locked' && lockedColor ? lockedColor : entry.currentColor,
      };
      return {
        nodes: {
          ...state.nodes,
          [userId]: nextEntry,
        },
      };
    });

    if (mode === 'locked' && lockedColor) {
      useUserStore.getState().updateUserColor(userId, lockedColor);
    }
  },

  registerInterestEngagement: (userId, vector, options) => {
    const weights = interestVectorToCategoryWeights(vector);
    return get().registerCategoryWeights(userId, weights, options);
  },

  registerCategoryEngagement: (userId, category, options) => {
    const weights: CategoryWeights = { [category]: 1 };
    return get().registerCategoryWeights(userId, weights, options);
  },

  registerCategoryWeights: (userId, weights, options = {}) => {
    if (!weights || Object.keys(weights).length === 0) {
      const entry = get().nodes[userId] ?? createDefaultEntry(userId);
      return {
        color: entry.currentColor,
        dominantCategory: entry.dominantCategory,
        weights: entry.recent,
      };
    }
    const timestamp = options.timestamp ?? Date.now();
    const intensity = clamp(options.intensity ?? 1, 0.05, 1.5);
    let applied: NodeResonanceResult = {
      color: RESONANCE_DEFAULT_COLOR,
      dominantCategory: null,
      weights: {},
    };

    set((state) => {
      const entry = state.nodes[userId] ?? createDefaultEntry(userId);
      const { updated, result } = applyWeights(entry, weights, { intensity, timestamp });
      applied = result;
      const nextNodes = {
        ...state.nodes,
        [userId]: updated,
      };
      return {
        nodes: nextNodes,
      };
    });

    const userColor = useUserStore.getState().users.find((candidate) => candidate.id === userId)?.color;
    if (applied.color && userColor !== applied.color) {
      const entry = get().nodes[userId];
      if (entry?.mode !== 'locked') {
        useUserStore.getState().updateUserColor(userId, applied.color);
      }
    }

    return applied;
  },

  registerContentPulse: (userId, category, options = {}) => {
    const timestamp = options.timestamp ?? Date.now();
    const duration = options.durationMs ?? DEFAULT_PULSE_DURATION_MS;
    const pulse: NodePulseState = {
      id: generateId('node-pulse'),
      category,
      startedAt: timestamp,
      duration,
    };

    set((state) => {
      const entry = state.nodes[userId] ?? createDefaultEntry(userId);
      const activePulses = entry.pulses.filter(
        (existing) => existing.startedAt + existing.duration > timestamp
      );
      const nextEntry: NodeResonanceEntry = {
        ...entry,
        pulses: [...activePulses, pulse],
      };
      return {
        nodes: {
          ...state.nodes,
          [userId]: nextEntry,
        },
      };
    });
  },

  clearPulse: (userId, pulseId) => {
    set((state) => {
      const entry = state.nodes[userId];
      if (!entry) {
        return state;
      }
      const filtered = entry.pulses.filter((pulse) => pulse.id !== pulseId);
      if (filtered.length === entry.pulses.length) {
        return state;
      }
      return {
        nodes: {
          ...state.nodes,
          [userId]: {
            ...entry,
            pulses: filtered,
          },
        },
      };
    });
  },

  removeUser: (userId) => {
    set((state) => {
      const { [userId]: _removed, ...rest } = state.nodes;
      return {
        nodes: rest,
      };
    });
  },
}));

export function getCategoryLegend(): ResonanceCategoryConfig[] {
  return RESONANCE_CATEGORIES;
}
