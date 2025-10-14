import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useForumStore, FeedEntry } from '../../store/forumStore';
import { useInterestStore } from '../../store/interestStore';
import { useAgoraStore } from '../../store/agoraStore';
import { buildInterestVectorFromTags, InterestVector, normalizeVector } from '../../utils/vector';
import { AgoraPostCard } from './AgoraPostCard';
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
} from 'lucide-react';

const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Public', description: 'Shared with the collective agora.' },
  { id: 'friends', label: 'Friends', description: 'Visible to aligned operators.' },
  { id: 'private', label: 'Private', description: 'Only you can view this signal.' },
] as const;

type VisibilityOption = (typeof VISIBILITY_OPTIONS)[number]['id'];

function tokenizeTags(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function HarmoniaAgoraPanel() {
  const currentUser = useAuthStore((state) => state.user);
  const [posts, postOrder] = useForumStore((state) => [state.posts, state.postOrder]);
  const getFeedForUser = useForumStore((state) => state.getFeedForUser);
  const addPost = useForumStore((state) => state.addPost);
  const profiles = useInterestStore((state) => state.profiles);
  const getInterestVector = useInterestStore((state) => state.getInterestVector);
  const ensureInterestProfile = useInterestStore((state) => state.ensureProfile);

  const {
    activeTab,
    feedMode,
    setFeedMode,
    transparencyEnabled,
    setTransparencyEnabled,
    curiosityRatio,
    setCuriosityRatio,
  } = useAgoraStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagWeights, setTagWeights] = useState<Record<string, number>>({});
  const [visibility, setVisibility] = useState<VisibilityOption>('public');
  const [mediaUrl, setMediaUrl] = useState<string | undefined>();
  const [mediaPreview, setMediaPreview] = useState<string | undefined>();
  const [isPublishing, setIsPublishing] = useState(false);

  const [visibleCount, setVisibleCount] = useState(6);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentUser) {
      ensureInterestProfile(currentUser.id);
    }
  }, [currentUser, ensureInterestProfile]);

  useEffect(() => {
    setVisibleCount(6);
  }, [feedMode, curiosityRatio, postOrder.length]);

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

  const displayedFeed = feed.slice(0, visibleCount);

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
    const newTags = tokenizeTags(incoming).filter((tag) => !tags.includes(tag));
    if (newTags.length === 0) {
      return;
    }
    setTags((existing) => [...existing, ...newTags]);
    setTagWeights((existing) => ({
      ...existing,
      ...Object.fromEntries(newTags.map((tag) => [tag, 0.6])),
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

  if (activeTab !== 'agora') {
    return null;
  }

  return (
    <section className="flex h-full flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
        <span className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">
          <Orbit className="h-4 w-4" /> Harmonia Agora
        </span>
        <span className="flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-sky-200">
          <Radio className="h-4 w-4" /> Resonant Feed
        </span>
        <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-white/60">
          <Globe2 className="h-4 w-4" /> Curiosity {(curiosityRatio * 100).toFixed(0)}%
        </span>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Compose Transmission</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Project a Signal into the Agora</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Draft a transparent capsule. Tag your fields of interest and tune the resonance before sharing it with the network.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/60">
            Visibility: {visibility}
          </span>
        </header>

        <div className="mt-6 space-y-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Signal Title"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
          />

          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Describe your insight, discovery, or question..."
            className="h-32 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
          />

          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">Interest Tags</label>
            <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
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
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/60"
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
                    <span className="text-[11px] text-white/40">{Math.round((tagWeights[tag] ?? 0.6) * 100)}%</span>
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
                      className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-white/50 hover:bg-white/20"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {tags.length === 0 && (
                  <p className="text-xs text-white/40">
                    Use Enter or commas to add tags. These calibrate your post's interest vector.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
                <Upload className="h-4 w-4" /> Attach Media
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/60">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/20">
                  <ImageIcon className="h-4 w-4" />
                  Image Upload
                  <input type="file" accept="image/*,video/mp4" className="hidden" onChange={handleFileUpload} />
                </label>
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
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
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-white/60 hover:bg-white/20"
                  >
                    Clear Media
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Visibility</p>
              <div className="mt-3 space-y-2">
                {VISIBILITY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setVisibility(option.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      visibility === option.id
                        ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{option.label}</span>
                      {visibility === option.id && <Aperture className="h-4 w-4 text-emerald-300" />}
                    </div>
                    <p className="mt-1 text-xs text-white/50">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(mediaPreview || mediaUrl) && (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
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
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                Vector Strength {Math.round(Object.values(composerVector).reduce((sum, value) => sum + value, 0) * 100)}%
              </span>
              <span className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-300" />
                Resonance Ready
              </span>
            </div>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish}
              className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
            >
              <Wand2 className="h-4 w-4" />
              Launch Signal
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.3em] text-white/50">
        <div className="flex flex-wrap items-center gap-2">
          {(['resonant', 'exploratory', 'all'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFeedMode(mode)}
              className={`rounded-full border px-4 py-1.5 transition ${
                feedMode === mode
                  ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                  : 'border-white/10 bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {mode === 'resonant' && 'Resonant Mode'}
              {mode === 'exploratory' && 'Exploratory Mode'}
              {mode === 'all' && 'All Signals'}
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
          </label>
          <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-white/60">
            <Eye className="h-4 w-4" />
            Transparency
            <input
              type="checkbox"
              checked={transparencyEnabled}
              onChange={(event) => setTransparencyEnabled(event.target.checked)}
              className="ml-2 h-4 w-4 accent-emerald-400"
            />
          </label>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        {displayedFeed.length > 0 ? (
          displayedFeed.map((entry) => (
            <AgoraPostCard
              key={entry.post.post_id}
              entry={entry}
              currentUserId={currentUser?.id ?? ''}
              userVector={userVector}
              transparencyEnabled={transparencyEnabled}
            />
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-sm text-white/60">
            No signals yet. Publish a transmission or expand your curiosity threshold.
          </div>
        )}
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
      </div>
    </section>
  );
}
