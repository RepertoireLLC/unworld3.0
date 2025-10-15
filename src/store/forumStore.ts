import { create } from 'zustand';
import { generateId } from '../utils/id';
import {
  InterestVector,
  buildInterestVectorFromTags,
  cosineSimilarity,
  normalizeVector,
} from '../utils/vector';
import { useInterestStore } from './interestStore';
import { useFriendStore } from './friendStore';
import { useAuthStore } from './authStore';

export type ForumVisibility = 'public' | 'friends' | 'private';

export interface ForumPost {
  post_id: string;
  author_id: string;
  title: string;
  body: string;
  tags: string[];
  media_url?: string;
  visibility: ForumVisibility;
  interest_vector: InterestVector;
  timestamp: number;
  engagement_score: number;
  mediaType: 'text' | 'image' | 'video';
  commentIds: string[];
  metadata?: Record<string, unknown>;
  nsfw?: boolean;
}

export interface ForumComment {
  comment_id: string;
  post_id: string;
  author_id: string;
  body: string;
  interest_vector: InterestVector;
  timestamp: number;
  parent_comment_id?: string;
  engagement_score: number;
}

export type FeedMode = 'resonant' | 'exploratory' | 'all';

export type EngagementType = 'view' | 'like' | 'comment' | 'share';

export interface FeedEntry {
  post: ForumPost;
  similarity: number;
  label: 'Resonant' | 'Neutral' | 'Exploratory';
  curiosityBoosted: boolean;
}

interface ForumState {
  posts: Record<string, ForumPost>;
  postOrder: string[];
  comments: Record<string, ForumComment>;
  curiosityThreshold: number;
  addPost: (input: {
    authorId: string;
    title: string;
    body: string;
    tags: string[];
    visibility: ForumVisibility;
    mediaUrl?: string;
    interestVector?: InterestVector;
    metadata?: Record<string, unknown>;
    nsfw?: boolean;
  }) => ForumPost;
  addComment: (input: {
    postId: string;
    authorId: string;
    body: string;
    interestVector?: InterestVector;
    parentCommentId?: string;
  }) => ForumComment | undefined;
  updatePostInterestVector: (postId: string, vector: InterestVector) => void;
  recordEngagement: (
    postId: string,
    userId: string,
    type: EngagementType,
    options?: { timestamp?: number }
  ) => void;
  getCommentsForPost: (postId: string) => ForumComment[];
  getFeedForUser: (
    userId: string,
    options?: { mode?: FeedMode; limit?: number; curiosityRatio?: number }
  ) => FeedEntry[];
  initializeSyncChannel: () => void;
}

const curiosityRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

let broadcastChannel: BroadcastChannel | null = null;
let hasInitializedChannel = false;
const STORAGE_SYNC_KEY = 'harmonia_forum_sync_channel';
let storageListener: ((event: StorageEvent) => void) | null = null;

function getBroadcastChannel() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (typeof window.BroadcastChannel === 'undefined') {
    return null;
  }

  if (!broadcastChannel) {
    try {
      broadcastChannel = new window.BroadcastChannel('harmonia_forum');
    } catch (error) {
      console.warn('Failed to initialize BroadcastChannel. Falling back to storage events.', error);
      broadcastChannel = null;
      return null;
    }
  }

  return broadcastChannel;
}

function setupStorageSyncListener(handler: (data: unknown) => void) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return false;
  }

  if (storageListener) {
    return true;
  }

  storageListener = (event: StorageEvent) => {
    if (event.key !== STORAGE_SYNC_KEY || !event.newValue) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue) as { data: unknown };
      handler(payload.data);
    } catch (error) {
      console.warn('Failed to parse forum storage sync payload', error);
    }
  };

  window.addEventListener('storage', storageListener);
  return true;
}

function detectMediaType(url?: string): ForumPost['mediaType'] {
  if (!url) {
    return 'text';
  }
  const lowered = url.toLowerCase();
  if (lowered.startsWith('data:video') || lowered.endsWith('.mp4') || lowered.includes('youtube.com') || lowered.includes('youtu.be')) {
    return 'video';
  }
  if (lowered.startsWith('data:image') || lowered.endsWith('.png') || lowered.endsWith('.jpg') || lowered.endsWith('.jpeg') || lowered.endsWith('.gif') || lowered.endsWith('.webp')) {
    return 'image';
  }
  return 'text';
}

function broadcastSync(payload: unknown) {
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage(payload);
      return;
    } catch (error) {
      console.warn('Failed to broadcast forum payload via BroadcastChannel', error);
    }
  }

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  try {
    const envelope = JSON.stringify({
      data: payload,
      nonce: `${Date.now()}-${Math.random()}`,
    });
    window.localStorage.setItem(STORAGE_SYNC_KEY, envelope);
    window.setTimeout(() => {
      try {
        window.localStorage.removeItem(STORAGE_SYNC_KEY);
      } catch (removeError) {
        console.warn('Failed to clear forum storage sync payload', removeError);
      }
    }, 0);
  } catch (error) {
    console.warn('Failed to broadcast forum payload via storage events', error);
  }
}

