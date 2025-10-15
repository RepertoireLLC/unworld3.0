import { create } from 'zustand';
import { InterestVector, clamp, normalizeVector } from '../utils/vector';

interface InterestEntry {
  value: number;
  lastUpdated: number;
  locked: boolean;
}

interface InterestProfile {
  entries: Record<string, InterestEntry>;
  halfLifeDays?: number;
  lastDecayCheck?: number;
}

interface InterestDescriptor {
  topic: string;
  value: number;
  locked: boolean;
  lastUpdated: number;
}

interface RecordInteractionOptions {
  weight?: number;
  timestamp?: number;
}

interface InterestState {
  profiles: Record<string, InterestProfile>;
  defaultHalfLifeDays: number;
  ensureProfile: (userId: string, seedVector?: InterestVector) => void;
  getInterestVector: (userId: string, options?: { applyDecay?: boolean }) => InterestVector;
  getInterestDescriptors: (userId: string) => InterestDescriptor[];
  recordInteraction: (
    userId: string,
    vector: InterestVector,
    options?: RecordInteractionOptions
  ) => void;
  integratePublicContent: (
    userId: string,
    vector: InterestVector,
    timestamp?: number
  ) => void;
  setInterestValue: (userId: string, topic: string, value: number) => void;
  toggleInterestLock: (userId: string, topic: string) => void;
  setHalfLifeDays: (userId: string, days: number) => void;
  getHalfLifeDays: (userId: string) => number;
  importInterests: (userId: string, vector: InterestVector) => void;
}

const DEFAULT_HALF_LIFE_DAYS = 30;

function applyDecay(profile: InterestProfile, now: number, halfLifeDays: number) {
  const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
  Object.values(profile.entries).forEach((entry) => {
    if (entry.locked) {
      return;
    }
    const elapsed = now - entry.lastUpdated;
    if (elapsed <= 0) {
      return;
    }
    const decayed = entry.value * Math.exp(-elapsed / halfLifeMs);
    entry.value = decayed;
    entry.lastUpdated = now;
  });
  profile.lastDecayCheck = now;
}

