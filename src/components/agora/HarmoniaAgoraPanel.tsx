import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useForumStore, FeedEntry } from '../../store/forumStore';
import { useInterestStore } from '../../store/interestStore';
import { useAgoraStore } from '../../store/agoraStore';
import { buildInterestVectorFromTags, InterestVector, normalizeVector } from '../../utils/vector';
import { deduplicateTags, normalizeTag, presentTag } from '../../utils/tags';
import { AgoraPostCard } from './AgoraPostCard';
import { useTagStore } from '../../store/tagStore';
import type { LucideIcon } from 'lucide-react';
import {
  Aperture,
  Flame,
  Orbit,
  Radio,
  Upload,
  Image as ImageIcon,
  Video,
  Sparkles,
  Shuffle,
  Wand2,
  Eye,
  Globe2,
  MessageSquare,
  Tag,
  BookmarkCheck,
  BookmarkPlus,
  XCircle,
  SlidersHorizontal,
} from 'lucide-react';

const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Public', description: 'Shared with the collective agora.' },
  { id: 'friends', label: 'Friends', description: 'Visible to aligned operators.' },
  { id: 'private', label: 'Private', description: 'Only you can view this signal.' },
] as const;

type VisibilityOption = (typeof VISIBILITY_OPTIONS)[number]['id'];

