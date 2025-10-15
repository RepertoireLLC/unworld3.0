import { create } from 'zustand';
import { createSecureVault } from '../utils/encryption';
import { generateId } from '../utils/id';
import { encodeStringToBase64 } from '../utils/base64';
import { cosineSimilarity, buildInterestVectorFromTags, clamp, normalizeVector } from '../utils/vector';
import { useInterestStore } from './interestStore';
import { useMeshStore } from './meshStore';
import { useNodeResonanceStore } from './nodeResonanceStore';
import type {
  ReelRecord,
  ReelComposerDraft,
  ReelPrivacy,
  ReelFilterPreset,
  ReelMediaVariant,
  ReelMetricsSummary,
} from '../types/reels';

interface ReelCreationPayload {
  caption: string;
  tags: string[];
  privacy: ReelPrivacy;
  media: {
    originalUrl: string;
    optimized?: ReelMediaVariant[];
    duration: number;
    trim: { start: number; end: number };
    filter: ReelFilterPreset;
    audioTrackId?: string;
    previewImage?: string;
  };
  nodeAddress?: string;
  remixOf?: string;
}

interface ReelSharePayload {
  channel: 'mesh' | 'chat' | 'copy';
  note?: string;
}

interface ReelCommentPayload {
  userId: string;
  displayName: string;
  content: string;
}

interface ReelPersistedState {
  reels: Record<string, ReelRecord>;
  feedOrder: string[];
  composerDraft: ReelComposerDraft | null;
}

interface ReelFeedOptions {
  userId: string | null;
  followIds: string[];
  includeNsfw: boolean;
}

interface ReelsState extends ReelPersistedState {
  isHydrated: boolean;
  activeReelId: string | null;
  hydrate: () => Promise<void>;
  setActiveReel: (reelId: string | null) => void;
  setComposerDraft: (draft: ReelComposerDraft | null) => void;
  createReel: (creator: { id: string; name: string; color: string }, payload: ReelCreationPayload) => {
    success: boolean;
    message?: string;
    reel?: ReelRecord;
  };
  updateReel: (reelId: string, updates: Partial<Pick<ReelRecord, 'caption' | 'tags' | 'privacy'>>) => void;
  toggleLike: (reelId: string, userId: string, displayName: string) => { liked: boolean };
  addComment: (reelId: string, payload: ReelCommentPayload) => {
    success: boolean;
    message?: string;
    commentId?: string;
  };
  recordView: (reelId: string, userId: string | null, watchThrough?: number) => void;
  shareReel: (reelId: string, userId: string, payload: ReelSharePayload) => void;
  remixReel: (creator: { id: string; name: string; color: string }, sourceId: string, caption?: string) => {
    success: boolean;
    message?: string;
    reelId?: string;
  };
  getFeedForUser: (options: ReelFeedOptions) => ReelRecord[];
  loadMoreFeed: (count?: number) => void;
  getMetricsForUser: (userId: string) => ReelMetricsSummary;
  purgeUserData: (userId: string) => void;
}

const reelsVault = createSecureVault<ReelPersistedState>({
  storageKey: 'harmonia.reels.v1',
  metadata: { schema: 'harmonia.reels' },
});

const DEFAULT_STATE: ReelPersistedState = {
  reels: {},
  feedOrder: [],
  composerDraft: null,
};

function persistState(get: () => ReelsState) {
  const { reels, feedOrder, composerDraft } = get();
  void reelsVault.save({ reels, feedOrder, composerDraft });
}

function buildChecksum(reel: ReelCreationPayload, creatorId: string) {
  const raw = [
    creatorId,
    reel.caption,
    reel.tags.join(','),
    reel.media.originalUrl,
    reel.media.duration.toString(),
    reel.media.trim.start.toString(),
    reel.media.trim.end.toString(),
    reel.privacy,
    reel.media.filter,
    reel.media.audioTrackId ?? 'none',
  ].join('|');
  return encodeStringToBase64(raw).slice(0, 64);
}

