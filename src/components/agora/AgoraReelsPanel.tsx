import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useForumStore, FeedEntry } from '../../store/forumStore';
import { useInterestStore } from '../../store/interestStore';
import { useAgoraStore } from '../../store/agoraStore';
import { InterestVector } from '../../utils/vector';
import { AgoraPostCard } from './AgoraPostCard';
import { PlayCircle, Radio, Shuffle, Eye, Waves } from 'lucide-react';
import { shallow } from 'zustand/shallow';

export function AgoraReelsPanel() {
  const currentUser = useAuthStore((state) => state.user);
  const [posts, postOrder] = useForumStore(
    (state) => [state.posts, state.postOrder],
    shallow
  );
  const getFeedForUser = useForumStore((state) => state.getFeedForUser);
  const profiles = useInterestStore((state) => state.profiles);
  const getInterestVector = useInterestStore((state) => state.getInterestVector);
  const ensureInterestProfile = useInterestStore((state) => state.ensureProfile);

  const feedMode = useAgoraStore((state) => state.feedMode);
  const setFeedMode = useAgoraStore((state) => state.setFeedMode);
  const transparencyEnabled = useAgoraStore((state) => state.transparencyEnabled);
  const setTransparencyEnabled = useAgoraStore((state) => state.setTransparencyEnabled);
  const curiosityRatio = useAgoraStore((state) => state.curiosityRatio);
  const setCuriosityRatio = useAgoraStore((state) => state.setCuriosityRatio);

  const [visibleCount, setVisibleCount] = useState(4);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentUser) {
      ensureInterestProfile(currentUser.id);
    }
  }, [currentUser, ensureInterestProfile]);

  useEffect(() => {
    setVisibleCount(4);
  }, [feedMode, curiosityRatio, postOrder.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + 2);
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
      limit: 90,
      curiosityRatio,
    }).filter((entry) => entry.post.mediaType === 'video');
  }, [currentUser, feedMode, getFeedForUser, curiosityRatio, posts, postOrder]);

  const displayedFeed = feed.slice(0, visibleCount);

  return (
    <section className="flex h-full flex-col gap-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-white">Resonant Reels</h2>
          <p className="text-sm text-white/60">
            Stream immersive video transmissions tuned to your present resonance field.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
          <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
            <PlayCircle className="h-4 w-4 text-emerald-300" /> Video channel aligned
          </span>
          <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
            <Radio className="h-4 w-4 text-sky-300" /> Feed mode: {feedMode}
          </span>
          <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
            <Waves className="h-4 w-4 text-white/60" /> Curiosity {(curiosityRatio * 100).toFixed(0)}%
          </span>
        </div>
      </header>

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
              {mode === 'resonant' && 'Resonant'}
              {mode === 'exploratory' && 'Exploratory'}
              {mode === 'all' && 'All signals'}
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

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
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
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-sm text-white/60">
            No video reels matched your resonance yet. Publish or adjust curiosity to invite new signals.
          </div>
        )}
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
      </div>
    </section>
  );
}