function tokenizeTags(input: string): string[] {
  return deduplicateTags(
    input
      .split(/[,\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
  );
}

type HarmoniaAgoraVariant = 'agora' | 'forum';

interface HarmoniaAgoraPanelProps {
  variant?: HarmoniaAgoraVariant;
}

interface VariantCopy {
  title: string;
  description: string;
  statusLabel: string;
  statusIcon: LucideIcon;
  composerTitle: string;
  composerDescription: string;
}

const VARIANT_COPY: Record<HarmoniaAgoraVariant, VariantCopy> = {
  agora: {
    title: 'Harmonia Agora',
    description:
      'Share signals with the collective and explore what resonates with your current interests.',
    statusLabel: 'Agora active',
    statusIcon: Orbit,
    composerTitle: 'Compose a post',
    composerDescription:
      'Add a title, describe your thought, and tag the subjects that best match your message.',
  },
  forum: {
    title: 'Public Forum',
    description:
      'Join open dialogues, respond in threads, and surface the topics calling for collaboration.',
    statusLabel: 'Forum live',
    statusIcon: MessageSquare,
    composerTitle: 'Start a thread',
    composerDescription:
      'Frame your discussion and select tags so aligned collaborators can tune in quickly.',
  },
};

export function HarmoniaAgoraPanel({ variant = 'agora' }: HarmoniaAgoraPanelProps) {
  const currentUser = useAuthStore((state) => state.user);
  const [posts, postOrder] = useForumStore((state) => [state.posts, state.postOrder]);
  const getFeedForUser = useForumStore((state) => state.getFeedForUser);
  const addPost = useForumStore((state) => state.addPost);
  const profiles = useInterestStore((state) => state.profiles);
  const getInterestVector = useInterestStore((state) => state.getInterestVector);
  const ensureInterestProfile = useInterestStore((state) => state.ensureProfile);

  const {
    feedMode,
    setFeedMode,
    transparencyEnabled,
    setTransparencyEnabled,
    curiosityRatio,
    setCuriosityRatio,
  } = useAgoraStore();

  const followTag = useTagStore((state) => state.followTag);
  const unfollowTag = useTagStore((state) => state.unfollowTag);
  const isTagFollowedStore = useTagStore((state) => state.isTagFollowed);
  const getFollowedTags = useTagStore((state) => state.getFollowedTags);
  const getTrendingTags = useTagStore((state) => state.getTrendingTags);
  const touchTag = useTagStore((state) => state.touchTag);
  const tagVersion = useTagStore((state) => state.version);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagWeights, setTagWeights] = useState<Record<string, number>>({});
  const [visibility, setVisibility] = useState<VisibilityOption>('public');
  const [mediaUrl, setMediaUrl] = useState<string | undefined>();
  const [mediaPreview, setMediaPreview] = useState<string | undefined>();
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [visibleCount, setVisibleCount] = useState(6);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentUser) {
      ensureInterestProfile(currentUser.id);
    }
  }, [currentUser, ensureInterestProfile]);

  useEffect(() => {
    setVisibleCount(6);
  }, [feedMode, curiosityRatio, postOrder.length, selectedTags]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + 4);
        }
      },
      { threshold: 1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelRef]);

  const userVector = useMemo<InterestVector>(() => {
    if (!currentUser) {
      return {};
    }
    if (!profiles[currentUser.id]) {
      return {};
    }
    return getInterestVector(currentUser.id);
  }, [currentUser, profiles, getInterestVector]);

  const feed = useMemo<FeedEntry[]>(() => {
    if (!currentUser) {
      return [];
    }
    return getFeedForUser(currentUser.id, {
      mode: feedMode,
      limit: 60,
      curiosityRatio,
    });
  }, [currentUser, feedMode, getFeedForUser, curiosityRatio, posts, postOrder]);

  const followedTags = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    return getFollowedTags(currentUser.id);
  }, [currentUser, getFollowedTags, tagVersion]);

  const trendingTags = useMemo(() => getTrendingTags(24), [getTrendingTags, tagVersion]);

  const trendingFiltered = useMemo(
    () =>
      trendingTags.filter(
        (meta) =>
          !followedTags.some((tag) => normalizeTag(tag) === normalizeTag(meta.label))
      ),
    [followedTags, trendingTags]
  );

  const selectedNormalized = useMemo(
    () => selectedTags.map((tag) => normalizeTag(tag)),
    [selectedTags]
  );

  const filteredFeed = useMemo(() => {
    if (selectedNormalized.length === 0) {
      return feed;
    }
    return feed.filter((entry) => {
      const entryTags = entry.post.tags.map((tag) => normalizeTag(tag));
      return selectedNormalized.every((tag) => entryTags.includes(tag));
    });
  }, [feed, selectedNormalized]);

  const displayedFeed = filteredFeed.slice(0, visibleCount);

  const composerVector = useMemo<InterestVector>(() => {
    if (tags.length === 0) {
      return {};
    }
    const vector: InterestVector = {};
    tags.forEach((tag) => {
      const key = tag.toLowerCase();
      const weight = tagWeights[tag] ?? 0.6;
      vector[key] = Math.max(weight, 0);
    });
    return normalizeVector(vector);
  }, [tags, tagWeights]);

  const canPublish =
    currentUser &&
    title.trim().length > 2 &&
    body.trim().length > 10 &&
    tags.length > 0 &&
    !isPublishing;

  const handleAddTag = (incoming: string) => {
    const tokens = tokenizeTags(incoming);
    if (tokens.length === 0) {
      return;
    }
    const existingNormalized = new Set(tags.map((tag) => normalizeTag(tag)));
    const additions: string[] = [];
    tokens.forEach((token) => {
      const formatted = presentTag(token);
      const normalizedToken = normalizeTag(formatted);
      if (!normalizedToken || existingNormalized.has(normalizedToken)) {
        return;
      }
      existingNormalized.add(normalizedToken);
      additions.push(formatted);
    });
    if (additions.length === 0) {
      return;
    }
    setTags((existing) => [...existing, ...additions]);
    setTagWeights((existing) => ({
      ...existing,
      ...Object.fromEntries(additions.map((tag) => [tag, existing[tag] ?? 0.6])),
    }));
    setTagsInput('');
  };

  const handlePublish = async () => {
    if (!currentUser || !canPublish) {
      return;
    }
    setIsPublishing(true);
    try {
      const vector = Object.keys(composerVector).length > 0
        ? composerVector
        : buildInterestVectorFromTags(tags);
      addPost({
        authorId: currentUser.id,
        title: title.trim(),
        body: body.trim(),
        tags,
        visibility,
        mediaUrl: mediaPreview ?? mediaUrl,
        interestVector: vector,
        metadata: {
          curiositySeed: Math.random(),
          halfLife: useInterestStore.getState().getHalfLifeDays(currentUser.id),
        },
      });
      setTitle('');
      setBody('');
      setTags([]);
      setTagWeights({});
      setTagsInput('');
      setMediaUrl(undefined);
      setMediaPreview(undefined);
      setVisibility('public');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setMediaPreview(result);
        setMediaUrl(undefined);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleTagSelection = useCallback(
    (tag: string) => {
      const formatted = presentTag(tag);
      const normalizedTarget = normalizeTag(formatted);
      setSelectedTags((current) => {
        const exists = current.some((entry) => normalizeTag(entry) === normalizedTarget);
        if (exists) {
          return current.filter((entry) => normalizeTag(entry) !== normalizedTarget);
        }
        return [...current, formatted];
      });
      touchTag(formatted);
    },
    [touchTag]
  );

  const handleClearTagSelection = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const isTagFollowed = useCallback(
    (tag: string) => {
      if (!currentUser) {
        return false;
      }
      return isTagFollowedStore(currentUser.id, tag);
    },
    [currentUser, isTagFollowedStore]
  );

  const handleToggleFollow = useCallback(
    (tag: string) => {
      if (!currentUser) {
        return;
      }
      const formatted = presentTag(tag);
      if (isTagFollowedStore(currentUser.id, formatted)) {
        unfollowTag(currentUser.id, formatted);
      } else {
        followTag(currentUser.id, formatted);
      }
      touchTag(formatted);
    },
    [currentUser, followTag, isTagFollowedStore, touchTag, unfollowTag]
  );

  const copy = VARIANT_COPY[variant];
  const StatusIcon = copy.statusIcon;

  return (
    <section className="flex h-full flex-col gap-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-white">{copy.title}</h2>
          <p className="text-sm text-white/60">{copy.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
          <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
            <StatusIcon className="h-4 w-4 text-emerald-300" /> {copy.statusLabel}
          </span>
          <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
            <Radio className="h-4 w-4 text-sky-300" /> Feed mode: {feedMode}
          </span>
          <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
            <Globe2 className="h-4 w-4 text-white/60" /> Curiosity {(curiosityRatio * 100).toFixed(0)}%
          </span>
        </div>
      </header>

      <div className="rounded-xl border border-white/10 bg-slate-950/80 p-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-white">{copy.composerTitle}</h3>
            <p className="text-sm text-white/60">{copy.composerDescription}</p>
          </div>
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/60">
            Visibility: {visibility}
          </span>
        </header>

        <div className="mt-6 space-y-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Post title"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-emerald-400/40 focus:outline-none"
          />

          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Share the idea, insight, or question you want to explore..."
            className="h-32 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-emerald-400/40 focus:outline-none"
          />

          <div>
            <label className="text-sm font-medium text-white/80">Interest tags</label>
            <div className="mt-2 flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <input
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddTag(tagsInput);
                  }
                }}
                placeholder="Add tags like art, philosophy, physics..."
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-400/40 focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70"
                  >
                    <span>{tag}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={tagWeights[tag] ?? 0.6}
                      onChange={(event) =>
                        setTagWeights((state) => ({
                          ...state,
                          [tag]: Number(event.target.value),
                        }))
                      }
                      className="h-1 w-24 cursor-pointer"
                    />
                    <span className="text-xs text-white/50">{Math.round((tagWeights[tag] ?? 0.6) * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTags((state) => state.filter((item) => item !== tag));
                        setTagWeights((state) => {
                          const next = { ...state };
                          delete next[tag];
                          return next;
                        });
                      }}
                      className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs text-white/60 transition hover:bg-white/20"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {tags.length === 0 && (
                  <p className="text-sm text-white/50">
                    Use Enter or commas to add tags. They help us align the post with interested readers.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Upload className="h-4 w-4" /> Attach media
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/60">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 py-2 transition hover:bg-white/20">
                  <ImageIcon className="h-4 w-4" />
                  Image Upload
                  <input type="file" accept="image/*,video/mp4" className="hidden" onChange={handleFileUpload} />
                </label>
                <div className="flex flex-1 items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 py-2">
                  <Video className="h-4 w-4 text-white/40" />
                  <input
                    value={mediaUrl ?? ''}
                    onChange={(event) => {
                      setMediaUrl(event.target.value);
                      setMediaPreview(undefined);
                    }}
                    placeholder="YouTube, IPFS, or direct link"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                  />
                </div>
                {(mediaPreview || mediaUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMediaPreview(undefined);
                      setMediaUrl(undefined);
                    }}
                    className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm text-white/60 transition hover:bg-white/20"
                  >
                    Clear Media
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white/80">Visibility</p>
              <div className="mt-3 space-y-2">
                {VISIBILITY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setVisibility(option.id)}
                    className={`w-full rounded-md border px-4 py-3 text-left transition ${
                      visibility === option.id
                        ? 'border-emerald-400/50 bg-emerald-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{option.label}</span>
                      {visibility === option.id && <Aperture className="h-4 w-4 text-emerald-300" />}
                    </div>
                    <p className="mt-1 text-sm text-white/60">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(mediaPreview || mediaUrl) && (
            <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
              {mediaPreview?.startsWith('data:video') || mediaUrl?.endsWith('.mp4') ? (
                <video src={mediaPreview ?? mediaUrl} controls className="max-h-72 w-full" />
              ) : (
                <img
                  src={mediaPreview ?? mediaUrl}
                  alt="Media preview"
                  className="max-h-72 w-full object-cover"
                />
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-white/60">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" /> Vector strength{' '}
                {Math.round(Object.values(composerVector).reduce((sum, value) => sum + value, 0) * 100)}%
              </span>
              <span className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-300" /> Ready to publish
              </span>
            </div>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish}
              className="flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/40"
            >
              <Wand2 className="h-4 w-4" />
              Publish post
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/80 p-4 text-sm text-white/60">
        <div className="flex flex-wrap items-center gap-2">
          {(['resonant', 'exploratory', 'all'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFeedMode(mode)}
              className={`rounded-full border px-4 py-1.5 transition ${
                feedMode === mode
                  ? 'border-emerald-400/50 bg-emerald-500/10 text-white'
                  : 'border-white/10 bg-transparent text-white/60 hover:bg-white/10'
              }`}
            >
              {mode === 'resonant' && 'Resonant mode'}
              {mode === 'exploratory' && 'Exploratory mode'}
              {mode === 'all' && 'All posts'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <Shuffle className="h-4 w-4 text-fuchsia-200" />
            <input
              type="range"
              min={0.05}
              max={0.5}
              step={0.05}
              value={curiosityRatio}
              onChange={(event) => setCuriosityRatio(Number(event.target.value))}
              className="h-1 w-32 cursor-pointer"
            />
            <span className="text-sm text-white/60">Curiosity</span>
          </label>
          <label className="flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-4 py-1.5 text-white/60">
            <Eye className="h-4 w-4" /> Transparency
            <input
              type="checkbox"
              checked={transparencyEnabled}
              onChange={(event) => setTransparencyEnabled(event.target.checked)}
              className="ml-2 h-4 w-4 accent-emerald-400"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/80 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              <SlidersHorizontal className="h-4 w-4 text-emerald-300" /> Tag resonance
            </p>
            <p className="mt-1 text-sm text-white/60">
              Tune the feed by selecting followed interests or exploring trending topics.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleClearTagSelection}
              disabled={selectedTags.length === 0}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-white/60 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-white/30"
            >
              <XCircle className="h-3.5 w-3.5" /> Clear filters
            </button>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/40">
              {selectedTags.length} active
            </span>
          </div>
        </div>

        {selectedTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleToggleTagSelection(tag)}
                className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-100 transition hover:bg-emerald-500/20"
              >
                <Tag className="h-3.5 w-3.5" /> {tag}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <header className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              <span>Followed tags</span>
              <BookmarkCheck className="h-4 w-4 text-emerald-300" />
            </header>
            <div className="mt-3 flex flex-wrap gap-2">
              {followedTags.length > 0 ? (
                followedTags.map((tag) => {
                  const active = selectedNormalized.includes(normalizeTag(tag));
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTagSelection(tag)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] transition ${
                        active
                          ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <Tag className="h-3.5 w-3.5" /> {tag}
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-white/50">
                  Follow tags from posts to see them here and narrow your resonance feed.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <header className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              <span>Trending now</span>
              <BookmarkPlus className="h-4 w-4 text-sky-300" />
            </header>
            <div className="mt-3 flex flex-wrap gap-2">
              {trendingFiltered.length > 0 ? (
                trendingFiltered.map((meta) => (
                  <div
                    key={meta.id}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTagSelection(meta.label)}
                      className="flex items-center gap-2 text-white/70 transition hover:text-white"
                    >
                      <Tag className="h-3.5 w-3.5" /> {meta.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFollow(meta.label)}
                      className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20"
                    >
                      Follow
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/50">
                  Resonance tags will appear here as the collective publishes more.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {displayedFeed.length > 0 ? (
          displayedFeed.map((entry) => (
            <AgoraPostCard
              key={entry.post.post_id}
              entry={entry}
              currentUserId={currentUser?.id ?? ''}
              userVector={userVector}
              transparencyEnabled={transparencyEnabled}
              onTagSelect={handleToggleTagSelection}
              onToggleFollowTag={handleToggleFollow}
              isTagFollowed={isTagFollowed}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-sm text-white/60">
            No posts yet. Share something new or widen your curiosity.
          </div>
        )}
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
      </div>
    </section>
  );
}