function createOptimizedVariants(originalUrl: string): ReelMediaVariant[] {
  const qualities: Array<{ suffix: string; quality: ReelMediaVariant['quality']; bitrate: number }> = [
    { suffix: '?quality=low', quality: 'low', bitrate: 900 },
    { suffix: '?quality=med', quality: 'medium', bitrate: 1800 },
    { suffix: '?quality=high', quality: 'high', bitrate: 3200 },
  ];
  return qualities.map((entry, index) => ({
    url: `${originalUrl}${entry.suffix}`,
    quality: entry.quality,
    bitrateKbps: entry.bitrate,
    dimensions: { width: 720 + index * 240, height: 1280 + index * 160 },
  }));
}

function computeFeedScore(reel: ReelRecord, viewerVector: ReturnType<typeof useInterestStore.getState>['getInterestVector'], options: ReelFeedOptions): number {
  const similarity = options.userId ? cosineSimilarity(reel.interestVector, viewerVector(options.userId)) : 0.25;
  const now = Date.now();
  const ageMs = now - new Date(reel.createdAt).getTime();
  const recency = clamp(1 - ageMs / (1000 * 60 * 60 * 48), 0, 1);
  const engagementBase = reel.metrics.views + reel.metrics.likes * 2 + reel.metrics.comments * 1.5 + reel.metrics.shares * 1.25;
  const engagement = clamp(engagementBase / 250, 0, 1);
  const resonance = clamp(reel.resonance.auraStrength, 0, 1);
  const privacyBoost = reel.privacy === 'public' ? 0 : 0.05;
  return similarity * 0.55 + recency * 0.2 + engagement * 0.2 + resonance * 0.05 + privacyBoost;
}

function isNsfw(reel: ReelRecord) {
  return reel.tags.some((tag) => /nsfw|18\+|mature/.test(tag.toLowerCase()));
}