export const useInterestStore = create<InterestState>((set, get) => ({
  profiles: {},
  defaultHalfLifeDays: DEFAULT_HALF_LIFE_DAYS,

  ensureProfile: (userId, seedVector) => {
    set((state) => {
      if (state.profiles[userId]) {
        return {};
      }
      const normalized = seedVector ? normalizeVector(seedVector) : {};
      const entries: Record<string, InterestEntry> = {};
      Object.entries(normalized).forEach(([topic, value]) => {
        entries[topic] = {
          value,
          locked: false,
          lastUpdated: Date.now(),
        };
      });
      return {
        profiles: {
          ...state.profiles,
          [userId]: {
            entries,
            halfLifeDays: undefined,
            lastDecayCheck: Date.now(),
          },
        },
      };
    });
  },

  getInterestVector: (userId, options) => {
    const { profiles, defaultHalfLifeDays } = get();
    const profile = profiles[userId];
    if (!profile) {
      return {};
    }
    if (options?.applyDecay !== false) {
      applyDecay(profile, Date.now(), profile.halfLifeDays ?? defaultHalfLifeDays);
    }
    const vector: InterestVector = {};
    Object.entries(profile.entries).forEach(([topic, entry]) => {
      vector[topic] = entry.value;
    });
    return vector;
  },

  getInterestDescriptors: (userId) => {
    const { profiles, defaultHalfLifeDays } = get();
    const profile = profiles[userId];
    if (!profile) {
      return [];
    }
    applyDecay(profile, Date.now(), profile.halfLifeDays ?? defaultHalfLifeDays);
    return Object.entries(profile.entries)
      .map(([topic, entry]) => ({
        topic,
        value: entry.value,
        locked: entry.locked,
        lastUpdated: entry.lastUpdated,
      }))
      .sort((a, b) => b.value - a.value);
  },

  recordInteraction: (userId, vector, options) => {
    if (!vector || Object.keys(vector).length === 0) {
      return;
    }
    const timestamp = options?.timestamp ?? Date.now();
    const weight = options?.weight ?? 0.2;

    set((state) => {
      const profile = state.profiles[userId] ?? {
        entries: {},
        halfLifeDays: undefined,
        lastDecayCheck: undefined,
      };
      const halfLifeDays = profile.halfLifeDays ?? state.defaultHalfLifeDays;
      applyDecay(profile, timestamp, halfLifeDays);

      Object.entries(vector).forEach(([topic, value]) => {
        const current = profile.entries[topic];
        if (!current) {
          profile.entries[topic] = {
            value: clamp(value * weight, 0, 1),
            locked: false,
            lastUpdated: timestamp,
          };
          return;
        }
        if (current.locked) {
          return;
        }
        const nextValue = clamp(current.value + value * weight, 0, 1);
        profile.entries[topic] = {
          ...current,
          value: nextValue,
          lastUpdated: timestamp,
        };
      });

      return {
        profiles: {
          ...state.profiles,
          [userId]: profile,
        },
      };
    });
  },

  integratePublicContent: (userId, vector, timestamp) => {
    if (!vector || Object.keys(vector).length === 0) {
      return;
    }
    get().recordInteraction(userId, vector, { weight: 0.35, timestamp });
  },

  setInterestValue: (userId, topic, value) => {
    set((state) => {
      const profile = state.profiles[userId];
      if (!profile) {
        return {};
      }
      const entry = profile.entries[topic] ?? {
        value: 0,
        locked: false,
        lastUpdated: Date.now(),
      };
      profile.entries[topic] = {
        ...entry,
        value: clamp(value, 0, 1),
        lastUpdated: Date.now(),
      };
      return {
        profiles: {
          ...state.profiles,
          [userId]: profile,
        },
      };
    });
  },

  toggleInterestLock: (userId, topic) => {
    set((state) => {
      const profile = state.profiles[userId];
      if (!profile) {
        return {};
      }
      const entry = profile.entries[topic];
      if (!entry) {
        return {};
      }
      profile.entries[topic] = {
        ...entry,
        locked: !entry.locked,
      };
      return {
        profiles: {
          ...state.profiles,
          [userId]: profile,
        },
      };
    });
  },

  setHalfLifeDays: (userId, days) => {
    set((state) => {
      const profile = state.profiles[userId] ?? {
        entries: {},
        halfLifeDays: undefined,
        lastDecayCheck: undefined,
      };
      profile.halfLifeDays = Math.max(1, days);
      return {
        profiles: {
          ...state.profiles,
          [userId]: profile,
        },
      };
    });
  },

  getHalfLifeDays: (userId) => {
    const { profiles, defaultHalfLifeDays } = get();
    return profiles[userId]?.halfLifeDays ?? defaultHalfLifeDays;
  },

  importInterests: (userId, vector) => {
    if (!vector || Object.keys(vector).length === 0) {
      return;
    }
    set((state) => {
      const profile = state.profiles[userId] ?? {
        entries: {},
        halfLifeDays: undefined,
        lastDecayCheck: undefined,
      };
      const normalized = normalizeVector(vector);
      Object.entries(normalized).forEach(([topic, value]) => {
        const entry = profile.entries[topic];
        if (entry && entry.locked) {
          return;
        }
        profile.entries[topic] = {
          value: clamp(value, 0, 1),
          locked: entry?.locked ?? false,
          lastUpdated: Date.now(),
        };
      });
      return {
        profiles: {
          ...state.profiles,
          [userId]: profile,
        },
      };
    });
  },
  removeProfile: (userId) => {
    set((state) => {
      if (!state.profiles[userId]) {
        return state;
      }
      const { [userId]: _removed, ...rest } = state.profiles;
      return { profiles: rest };
    });
  },
}));
