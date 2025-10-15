import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo } from 'react';
import { X, Activity } from 'lucide-react';
import { useModalStore } from '../../store/modalStore';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useAuthStore } from '../../store/authStore';
import { useFriendStore } from '../../store/friendStore';
import { useReelsStore } from '../../store/reelsStore';
import { ReelFeedPanel } from './ReelFeedPanel';
import { ReelComposerPanel } from './ReelComposerPanel';

export function ReelsOverlay() {
  const isOpen = useModalStore((state) => state.isReelsOverlayOpen);
  const setIsOpen = useModalStore((state) => state.setReelsOverlayOpen);
  const currentUser = useAuthStore((state) => state.user);
  const nsfwOptIn = useAuthStore((state) => state.user?.contentPreferences.nsfw ?? false);
  const friendRequests = useFriendStore((state) => state.friendRequests);
  const getMetricsForUser = useReelsStore((state) => state.getMetricsForUser);
  const setActiveReel = useReelsStore((state) => state.setActiveReel);
  const reelsState = useReelsStore((state) => state.reels);

  useEscapeKey(() => setIsOpen(false), isOpen);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const followIds = useMemo(() => {
    if (!currentUser) {
      return [] as string[];
    }
    return friendRequests
      .filter(
        (request) =>
          request.status === 'accepted' &&
          (request.fromUserId === currentUser.id || request.toUserId === currentUser.id)
      )
      .map((request) => (request.fromUserId === currentUser.id ? request.toUserId : request.fromUserId));
  }, [currentUser, friendRequests]);

  const metrics = useMemo(() => {
    if (!currentUser) {
      return null;
    }
    return getMetricsForUser(currentUser.id);
  }, [currentUser, getMetricsForUser, reelsState]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const handleFocusTopReel = useCallback(() => {
    if (metrics?.topReelId) {
      setActiveReel(metrics.topReelId);
    }
  }, [metrics?.topReelId, setActiveReel]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[640] flex items-center justify-center bg-slate-950/90 p-8 backdrop-blur-2xl"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Harmonia Reels"
    >
      <div
        className="relative flex h-full w-full max-w-7xl flex-col gap-6 overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 p-6 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Short-form signal exchange</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Harmonia Reels</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Compose, publish, and explore short-form transmissions from across the mesh. Swipe or tap through the feed while
              tracking resonance analytics in real time.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-white/15 bg-white/10 p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
            aria-label="Close Harmonia Reels"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <ReelFeedPanel
            currentUserId={currentUser?.id ?? null}
            currentUserName={currentUser?.name ?? null}
            currentUserColor={currentUser?.color ?? null}
            followIds={followIds}
            includeNsfw={nsfwOptIn}
          />
          <div className="flex h-full flex-col gap-6">
            <ReelComposerPanel
              currentUserId={currentUser?.id ?? null}
              currentUserName={currentUser?.name ?? null}
              currentUserColor={currentUser?.color ?? null}
            />
            <section className="ui-panel ui-panel--muted flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Analytics</p>
                  <h3 className="text-lg font-semibold text-white">Resonance impact</h3>
                </div>
                <Activity className="h-5 w-5 text-emerald-300" />
              </div>
              {metrics ? (
                <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total reels</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{metrics.totalReels}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Lifetime views</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{metrics.views}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Likes</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{metrics.likes}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Comments</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{metrics.comments}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Shares</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{metrics.shares}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Remixes</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{metrics.remixes}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Avg. watch-through</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {(metrics.averageWatchThrough * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Updated</p>
                    <p className="mt-2 text-xs text-white/70">{new Date(metrics.lastUpdated).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/60">
                  Publish your first reel to activate analytics.
                </p>
              )}
              {metrics?.topReelId && (
                <button
                  type="button"
                  onClick={handleFocusTopReel}
                  className="ui-button ui-button--primary mt-2"
                >
                  Jump to top reel
                </button>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