type ScoredEntry = FeedEntry & { seed: number };

export const useForumStore = create<ForumState>((set, get) => ({
  posts: {},
  postOrder: [],
  comments: {},
  curiosityThreshold: 0.18,

  addPost: ({
    authorId,
    title,
    body,
    tags,
    visibility,
    mediaUrl,
    interestVector,
    metadata,
    nsfw,
  }) => {
    const postId = generateId('forum_post');
    const timestamp = Date.now();
    const vector = normalizeVector(
      interestVector && Object.keys(interestVector).length > 0
        ? interestVector
        : buildInterestVectorFromTags(tags)
    );
    const mediaType = detectMediaType(mediaUrl);

    const inferredNsfw =
      nsfw ??
      tags.some((tag) => {
        const lowered = tag.toLowerCase();
        return lowered.includes('nsfw') || lowered.includes('mature') || lowered.includes('explicit');
      });

    const post: ForumPost = {
      post_id: postId,
      author_id: authorId,
      title,
      body,
      tags,
      visibility,
      media_url: mediaUrl,
      interest_vector: vector,
      timestamp,
      engagement_score: 0,
      mediaType,
      commentIds: [],
      metadata,
      nsfw: inferredNsfw,
    };

    set((state) => {
      const order = [postId, ...state.postOrder];
      return {
        posts: {
          ...state.posts,
          [postId]: post,
        },
        postOrder: order,
      };
    });

    if (visibility === 'public') {
      useInterestStore.getState().integratePublicContent(authorId, vector, timestamp);
    }

    broadcastSync({ type: 'post', post });

    return post;
  },

  addComment: ({ postId, authorId, body, interestVector, parentCommentId }) => {
    const post = get().posts[postId];
    if (!post) {
      return undefined;
    }
    const commentId = generateId('forum_comment');
    const timestamp = Date.now();
    const vector = normalizeVector(
      interestVector && Object.keys(interestVector).length > 0
        ? interestVector
        : buildInterestVectorFromTags(post.tags)
    );

    const comment: ForumComment = {
      comment_id: commentId,
      post_id: postId,
      author_id: authorId,
      body,
      interest_vector: vector,
      timestamp,
      parent_comment_id: parentCommentId,
      engagement_score: 0,
    };

    set((state) => {
      const postRecord = state.posts[postId];
      const commentsForPost = { ...state.comments };
      commentsForPost[commentId] = comment;

      const updatedPost: ForumPost = {
        ...postRecord,
        commentIds: [...postRecord.commentIds, commentId],
        engagement_score: postRecord.engagement_score + 0.5,
      };

      return {
        posts: {
          ...state.posts,
          [postId]: updatedPost,
        },
        comments: commentsForPost,
      };
    });

    useInterestStore
      .getState()
      .recordInteraction(authorId, vector, { weight: 0.25, timestamp });

    broadcastSync({ type: 'comment', comment });

    return comment;
  },

  updatePostInterestVector: (postId, vector) => {
    if (!vector || Object.keys(vector).length === 0) {
      return;
    }
    set((state) => {
      const post = state.posts[postId];
      if (!post) {
        return {};
      }
      const updated: ForumPost = {
        ...post,
        interest_vector: normalizeVector(vector),
      };
      return {
        posts: {
          ...state.posts,
          [postId]: updated,
        },
      };
    });
  },

  recordEngagement: (postId, userId, type, options) => {
    const timestamp = options?.timestamp ?? Date.now();
    const weightMap: Record<EngagementType, number> = {
      view: 0.05,
      like: 0.12,
      comment: 0.18,
      share: 0.25,
    };
    const post = get().posts[postId];
    if (!post) {
      return;
    }

    set((state) => {
      const record = state.posts[postId];
      if (!record) {
        return {};
      }
      const engagementBoost =
        type === 'like'
          ? 1
          : type === 'comment'
          ? 1.5
          : type === 'share'
          ? 2
          : 0.2;
      return {
        posts: {
          ...state.posts,
          [postId]: {
            ...record,
            engagement_score: record.engagement_score + engagementBoost,
          },
        },
      };
    });

    useInterestStore
      .getState()
      .recordInteraction(userId, post.interest_vector, {
        weight: weightMap[type],
        timestamp,
      });

    broadcastSync({
      type: 'engagement',
      payload: { postId, userId, engagementType: type },
    });
  },

  getCommentsForPost: (postId) => {
    const state = get();
    const post = state.posts[postId];
    if (!post) {
      return [];
    }
    return post.commentIds
      .map((commentId) => state.comments[commentId])
      .filter((comment): comment is ForumComment => Boolean(comment))
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  getFeedForUser: (userId, options) => {
    const state = get();
    const mode = options?.mode ?? 'resonant';
    const limit = options?.limit ?? 40;
    const curiosityRatio = options?.curiosityRatio ?? state.curiosityThreshold;
    const userVector = useInterestStore.getState().getInterestVector(userId);
    const friendStore = useFriendStore.getState();

    const nsfwPreference = useAuthStore
      .getState()
      .registeredUsers.find((candidate) => candidate.id === userId)?.contentPreferences?.nsfw ?? false;

    const visiblePosts = state.postOrder
      .map((postId) => state.posts[postId])
      .filter((post): post is ForumPost => Boolean(post))
      .filter((post) => {
        if (post.visibility === 'public') {
          return true;
        }
        if (post.visibility === 'private') {
          return post.author_id === userId;
        }
        return friendStore.isFriend(userId, post.author_id) || post.author_id === userId;
      })
      .filter((post) => (post.nsfw ? nsfwPreference : true));

    const scored: ScoredEntry[] = visiblePosts.map((post, index) => {
      const similarity = cosineSimilarity(userVector, post.interest_vector);
      let label: FeedEntry['label'] = 'Neutral';
      if (similarity >= 0.6) {
        label = 'Resonant';
      } else if (similarity < 0.25) {
        label = 'Exploratory';
      }
      return {
        post,
        similarity,
        label,
        curiosityBoosted: false,
        seed: curiosityRandom(post.timestamp + index),
      };
    });

    const sorted = scored.sort((a, b) => {
      if (mode === 'all') {
        return b.post.timestamp - a.post.timestamp;
      }
      if (b.similarity === a.similarity) {
        return b.post.engagement_score - a.post.engagement_score;
      }
      return b.similarity - a.similarity;
    });

    const baseCount = Math.min(limit, sorted.length);
    const curiosityCount = Math.max(1, Math.floor(baseCount * curiosityRatio));

    if (mode === 'all') {
      return sorted.slice(0, baseCount).map(({ seed: _seed, ...entry }) => entry);
    }

    const resonantCandidates = sorted.filter((entry) => entry.similarity >= 0.2);
    const exploratoryCandidates = sorted.filter((entry) => entry.similarity < 0.2);

    const feed: ScoredEntry[] = [];
    if (mode === 'resonant') {
      feed.push(...resonantCandidates.slice(0, baseCount - curiosityCount));
    } else {
      feed.push(...exploratoryCandidates.slice(0, curiosityCount));
    }

    const pool = mode === 'resonant' ? exploratoryCandidates : resonantCandidates;
    const randomSelection = [...pool]
      .sort((a, b) => a.seed - b.seed)
      .slice(0, curiosityCount)
      .map((entry) => ({ ...entry, curiosityBoosted: true, label: 'Exploratory' as const }));

    feed.push(...randomSelection);

    if (feed.length < baseCount) {
      feed.push(
        ...sorted
          .filter((entry) => !feed.includes(entry))
          .slice(0, baseCount - feed.length)
      );
    }

    return feed
      .slice(0, baseCount)
      .map(({ seed: _seed, ...entry }) => entry);
  },

  initializeSyncChannel: () => {
    if (hasInitializedChannel) {
      return;
    }

    const handleMessage = (data: unknown) => {
      const { type, post, comment } = (data ?? {}) as {
        type?: string;
        post?: ForumPost;
        comment?: ForumComment;
      };

      if (type === 'post' && post) {
        set((state) => {
          if (state.posts[post.post_id]) {
            return {};
          }
          return {
            posts: {
              ...state.posts,
              [post.post_id]: post,
            },
            postOrder: state.postOrder.includes(post.post_id)
              ? state.postOrder
              : [post.post_id, ...state.postOrder],
          };
        });
      }

      if (type === 'comment' && comment) {
        set((state) => {
          if (state.comments[comment.comment_id]) {
            return {};
          }
          const postRecord = state.posts[comment.post_id];
          if (!postRecord) {
            return {};
          }
          return {
            posts: {
              ...state.posts,
              [comment.post_id]: {
                ...postRecord,
                commentIds: [...postRecord.commentIds, comment.comment_id],
              },
            },
            comments: {
              ...state.comments,
              [comment.comment_id]: comment,
            },
          };
        });
      }
    };

    const channel = getBroadcastChannel();
    if (channel) {
      channel.onmessage = (event) => handleMessage(event.data);
      hasInitializedChannel = true;
      return;
    }

    const attached = setupStorageSyncListener(handleMessage);
    if (attached) {
      hasInitializedChannel = true;
    }
  },
}));
