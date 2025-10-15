import {
  Heart,
  MessageCircle,
  Share2,
  Repeat,
  Volume2,
  VolumeX,
  Play,
  Pause,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import type { ReelRecord } from '../../types/reels';
import { useReelsStore } from '../../store/reelsStore';
import { useToastStore } from '../../store/toastStore';
import { resolveAudioTrackUrl } from './reelAudioLibrary';
import { clamp } from '../../utils/vector';

const FILTER_CLASS_MAP: Record<string, string> = {
  none: '',
  noir: 'filter grayscale contrast-125 brightness-95',
  solstice: 'filter saturate-125 hue-rotate-15',
  lumen: 'filter brightness-110 saturate-110',
  pulse: 'filter contrast-125 saturate-130',
  spectra: 'filter hue-rotate-45 saturate-140',
};

interface ReelCardProps {
  reel: ReelRecord;
  isActive: boolean;
  currentUserId: string | null;
  currentUserName: string | null;
  currentUserColor?: string | null;
  onRequestNext: () => void;
  onRequestPrev: () => void;
}

export function ReelCard({
  reel,
  isActive,
  currentUserId,
  currentUserName,
  currentUserColor,
  onRequestNext,
  onRequestPrev,
}: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [comment, setComment] = useState('');
  const [lastTap, setLastTap] = useState<number | null>(null);
  const toggleLike = useReelsStore((state) => state.toggleLike);
  const addComment = useReelsStore((state) => state.addComment);
  const recordView = useReelsStore((state) => state.recordView);
  const shareReel = useReelsStore((state) => state.shareReel);
  const remixReel = useReelsStore((state) => state.remixReel);
  const addToast = useToastStore((state) => state.addToast);

  const filterClass = FILTER_CLASS_MAP[reel.media.filter] ?? '';
  const optimizedSource = useMemo(() => reel.media.optimized[1] ?? reel.media.optimized[0], [reel.media.optimized]);
  const audioUrl = resolveAudioTrackUrl(reel.media.audioTrackId);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === containerRef.current) {
            setIsVisible(entry.isIntersecting);
          }
        });
      },
      { threshold: 0.35 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isActive || !isVisible || !videoRef.current) {
      return;
    }
    const video = videoRef.current;
    video.currentTime = reel.media.trim.start;
    const handleTimeUpdate = () => {
      if (video.currentTime >= reel.media.trim.end) {
        video.currentTime = reel.media.trim.start;
        if (!video.paused) {
          void video.play();
        }
      }
    };
    video.addEventListener('timeupdate', handleTimeUpdate);
    const playPromise = video.play();
    if (playPromise) {
      void playPromise.catch(() => {
        setIsMuted(true);
        setIsPlaying(false);
      });
    }
    setIsPlaying(true);
    const watchThrough = reel.media.duration > 0
      ? (reel.media.trim.end - reel.media.trim.start) / reel.media.duration
      : 1;
    recordView(reel.id, currentUserId ?? null, watchThrough);
    return () => {
      video.pause();
      video.removeEventListener('timeupdate', handleTimeUpdate);
      setIsPlaying(false);
    };
  }, [isActive, isVisible, recordView, reel, currentUserId]);

  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio || !video) {
      return;
    }
    if (!isActive || !isVisible) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }
    const sync = () => {
      if (Math.abs(audio.currentTime - video.currentTime) > 0.4) {
        audio.currentTime = video.currentTime;
      }
    };
    const handlePlay = () => {
      void audio.play().catch(() => {
        setIsMuted(true);
      });
      setIsPlaying(true);
    };
    const handlePause = () => {
      audio.pause();
      setIsPlaying(false);
    };
    const handleVolume = () => {
      audio.muted = isMuted;
    };
    const interval = window.setInterval(sync, 1500);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolume);
    return () => {
      window.clearInterval(interval);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolume);
    };
  }, [isActive, isMuted, isVisible]);

  useEffect(() => {
    if (!showHeart) {
      return;
    }
    const timer = window.setTimeout(() => setShowHeart(false), 600);
    return () => window.clearTimeout(timer);
  }, [showHeart]);

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((previous) => {
      const next = !previous;
      const audio = audioRef.current;
      const video = videoRef.current;
      if (audio) {
        audio.muted = next;
      }
      if (video) {
        video.muted = next;
      }
      return next;
    });
  }, []);

  const handleLike = useCallback(() => {
    if (!currentUserId || !currentUserName) {
      addToast({
        title: 'Sign in required',
        description: 'Authenticate to interact with Harmonia Reels.',
        variant: 'warning',
      });
      return;
    }
    toggleLike(reel.id, currentUserId, currentUserName);
    setShowHeart(true);
  }, [addToast, currentUserId, currentUserName, reel.id, toggleLike]);

  const handleCommentSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!currentUserId || !currentUserName) {
        addToast({
          title: 'Sign in required',
          description: 'Authenticate to comment on Harmonia Reels.',
          variant: 'warning',
        });
        return;
      }
      const trimmed = comment.trim();
      if (!trimmed) {
        return;
      }
      const result = addComment(reel.id, {
        userId: currentUserId,
        displayName: currentUserName,
        content: trimmed,
      });
      if (result.success) {
        setComment('');
      } else {
        addToast({
          title: 'Unable to post comment',
          description: result.message ?? 'Check your connection and retry.',
          variant: 'error',
        });
      }
    },
    [addComment, addToast, comment, currentUserId, currentUserName, reel.id]
  );

  const handleShare = useCallback(() => {
    if (!currentUserId) {
      addToast({
        title: 'Sign in required',
        description: 'Authenticate to share Harmonia Reels.',
        variant: 'warning',
      });
      return;
    }
    shareReel(reel.id, currentUserId, { channel: 'mesh' });
    addToast({
      title: 'Reel signal shared',
      description: 'Broadcast queued across your trusted mesh.',
      variant: 'success',
    });
  }, [addToast, currentUserId, reel.id, shareReel]);

  const handleRemix = useCallback(() => {
    if (!currentUserId || !currentUserName) {
      addToast({
        title: 'Sign in required',
        description: 'Authenticate to remix Harmonia Reels.',
        variant: 'warning',
      });
      return;
    }
    const result = remixReel(
      {
        id: currentUserId,
        name: currentUserName,
        color: currentUserColor ?? '#7f5af0',
      },
      reel.id
    );
    if (result.success) {
      addToast({
        title: 'Remix launched',
        description: 'Clone loaded into your composer. Tailor and publish when ready.',
        variant: 'info',
      });
    } else {
      addToast({
        title: 'Remix unavailable',
        description: result.message ?? 'The source reel cannot be remixed right now.',
        variant: 'error',
      });
    }
  }, [addToast, currentUserId, currentUserName, reel.id, remixReel]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const startY = event.clientY;
    const handlePointerUp = (upEvent: PointerEvent) => {
      const delta = upEvent.clientY - startY;
      if (delta > 80) {
        onRequestPrev();
      } else if (delta < -80) {
        onRequestNext();
      }
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointerup', handlePointerUp);
  }, [onRequestNext, onRequestPrev]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (lastTap && now - lastTap < 300) {
      handleLike();
    }
    setLastTap(now);
  }, [handleLike, lastTap]);

  const auraStyle = useMemo(() => {
    const glow = Math.min(1.2, Math.max(0.1, reel.resonance.auraStrength));
    return {
      boxShadow: `0 0 ${40 * glow}px ${20 * glow}px rgba(99, 102, 241, ${0.25 + glow * 0.3})`,
    } as CSSProperties;
  }, [reel.resonance.auraStrength]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onClick={handleDoubleTap}
      className={`relative flex h-full w-full flex-col justify-end overflow-hidden rounded-[32px] border border-white/10 bg-black/50 transition ${
        isActive ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-60'
      }`}
      style={auraStyle}
    >
      {optimizedSource && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover ${filterClass}`}
          src={isVisible ? optimizedSource.url : undefined}
          muted={isMuted}
          playsInline
          loop
          preload="metadata"
          poster={reel.media.previewImage}
        />
      )}
      {audioUrl && <audio ref={audioRef} src={audioUrl} loop muted={isMuted} />}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent)]"
          style={{ opacity: clamp(reel.resonance.auraStrength, 0.15, 0.45) }}
        />
      </div>

      <div className="relative z-10 flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: reel.creatorAvatarColor }}
          >
            {reel.creatorName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">{reel.creatorName}</span>
            <span className="text-xs uppercase tracking-[0.3em] text-white/60">{reel.nodeAddress}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-base font-medium text-white">{reel.caption}</p>
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em] text-white/50">
            {reel.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-white/15 px-3 py-1 text-[10px]">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-white/70">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleTogglePlay();
            }}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em]"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleToggleMute();
            }}
            className="rounded-full bg-white/10 p-2"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <div className="ml-auto flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-white/60">
            <span>{reel.metrics.views} Views</span>
            <span>{reel.metrics.likes} Likes</span>
            <span>{reel.metrics.comments} Comments</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleLike();
            }}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <Heart className={`h-4 w-4 ${reel.metrics.likedBy.includes(currentUserId ?? '') ? 'fill-rose-400 text-rose-300' : 'text-white'}`} />
            React
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleShare();
            }}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleRemix();
            }}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <Repeat className="h-4 w-4" /> Remix
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
            <MessageCircle className="h-4 w-4" />
            Resonant Replies
          </div>
          <div className="space-y-3">
            {reel.comments.slice(-3).map((entry) => (
              <div key={entry.id} className="rounded-xl bg-white/5 p-3 text-sm text-white/80">
                <span className="font-semibold text-white">{entry.displayName}</span>
                <p className="text-xs text-white/60">{new Date(entry.createdAt).toLocaleString()}</p>
                <p className="mt-1 text-sm text-white/80">{entry.content}</p>
              </div>
            ))}
            {reel.comments.length === 0 && (
              <p className="text-xs text-white/50">Be the first to respond and shift the resonance.</p>
            )}
          </div>
          <form onSubmit={handleCommentSubmit} className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Transmit a ripple…"
              className="flex-1 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:bg-white/30"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {showHeart && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Heart className="h-24 w-24 animate-ping text-rose-300" />
        </div>
      )}
    </div>
  );
}
