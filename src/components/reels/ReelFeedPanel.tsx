import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useReelsStore } from '../../store/reelsStore';
import type { ReelRecord } from '../../types/reels';
import { ReelCard } from './ReelCard';

interface ReelFeedPanelProps {
  currentUserId: string | null;
  currentUserName: string | null;
  currentUserColor: string | null;
  followIds: string[];
  includeNsfw: boolean;
}

export function ReelFeedPanel({
  currentUserId,
  currentUserName,
  currentUserColor,
  followIds,
  includeNsfw,
}: ReelFeedPanelProps) {
  const getFeedForUser = useReelsStore((state) => state.getFeedForUser);
  const activeReelId = useReelsStore((state) => state.activeReelId);
  const setActiveReel = useReelsStore((state) => state.setActiveReel);
  const loadMoreFeed = useReelsStore((state) => state.loadMoreFeed);
  const reelsState = useReelsStore((state) => state.reels);
  const [visibleCount, setVisibleCount] = useState(6);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const feedOptions = useMemo(
    () => ({ userId: currentUserId, followIds, includeNsfw }),
    [currentUserId, followIds, includeNsfw]
  );

  const reels = useMemo<ReelRecord[]>(
    () => getFeedForUser(feedOptions).slice(0, visibleCount),
    [feedOptions, getFeedForUser, reelsState, visibleCount]
  );

  useEffect(() => {
    if (!activeReelId && reels.length > 0) {
      setActiveReel(reels[0].id);
    }
  }, [activeReelId, reels, setActiveReel]);

  useEffect(() => {
    if (reels.length < 4) {
      loadMoreFeed();
    }
  }, [loadMoreFeed, reels.length]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 160) {
      setVisibleCount((count) => count + 2);
      loadMoreFeed();
    }
  }, [loadMoreFeed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const navigate = useCallback(
    (direction: 'next' | 'prev') => {
      if (reels.length === 0) {
        return;
      }
      const index = reels.findIndex((entry) => entry.id === activeReelId);
      if (index === -1) {
        setActiveReel(reels[0].id);
        return;
      }
      const nextIndex = direction === 'next' ? index + 1 : index - 1;
      if (nextIndex < 0) {
        setActiveReel(reels[0].id);
        return;
      }
      if (nextIndex >= reels.length) {
        loadMoreFeed();
        if (reels[nextIndex]) {
          setActiveReel(reels[nextIndex].id);
        }
        return;
      }
      setActiveReel(reels[nextIndex].id);
      const container = containerRef.current;
      if (container) {
        const card = container.querySelector<HTMLDivElement>(`[data-reel-id="${reels[nextIndex].id}"]`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [activeReelId, loadMoreFeed, reels, setActiveReel]
  );

  return (
    <section className="ui-panel flex h-full flex-col gap-4 overflow-hidden">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Feed</p>
          <h2 className="text-xl font-semibold text-white">Resonant Reels</h2>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
          <button
            type="button"
            onClick={() => navigate('prev')}
            className="rounded-full border border-white/10 bg-white/5 p-2"
            aria-label="Previous reel"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('next')}
            className="rounded-full border border-white/10 bg-white/5 p-2"
            aria-label="Next reel"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={containerRef} className="flex-1 space-y-6 overflow-y-auto pr-2">
        {reels.map((reel) => (
          <div key={reel.id} data-reel-id={reel.id} className="h-[520px]">
            <ReelCard
              reel={reel}
              isActive={activeReelId === reel.id}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserColor={currentUserColor}
              onRequestNext={() => navigate('next')}
              onRequestPrev={() => navigate('prev')}
            />
          </div>
        ))}
        {reels.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-sm text-white/60">
            No reels available yet. Follow more operators or publish your first clip to populate the feed.
          </div>
        )}
      </div>
    </section>
  );
}
