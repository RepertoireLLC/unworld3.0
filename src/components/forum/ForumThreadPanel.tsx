import { useMemo, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useForumStore } from '../../store/forumStore';
import { useInterestStore } from '../../store/interestStore';

interface ForumThreadPanelProps {
  postId: string;
}

export function ForumThreadPanel({ postId }: ForumThreadPanelProps) {
  const post = useForumStore((state) => state.posts[postId]);
  const getCommentsForPost = useForumStore((state) => state.getCommentsForPost);
  const addComment = useForumStore((state) => state.addComment);
  const recordEngagement = useForumStore((state) => state.recordEngagement);
  const getInterestVector = useInterestStore((state) => state.getInterestVector);
  const currentUser = useAuthStore((state) => state.user);
  const [draft, setDraft] = useState('');

  const comments = useMemo(() => getCommentsForPost(postId), [getCommentsForPost, postId]);

  if (!post) {
    return (
      <section className="theme-surface flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
        <h2 className="text-lg font-semibold">Thread unavailable</h2>
        <p className="mt-2 text-sm text-white/60">
          The requested post could not be located or has been marked private.
        </p>
      </section>
    );
  }

  const handleSubmit = () => {
    if (!draft.trim() || !currentUser) {
      return;
    }
    const vector = getInterestVector(currentUser.id, { applyDecay: true });
    addComment({
      postId,
      authorId: currentUser.id,
      body: draft.trim(),
      interestVector: vector,
    });
    recordEngagement(postId, currentUser.id, 'comment');
    setDraft('');
  };

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)]">
      <header className="border-b border-white/10 bg-white/5 px-6 py-5">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Forum Thread</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{post.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">{post.body}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-emerald-200"
            >
              #{tag}
            </span>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {comments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-white/60">
            <MessageCircle className="h-8 w-8 text-white/30" />
            <p>No replies yet. Share the first signal.</p>
          </div>
        ) : (
          <ol className="space-y-4">
            {comments.map((comment) => (
              <li
                key={comment.comment_id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
                  <span>{new Date(comment.timestamp).toLocaleString()}</span>
                  <span>Resonance {(comment.engagement_score * 100).toFixed(0)}%</span>
                </div>
                <p className="mt-3 leading-relaxed text-white/80">{comment.body}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {currentUser && (
        <form
          className="border-t border-white/10 bg-white/5 px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <label className="text-xs uppercase tracking-[0.3em] text-white/50">
            Reply to thread
          </label>
          <div className="mt-3 flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="Transmit an encrypted reply..."
              className="h-24 flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
            />
            <button
              type="submit"
              className="flex h-12 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-500/20"
            >
              <Send className="mr-2 h-4 w-4" />
              Send
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
