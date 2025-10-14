import { create } from 'zustand';
import { normalizeTag, presentTag } from '../utils/tags';
import type { EngagementType } from './forumStore';

export interface TagMetadata {
  id: string;
  label: string;
  usageCount: number;
  resonance: number;
  lastUsed: number;
  followers: number;
}

interface TagState {
  tags: Record<string, TagMetadata>;
  tagOrder: string[];
  subscriptions: Record<string, string[]>;
  version: number;
  registerTags: (tags: string[]) => void;
  registerEngagement: (tags: string[], engagement: EngagementType) => void;
  followTag: (userId: string, tag: string) => void;
  unfollowTag: (userId: string, tag: string) => void;
  isTagFollowed: (userId: string, tag: string) => boolean;
  getFollowedTags: (userId: string) => string[];
  getTrendingTags: (limit?: number) => TagMetadata[];
  touchTag: (tag: string) => void;
}

const ENGAGEMENT_WEIGHTS: Record<EngagementType, number> = {
  view: 0.05,
  like: 0.1,
  comment: 0.18,
  share: 0.25,
};

const ensureSubscriptions = (
  record: Record<string, string[]>,
  userId: string
): string[] => {
  if (!record[userId]) {
    record[userId] = [];
  }
  return record[userId];
};

export const useTagStore = create<TagState>((set, get) => ({
  tags: {},
  tagOrder: [],
  subscriptions: {},
  version: 0,

  registerTags: (incoming) => {
    if (!incoming || incoming.length === 0) {
      return;
    }
    const now = Date.now();
    const normalized = incoming
      .map((tag) => normalizeTag(tag))
      .filter(Boolean);
    if (normalized.length === 0) {
      return;
    }
    set((state) => {
      let mutated = false;
      const tags = { ...state.tags };
      const order = [...state.tagOrder];
      normalized.forEach((key, index) => {
        if (!key) {
          return;
        }
        const meta = tags[key];
        if (meta) {
          tags[key] = {
            ...meta,
            usageCount: meta.usageCount + 1,
            lastUsed: now,
          };
        } else {
          const label = presentTag(incoming[index] ?? key) || presentTag(key);
          tags[key] = {
            id: key,
            label,
            usageCount: 1,
            resonance: 0,
            lastUsed: now,
            followers: 0,
          };
          order.unshift(key);
        }
        mutated = true;
      });
      if (!mutated) {
        return state;
      }
      return {
        tags,
        tagOrder: Array.from(new Set(order)),
        version: state.version + 1,
      };
    });
  },

  registerEngagement: (tags, engagement) => {
    if (!tags || tags.length === 0) {
      return;
    }
    const weight = ENGAGEMENT_WEIGHTS[engagement] ?? 0.05;
    const now = Date.now();
    const normalized = tags.map((tag) => normalizeTag(tag)).filter(Boolean);
    if (normalized.length === 0) {
      return;
    }
    set((state) => {
      let mutated = false;
      const updated = { ...state.tags };
      normalized.forEach((key) => {
        const meta = updated[key];
        if (!meta) {
          return;
        }
        mutated = true;
        updated[key] = {
          ...meta,
          resonance: Math.min(meta.resonance + weight, 1),
          usageCount: meta.usageCount + 1,
          lastUsed: now,
        };
      });
      if (!mutated) {
        return state;
      }
      return {
        tags: updated,
        version: state.version + 1,
      };
    });
  },

  followTag: (userId, tag) => {
    const key = normalizeTag(tag);
    if (!userId || !key) {
      return;
    }
    set((state) => {
      const subscriptions = { ...state.subscriptions };
      const userTags = [...ensureSubscriptions(subscriptions, userId)];
      if (userTags.includes(key)) {
        return state;
      }
      userTags.push(key);
      subscriptions[userId] = userTags;
      const tags = { ...state.tags };
      const meta = tags[key];
      if (meta) {
        tags[key] = {
          ...meta,
          followers: meta.followers + 1,
          lastUsed: Date.now(),
        };
      }
      return {
        subscriptions,
        tags,
        version: state.version + 1,
      };
    });
  },

  unfollowTag: (userId, tag) => {
    const key = normalizeTag(tag);
    if (!userId || !key) {
      return;
    }
    set((state) => {
      const existing = state.subscriptions[userId];
      if (!existing || existing.length === 0) {
        return state;
      }
      if (!existing.includes(key)) {
        return state;
      }
      const subscriptions = { ...state.subscriptions };
      subscriptions[userId] = existing.filter((item) => item !== key);
      const tags = { ...state.tags };
      const meta = tags[key];
      if (meta && meta.followers > 0) {
        tags[key] = {
          ...meta,
          followers: meta.followers - 1,
        };
      }
      return {
        subscriptions,
        tags,
        version: state.version + 1,
      };
    });
  },

  isTagFollowed: (userId, tag) => {
    const key = normalizeTag(tag);
    if (!userId || !key) {
      return false;
    }
    const subscriptions = get().subscriptions[userId] ?? [];
    return subscriptions.includes(key);
  },

  getFollowedTags: (userId) => {
    if (!userId) {
      return [];
    }
    const state = get();
    const keys = state.subscriptions[userId] ?? [];
    return keys
      .map((key) => state.tags[key])
      .filter((meta): meta is TagMetadata => Boolean(meta))
      .map((meta) => meta.label);
  },

  getTrendingTags: (limit = 16) => {
    const state = get();
    const ranked = state.tagOrder
      .map((key) => state.tags[key])
      .filter((meta): meta is TagMetadata => Boolean(meta))
      .sort((a, b) => {
        if (b.followers === a.followers) {
          if (b.usageCount === a.usageCount) {
            return b.lastUsed - a.lastUsed;
          }
          return b.usageCount - a.usageCount;
        }
        return b.followers - a.followers;
      });
    return ranked.slice(0, limit);
  },

  touchTag: (tag) => {
    const key = normalizeTag(tag);
    if (!key) {
      return;
    }
    set((state) => {
      const meta = state.tags[key];
      if (!meta) {
        return state;
      }
      return {
        tags: {
          ...state.tags,
          [key]: {
            ...meta,
            lastUsed: Date.now(),
          },
        },
        version: state.version + 1,
      };
    });
  },
}));
