import { useEffect, useMemo, useRef, useState } from 'react';
import { FeedEntry, ForumComment, ForumPost } from '../../store/forumStore';
import { useForumStore } from '../../store/forumStore';
import { InterestVector } from '../../utils/vector';
import {
  Heart,
  MessageCircle,
  Sparkles,
  Compass,
  Telescope,
  Play,
  Layers,
} from 'lucide-react';

interface AgoraPostCardProps {
  entry: FeedEntry;
  currentUserId: string;
  userVector: InterestVector;
  transparencyEnabled: boolean;
}

const LABEL_STYLES: Record<FeedEntry['label'], string> = {
  Resonant: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  Neutral: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  Exploratory: 'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200',
};

function classNames(
  ...tokens: Array<string | false | null | undefined>
): string {
  return tokens.filter(Boolean).join(' ');
}

function computeMatches(userVector: InterestVector, post: ForumPost) {
  const matches = Object.keys(post.interest_vector)
    .map((topic) => {
      const postValue = post.interest_vector[topic];
      const userValue = userVector[topic] ?? 0;
      return {
        topic,
        resonance: userValue * postValue,
        userValue,
        postValue,
      };
    })
    .filter((entry) => entry.resonance > 0)
    .sort((a, b) => b.resonance - a.resonance)
    .slice(0, 4);

  const total = matches.reduce((sum, match) => sum + match.resonance, 0);
  return { matches, total };
}

function renderMedia(post: ForumPost) {
  if (post.mediaType === 'image' && post.media_url) {
    return (
      <img
        src={post.media_url}
        alt={post.title}
        className="max-h-64 w-full rounded-2xl object-cover"
      />
    );
  }
  if (post.mediaType === 'video' && post.media_url) {
    if (post.media_url.includes('youtube.com') || post.media_url.includes('youtu.be')) {
      const videoIdMatch = post.media_url.match(/(?:v=|be\/)([\w-]+)/);
      const videoId = videoIdMatch?.[1];
      if (videoId) {
        return (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 pt-[56.25%]">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={post.title}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
    }
    return (
      <video
        src={post.media_url}
        controls
        className="max-h-64 w-full rounded-2xl border border-white/10 bg-black/40"
      />
    );
  }
  return null;
}

export function AgoraPostCard({
  entry,
  currentUserId,
  userVector,
  transparencyEnabled,
}: AgoraPostCardProps) {
  const recordEngagement = useForumStore((state) => state.recordEngagement);
  const addComment = useForumStore((state) => state.addComment);
  const comments = useForumStore((state) => state.getCommentsForPost(entry.post.post_id));

  const [commentDraft, setCommentDraft] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasRegisteredView = useRef(false);

  useEffect(() => {
    if (!cardRef.current) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((item) => item.isIntersecting);
        if (visible && !hasRegisteredView.current) {
          hasRegisteredView.current = true;
          recordEngagement(entry.post.post_id, currentUserId, 'view');
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [recordEngagement, entry.post.post_id, currentUserId]);

  const { matches, total } = useMemo(
    () => computeMatches(userVector, entry.post),
    [userVector, entry.post]
  );

  const labelStyle = LABEL_STYLES[entry.label];

  const handleLike = () => {
    recordEngagement(entry.post.post_id, currentUserId, 'like');
  };

  const handleSubmitComment = () => {
    if (!commentDraft.trim()) {
      return;
    }
    addComment({
      postId: entry.post.post_id,
      authorId: currentUserId,
      body: commentDraft.trim(),
    });
    setCommentDraft('');
    setIsExpanded(true);
    recordEngagement(entry.post.post_id, currentUserId, 'comment');
  };

  return (
    <article
      ref={cardRef}
      className={classNames(
        'relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 transition-all duration-500',
        entry.curiosityBoosted
          ? 'shadow-[0_0_40px_-20px_rgba(236,72,153,0.6)]'
          : 'shadow-[0_20px_60px_-30px_rgba(15,23,42,0.9)]'
      )}
    >
      <div className="pointer-events-none absolute -top-40 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      {transparencyEnabled && total > 0 && (
        <div className="pointer-events-none absolute inset-0 opacity-70">
          {matches.map((match, index) => (
            <div
              key={match.topic}
              className="absolute rounded-full"
              style={{
                left: `${15 + index * 15}%`,
                top: `${20 + index * 10}%`,
                width: `${40 + match.resonance * 120}px`,
                height: `${40 + match.resonance * 120}px`,
                boxShadow: `0 0 30px ${match.resonance * 120}px rgba(56,189,248,0.2)` ,
                border: '1px solid rgba(56,189,248,0.25)',
              }}
            />
          ))}
        </div>
      )}

      <header className="relative z-10 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
        <span className={classNames('rounded-full border px-3 py-1', labelStyle)}>
          {entry.label}
        </span>
        {entry.curiosityBoosted && (
          <span className="flex items-center gap-2 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 text-fuchsia-200">
            <Compass className="h-3.5 w-3.5" />
            Exploratory Boost
          </span>
        )}
        <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">
          {new Date(entry.post.timestamp).toLocaleString()}
        </span>
      </header>

      <div className="relative z-10 mt-4 space-y-4">
        <div>
          <h3 className="text-2xl font-semibold text-white">{entry.post.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{entry.post.body}</p>
        </div>

        {renderMedia(entry.post)}

        <div className="flex flex-wrap items-center gap-2">
          {entry.post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/60"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-white/50">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            Resonance {(entry.similarity * 100).toFixed(0)}%
          </span>
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-300" />
            Engagement {entry.post.engagement_score.toFixed(1)}
          </span>
        </div>

        {transparencyEnabled && matches.length > 0 && (
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4 text-xs text-white/70">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-cyan-200">
              <Telescope className="h-4 w-4" /> Resonance Transparency
            </p>
            <ul className="mt-2 space-y-1">
              {matches.map((match) => (
                <li key={match.topic} className="flex items-center justify-between">
                  <span className="capitalize text-white/80">{match.topic}</span>
                  <span className="flex items-center gap-2 text-white/60">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em]">
                      {(match.postValue * 100).toFixed(0)}%
                    </span>
                    ↔
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em]">
                      {(match.userValue * 100).toFixed(0)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
          <button
            type="button"
            onClick={handleLike}
            className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-emerald-200 transition hover:bg-emerald-500/20"
          >
            <Heart className="h-4 w-4" />
            Resonant Echo
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sky-200 transition hover:bg-sky-500/20"
          >
            <MessageCircle className="h-4 w-4" />
            Thread {comments.length}
          </button>
          {entry.post.mediaType === 'video' && (
            <span className="flex items-center gap-2 rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10 px-4 py-2 text-fuchsia-200">
              <Play className="h-4 w-4" /> Video Capsule
            </span>
          )}
        </div>

        {isExpanded && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <textarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="Add a harmonic response..."
                className="h-24 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  Broadcast Comment
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {comments.length > 0 ? (
                comments.map((comment: ForumComment) => (
                  <div
                    key={comment.comment_id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/50">
                      <span>Signal {comment.comment_id.slice(-4)}</span>
                      <span>{new Date(comment.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-white/70">{comment.body}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-xs text-white/50">
                  No responses yet. Initiate the first thread.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