export const useReelsStore = create<ReelsState>((set, get) => ({
  ...DEFAULT_STATE,
  isHydrated: false,
  activeReelId: null,
  async hydrate() {
    if (get().isHydrated) {
      return;
    }
    try {
      const stored = await reelsVault.load();
      if (stored) {
        set({ ...stored, isHydrated: true, activeReelId: stored.feedOrder[0] ?? null });
      } else {
        set({ ...DEFAULT_STATE, isHydrated: true });
      }
    } catch (error) {
      console.warn('Failed to hydrate reels store', error);
      set({ ...DEFAULT_STATE, isHydrated: true });
    }
  },
  setActiveReel: (reelId) => set({ activeReelId: reelId }),
  setComposerDraft: (draft) => {
    set({ composerDraft: draft });
    persistState(get);
  },
  createReel: (creator, payload) => {
    const duration = payload.media.trim.end - payload.media.trim.start;
    if (duration > 90.5 || payload.media.duration > 92) {
      return { success: false, message: 'Reels must be 90 seconds or shorter.' };
    }
    if (!payload.media.originalUrl) {
      return { success: false, message: 'Upload a video clip before publishing.' };
    }

    const id = generateId('reel');
    const createdAtMs = Date.now();
    const timestamp = new Date(createdAtMs).toISOString();
    const optimized = payload.media.optimized ?? createOptimizedVariants(payload.media.originalUrl);
    const nodeAddress =
      payload.nodeAddress ??
      (() => {
        const mesh = useMeshStore.getState();
        return mesh.localPeerId ? `mesh://${mesh.localPeerId}/reels/${id}` : `mesh://local/reels/${id}`;
      })();

    const interestVector = normalizeVector({
      ...buildInterestVectorFromTags(payload.tags),
    });

    const checksum = buildChecksum(payload, creator.id);

    const record: ReelRecord = {
      id,
      creatorId: creator.id,
      creatorName: creator.name,
      creatorAvatarColor: creator.color,
      nodeAddress,
      caption: payload.caption,
      tags: payload.tags,
      privacy: payload.privacy,
      createdAt: timestamp,
      updatedAt: timestamp,
      media: {
        originalUrl: payload.media.originalUrl,
        optimized,
        previewImage: payload.media.previewImage,
        audioTrackId: payload.media.audioTrackId,
        trim: payload.media.trim,
        duration: payload.media.duration,
        filter: payload.media.filter,
      },
      metrics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        remixes: 0,
        viewers: [],
        likedBy: [],
      },
      comments: [],
      resonance: {
        frames: [],
        auraStrength: 0.2,
      },
      interestVector,
      remixOf: payload.remixOf,
      checksum,
    };

    set((state) => ({
      reels: {
        ...state.reels,
        [record.id]: record,
      },
      feedOrder: [record.id, ...state.feedOrder.filter((entry) => entry !== record.id)],
      composerDraft: state.composerDraft,
      activeReelId: record.id,
    }));

    useInterestStore
      .getState()
      .recordInteraction(creator.id, record.interestVector, { weight: 0.4, timestamp: createdAtMs });

    const nodeResonance = useNodeResonanceStore.getState();
    const resonanceResult = nodeResonance.registerInterestEngagement(creator.id, record.interestVector, {
      intensity: 1,
      timestamp: createdAtMs,
    });
    if (resonanceResult.dominantCategory) {
      nodeResonance.registerContentPulse(creator.id, resonanceResult.dominantCategory, {
        timestamp: createdAtMs,
      });
    }

    persistState(get);

    return { success: true, reel: record };
  },
  updateReel: (reelId, updates) => {
    set((state) => {
      const reel = state.reels[reelId];
      if (!reel) {
        return state;
      }
      const next: ReelRecord = {
        ...reel,
        ...('caption' in updates ? { caption: updates.caption ?? reel.caption } : {}),
        ...('tags' in updates ? { tags: updates.tags ?? reel.tags } : {}),
        ...('privacy' in updates ? { privacy: updates.privacy ?? reel.privacy } : {}),
        updatedAt: new Date().toISOString(),
      };
      if (updates.tags) {
        next.interestVector = normalizeVector({
          ...buildInterestVectorFromTags(updates.tags),
        });
      }
      return {
        ...state,
        reels: {
          ...state.reels,
          [reelId]: next,
        },
      };
    });
    persistState(get);
  },
  toggleLike: (reelId, userId, displayName) => {
    const state = get();
    const reel = state.reels[reelId];
    if (!reel) {
      return { liked: false };
    }
    const liked = reel.metrics.likedBy.includes(userId);
    const eventTimestamp = Date.now();
    const updatedLikedBy = liked
      ? reel.metrics.likedBy.filter((id) => id !== userId)
      : [...reel.metrics.likedBy, userId];
    const updatedMetrics = {
      ...reel.metrics,
      likedBy: updatedLikedBy,
      likes: liked ? Math.max(0, reel.metrics.likes - 1) : reel.metrics.likes + 1,
    };
    const aura = clamp(reel.resonance.auraStrength + (liked ? -0.05 : 0.07), 0.05, 1.2);
    const frame = { timestamp: eventTimestamp, amplitude: aura };

    set((current) => ({
      reels: {
        ...current.reels,
        [reelId]: {
          ...reel,
          metrics: updatedMetrics,
          resonance: {
            auraStrength: aura,
            frames: [...reel.resonance.frames.slice(-32), frame],
          },
        },
      },
    }));

    useInterestStore
      .getState()
      .recordInteraction(userId, reel.interestVector, { weight: liked ? -0.1 : 0.3, timestamp: eventTimestamp });

    useNodeResonanceStore
      .getState()
      .registerInterestEngagement(userId, reel.interestVector, {
        intensity: liked ? 0.18 : 0.42,
        timestamp: eventTimestamp,
      });

    persistState(get);
    console.info(`${displayName} ${liked ? 'removed a like from' : 'liked'} reel ${reelId}`);
    return { liked: !liked };
  },
  addComment: (reelId, payload) => {
    const state = get();
    const reel = state.reels[reelId];
    if (!reel) {
      return { success: false, message: 'Reel not found' };
    }
    if (!payload.content.trim()) {
      return { success: false, message: 'Comment cannot be empty' };
    }

    const commentId = generateId('reel-comment');
    const eventTimestamp = Date.now();
    const createdAt = new Date(eventTimestamp).toISOString();
    const comment = {
      id: commentId,
      userId: payload.userId,
      displayName: payload.displayName,
      content: payload.content.trim(),
      createdAt,
      resonanceScore: clamp(reel.resonance.auraStrength + Math.random() * 0.1, 0.1, 1.5),
    };

    set((current) => ({
      reels: {
        ...current.reels,
        [reelId]: {
          ...reel,
          metrics: {
            ...reel.metrics,
            comments: reel.metrics.comments + 1,
          },
          comments: [...reel.comments, comment],
        },
      },
    }));

    useInterestStore
      .getState()
      .recordInteraction(payload.userId, reel.interestVector, { weight: 0.25, timestamp: eventTimestamp });

    useNodeResonanceStore
      .getState()
      .registerInterestEngagement(payload.userId, reel.interestVector, {
        intensity: 0.55,
        timestamp: eventTimestamp,
      });

    persistState(get);
    return { success: true, commentId };
  },
  recordView: (reelId, userId, watchThrough) => {
    const state = get();
    const reel = state.reels[reelId];
    if (!reel) {
      return;
    }
    const viewerId = userId ?? 'anonymous';
    const eventTimestamp = Date.now();
    const hasViewed = reel.metrics.viewers.includes(viewerId);
    const additionalWatch = watchThrough ?? 1;

    const updatedViewers = hasViewed ? reel.metrics.viewers : [...reel.metrics.viewers, viewerId];
    const updatedMetrics = {
      ...reel.metrics,
      viewers: updatedViewers,
      views: hasViewed ? reel.metrics.views : reel.metrics.views + 1,
    };

    const aura = clamp(reel.resonance.auraStrength + 0.03 * additionalWatch, 0.05, 1.5);
    const frame = { timestamp: eventTimestamp, amplitude: aura };

    set((current) => ({
      reels: {
        ...current.reels,
        [reelId]: {
          ...reel,
          metrics: updatedMetrics,
          resonance: {
            auraStrength: aura,
            frames: [...reel.resonance.frames.slice(-32), frame],
          },
        },
      },
    }));

    if (userId) {
      useInterestStore
        .getState()
        .integratePublicContent(userId, reel.interestVector, eventTimestamp);

      const viewIntensity = clamp(0.18 * additionalWatch, 0.1, 0.55);
      useNodeResonanceStore
        .getState()
        .registerInterestEngagement(userId, reel.interestVector, {
          intensity: viewIntensity,
          timestamp: eventTimestamp,
        });
    }

    persistState(get);
  },
  shareReel: (reelId, userId, payload) => {
    const reel = get().reels[reelId];
    if (!reel) {
      return;
    }
    set((state) => ({
      reels: {
        ...state.reels,
        [reelId]: {
          ...reel,
          metrics: {
            ...reel.metrics,
            shares: reel.metrics.shares + 1,
          },
        },
      },
    }));
    console.info('Reel shared', { reelId, userId, via: payload.channel, note: payload.note });

    useNodeResonanceStore
      .getState()
      .registerInterestEngagement(userId, reel.interestVector, {
        intensity: 0.38,
        timestamp: Date.now(),
      });
    persistState(get);
  },
  remixReel: (creator, sourceId, caption) => {
    const source = get().reels[sourceId];
    if (!source) {
      return { success: false, message: 'Original reel unavailable' };
    }
    const payload: ReelCreationPayload = {
      caption: caption ?? `Remix of ${source.creatorName}`,
      tags: [...new Set([...source.tags, 'remix'])],
      privacy: source.privacy,
      media: {
        originalUrl: source.media.originalUrl,
        optimized: source.media.optimized,
        duration: Math.min(source.media.duration, 90),
        trim: source.media.trim,
        filter: source.media.filter,
        audioTrackId: source.media.audioTrackId,
        previewImage: source.media.previewImage,
      },
      remixOf: source.id,
    };
    const result = get().createReel(creator, payload);
    if (result.success && result.reel) {
      set((state) => ({
        reels: {
          ...state.reels,
          [sourceId]: {
            ...source,
            metrics: {
              ...source.metrics,
              remixes: source.metrics.remixes + 1,
            },
          },
        },
      }));
      persistState(get);
      return { success: true, reelId: result.reel.id };
    }
    return result;
  },
  getFeedForUser: (options) => {
    const { reels } = get();
    const interest = useInterestStore.getState();
    const entries = Object.values(reels).filter((reel) => {
      if (reel.privacy === 'private' && options.userId !== reel.creatorId) {
        return false;
      }
      if (
        reel.privacy === 'followers' &&
        options.userId &&
        options.userId !== reel.creatorId &&
        !options.followIds.includes(reel.creatorId)
      ) {
        return false;
      }
      if (!options.includeNsfw && isNsfw(reel)) {
        return false;
      }
      return true;
    });

    return entries
      .map((reel) => ({
        reel,
        score: computeFeedScore(reel, interest.getInterestVector, options),
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.reel);
  },
  loadMoreFeed: (count = 8) => {
    const state = get();
    const existingOrder = new Set(state.feedOrder);
    const additional = Object.keys(state.reels)
      .filter((id) => !existingOrder.has(id))
      .slice(0, count);
    if (additional.length === 0) {
      return;
    }
    set((current) => ({ feedOrder: [...current.feedOrder, ...additional] }));
    persistState(get);
  },
  getMetricsForUser: (userId) => {
    const reels = Object.values(get().reels).filter((reel) => reel.creatorId === userId);
    if (reels.length === 0) {
      return {
        totalReels: 0,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        remixes: 0,
        averageWatchThrough: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
    const totals = reels.reduce(
      (acc, reel) => {
        acc.views += reel.metrics.views;
        acc.likes += reel.metrics.likes;
        acc.comments += reel.metrics.comments;
        acc.shares += reel.metrics.shares;
        acc.remixes += reel.metrics.remixes;
        const watchThrough = reel.metrics.viewers.length > 0 ? reel.media.duration / 90 : 0;
        acc.watchThroughSum += watchThrough;
        if (reel.metrics.views > acc.topViews) {
          acc.topViews = reel.metrics.views;
          acc.topReelId = reel.id;
          acc.topReelCaption = reel.caption;
        }
        return acc;
      },
      {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        remixes: 0,
        watchThroughSum: 0,
        topViews: -1,
        topReelId: undefined as string | undefined,
        topReelCaption: undefined as string | undefined,
      }
    );

    return {
      totalReels: reels.length,
      views: totals.views,
      likes: totals.likes,
      comments: totals.comments,
      shares: totals.shares,
      remixes: totals.remixes,
      averageWatchThrough: totals.watchThroughSum / reels.length,
      topReelId: totals.topReelId,
      topReelCaption: totals.topReelCaption,
      lastUpdated: new Date().toISOString(),
    };
  },
  purgeUserData: (userId) => {
    set((state) => {
      const updated: Record<string, ReelRecord> = {};
      Object.values(state.reels).forEach((reel) => {
        if (reel.creatorId === userId) {
          return;
        }
        updated[reel.id] = {
          ...reel,
          metrics: {
            ...reel.metrics,
            likedBy: reel.metrics.likedBy.filter((id) => id !== userId),
            viewers: reel.metrics.viewers.filter((id) => id !== userId),
          },
          comments: reel.comments.filter((comment) => comment.userId !== userId),
        };
      });
      return {
        reels: updated,
        feedOrder: state.feedOrder.filter((id) => updated[id]),
        activeReelId: state.activeReelId && updated[state.activeReelId] ? state.activeReelId : null,
      };
    });
    persistState(get);
  },
}));
