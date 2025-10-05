import { useMemo, useState } from 'react';
import {
  NotebookPen,
  Lock,
  Save,
  RefreshCcw,
  Tag,
  Radar,
  Sparkles,
  ShieldCheck,
  Clock3,
} from 'lucide-react';
import { useUserStore } from '../../store/userStore';

interface SavedLog {
  id: string;
  content: string;
  timestamp: number;
  tag: 'Priority' | 'Beacon' | 'Harmony';
}

const tags: SavedLog['tag'][] = ['Priority', 'Beacon', 'Harmony'];

const anomalyEvents = [
  {
    id: 'anom-1',
    label: 'Signal Drift',
    status: 'Neutral',
    description: 'Trace drift detected on auxiliary band. Monitoring.',
  },
  {
    id: 'anom-2',
    label: 'Presence Echo',
    status: 'Cleared',
    description: 'Echo resolved after synchronization cycle.',
  },
  {
    id: 'anom-3',
    label: 'Vault Access',
    status: 'Flagged',
    description: 'New key request pending cryptographic approval.',
  },
];

export function FieldNotesPanel() {
  const [draft, setDraft] = useState('');
  const [selectedTag, setSelectedTag] = useState<SavedLog['tag']>('Priority');
  const [savedLogs, setSavedLogs] = useState<SavedLog[]>([
    {
      id: '1',
      content: 'Awaiting decoded intel from Node Sigma. Maintain passive watch.',
      timestamp: Date.now() - 1000 * 60 * 12,
      tag: 'Beacon',
    },
    {
      id: '2',
      content: 'Authorize sync capsule for Ops team. Request new clearance tokens.',
      timestamp: Date.now() - 1000 * 60 * 45,
      tag: 'Priority',
    },
  ]);

  const users = useUserStore((state) => state.users);
  const onlineCount = useMemo(() => users.filter((user) => user.online).length, [users]);
  const offlineCount = users.length - onlineCount;

  const handleSave = () => {
    if (!draft.trim()) return;

    setSavedLogs((prev) => [
      {
        id: Date.now().toString(),
        content: draft.trim(),
        timestamp: Date.now(),
        tag: selectedTag,
      },
      ...prev,
    ]);
    setDraft('');
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.round(minutes / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  };

  return (
    <aside className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_70px_-40px_rgba(59,130,246,0.6)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Signal Anomalies</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Analytic Dashboard</h3>
          </div>
          <Radar className="h-6 w-6 text-sky-300" />
        </div>

        <div className="mt-6 space-y-4">
          {anomalyEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
            >
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>{event.label}</span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] ${
                    event.status === 'Flagged'
                      ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                      : event.status === 'Neutral'
                      ? 'border-sky-400/40 bg-sky-500/10 text-sky-200'
                      : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                  }`}
                >
                  {event.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-white/50">{event.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 text-xs text-white/50">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-300" /> Integrity Vector
            </span>
            <span className="text-emerald-300">99.2%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-300" /> Presence Locked
            </span>
            <span>{onlineCount} online · {offlineCount} standby</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-white/40" /> Next Sweep
            </span>
            <span>14m</span>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_70px_-40px_rgba(236,72,153,0.5)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Field Notes</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Tactical Annotations</h3>
          </div>
          <Lock className="h-5 w-5 text-emerald-300" />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Secure Notepad</span>
            <NotebookPen className="h-4 w-4 text-sky-300" />
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Compose encrypted field note..."
            className="h-32 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-white/40" />
              <div className="flex gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] transition ${
                      selectedTag === tag
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setDraft('')}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:border-white/30 hover:bg-white/20"
              >
                Clear
              </button>
              <button
                onClick={handleSave}
                className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-500/20"
              >
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" /> Save Log
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Saved Logs</span>
            <RefreshCcw className="h-4 w-4 text-white/40" />
          </div>
          <div className="mt-4 space-y-3">
            {savedLogs.length > 0 ? (
              savedLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                    <span>{formatTime(log.timestamp)}</span>
                    <span
                      className={`rounded-full border px-3 py-1 ${
                        log.tag === 'Priority'
                          ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                          : log.tag === 'Beacon'
                          ? 'border-sky-400/40 bg-sky-500/10 text-sky-200'
                          : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                      }`}
                    >
                      {log.tag}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-white/70">{log.content}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
                No saved logs yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </aside>
  );
}
