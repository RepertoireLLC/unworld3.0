import { useMemo, useState } from 'react';
import { LifeBuoy, MessageCircle, Search, Send } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';

interface SupportSettingsProps {
  isActive: boolean;
}

type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  tags: string[];
};

const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'account-reset',
    question: 'How do I reactivate my Harmonia account after deactivation?',
    answer:
      'Simply log back in with your credentials. Harmonia rehydrates your node, restores encrypted vaults, and re-links trusted peers instantly.',
    tags: ['account', 'reactivate', 'deactivate'],
  },
  {
    id: 'nsfw-calibration',
    question: 'What changes when I enable NSFW transmissions?',
    answer:
      'Your Agora feed, resonance recommendations, and Quantum Broadcast prompts can include mature-tagged media. You can toggle this anytime and we never expose your preference.',
    tags: ['content', 'nsfw', 'feeds'],
  },
  {
    id: 'mesh-trust',
    question: 'Are Harmonia mesh connections always encrypted?',
    answer:
      'Yes. Discovery controls only adjust who can see you. Every channel remains end-to-end encrypted with rotating keys tied to your device vault.',
    tags: ['mesh', 'privacy', 'encryption'],
  },
  {
    id: 'support-response',
    question: 'How quickly does support respond to contact requests?',
    answer:
      'Support pings are routed directly to our guardians. Expect acknowledgement within one business day and full resolution within 72 hours.',
    tags: ['support', 'response time'],
  },
];

export function SupportSettings({ isActive: _isActive }: SupportSettingsProps) {
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const [query, setQuery] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');

  const filteredFaq = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return FAQ_ENTRIES;
    }
    return FAQ_ENTRIES.filter((entry) => {
      return (
        entry.question.toLowerCase().includes(trimmed) ||
        entry.answer.toLowerCase().includes(trimmed) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(trimmed))
      );
    });
  }, [query]);

  const toggleFaq = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!message.trim()) {
      addToast({
        title: 'Message required',
        variant: 'error',
        description: 'Share a few details so our team can help quickly.',
      });
      return;
    }

    const composedSubject = subject.trim() || 'Harmonia Support Request';
    const composedBody = `From: ${email || user?.email || 'unknown'}\n\n${message.trim()}`;
    const mailtoUrl = `mailto:matthew.denton222@gmail.com?subject=${encodeURIComponent(composedSubject)}&body=${encodeURIComponent(composedBody)}`;

    if (typeof window !== 'undefined') {
      window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
    }

    addToast({
      title: 'Support ping sent',
      variant: 'success',
      description: 'Our guardians have received your message and will reach back shortly.',
    });

    setMessage('');
    setSubject('');
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Help Center</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Searchable Q&A</h3>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
            <LifeBuoy className="h-4 w-4 text-emerald-300" />
            Knowledge Base
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              placeholder="Search help topics"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3 pl-12 pr-4 text-sm text-white focus:border-white/30 focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            {filteredFaq.map((entry) => {
              const isOpen = openItems.has(entry.id);
              return (
                <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-950/60">
                  <button
                    type="button"
                    onClick={() => toggleFaq(entry.id)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm text-white transition hover:bg-white/5"
                  >
                    <span className="font-medium">{entry.question}</span>
                    <span className="text-xs uppercase tracking-[0.3em] text-white/40">{isOpen ? 'Hide' : 'Expand'}</span>
                  </button>
                  {isOpen && (
                    <div className="space-y-2 border-t border-white/5 px-5 py-4 text-sm text-white/70">
                      <p>{entry.answer}</p>
                      <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.3em] text-white/40">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-white/10 px-3 py-1">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredFaq.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
                No answers yet. Reach out below and we&apos;ll craft a solution with you.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Direct line</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Contact Support</h3>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
            <MessageCircle className="h-4 w-4 text-emerald-300" />
            Live Relay
          </span>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">Reply Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@harmonia"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Brief headline"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">Message</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe what&apos;s happening and how we can help."
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/60 bg-emerald-500/10 px-5 py-3 text-xs uppercase tracking-[0.3em] text-emerald-100 transition hover:bg-emerald-500/20"
          >
            Send message
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  );
}
