import { useMemo, useState } from 'react';
import { NotebookPen, Lock, Save, RefreshCcw, Tag, Power } from 'lucide-react';
import { useFieldNoteStore, FieldNoteTag } from '../../store/fieldNoteStore';
import { useLayerStore } from '../../store/layerStore';

const tags: FieldNoteTag[] = ['Priority', 'Beacon', 'Harmony'];

export function FieldNotesPanel() {
  const [draft, setDraft] = useState('');
  const [selectedTag, setSelectedTag] = useState<FieldNoteTag>('Priority');
  const notes = useFieldNoteStore((state) => state.notes);
  const addNote = useFieldNoteStore((state) => state.addNote);
  const isNotesLayerActive = useLayerStore((state) => state.isLayerActive('notes'));

  const savedLogs = useMemo(
    () => [...notes].sort((a, b) => b.timestamp - a.timestamp),
    [notes]
  );

  const handleSave = () => {
    if (!draft.trim() || !isNotesLayerActive) return;

    addNote(draft.trim(), selectedTag);
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
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Field Notes
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              Tactical Annotations
            </h3>
          </div>
          <Lock className="h-5 w-5 text-emerald-300" />
        </div>

        {!isNotesLayerActive && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
            <Power className="h-4 w-4 text-white/40" />
            Field Notes layer dormant. Reactivate to compose new intel logs.
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Secure Notepad</span>
            <NotebookPen className="h-4 w-4 text-sky-300" />
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Compose encrypted field note..."
            disabled={!isNotesLayerActive}
            className={`h-32 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none ${
              isNotesLayerActive ? '' : 'cursor-not-allowed opacity-60'
            }`}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-white/40" />
              <div className="flex gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    disabled={!isNotesLayerActive}
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] transition ${
                      selectedTag === tag && isNotesLayerActive
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                    } ${!isNotesLayerActive ? 'cursor-not-allowed opacity-50 hover:bg-white/5' : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setDraft('')}
                disabled={!isNotesLayerActive}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/30"
              >
                Clear
              </button>
              <button
                onClick={handleSave}
                disabled={!isNotesLayerActive || !draft.trim()}
                className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
              >
                <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Log</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)]">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
          <span>Saved Logs</span>
          <RefreshCcw className="h-4 w-4 text-white/40" />
        </div>
        <div className="mt-4 space-y-3">
          {isNotesLayerActive ? (
            savedLogs.length > 0 ? (
              savedLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
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
            )
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
              <div className="flex flex-col items-center gap-3">
                <Power className="h-5 w-5 text-white/40" />
                <p>Logs redacted while Field Notes layer is dormant.</p>
                <p className="text-xs text-white/40">Enable visibility to review historical intel.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
