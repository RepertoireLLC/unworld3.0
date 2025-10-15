import { useState } from 'react';
import { NotebookPen, Lock, Save, RefreshCcw, Tag } from 'lucide-react';
import { ResonanceFieldPanel } from './ResonanceFieldPanel';

interface SavedLog {
  id: string;
  content: string;
  timestamp: number;
  tag: 'Priority' | 'Beacon' | 'Harmony';
}

const tags: SavedLog['tag'][] = ['Priority', 'Beacon', 'Harmony'];

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
    <aside className="ui-stack">
      <ResonanceFieldPanel />
      <section className="ui-panel">
        <div className="flex items-center justify-between">
          <div className="ui-stack gap-1">
            <span className="ui-section-label">Field Notes</span>
            <h3 className="text-lg font-semibold text-white">Tactical Annotations</h3>
          </div>
          <Lock className="h-5 w-5 text-emerald-300" />
        </div>

        <div className="ui-card gap-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
            <span>Secure Notepad</span>
            <NotebookPen className="h-4 w-4 text-sky-300" />
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Compose encrypted field note..."
            className="h-32 w-full resize-none rounded-[calc(var(--theme-radius)*0.55)] border border-white/12 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-white/40" />
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isActive = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`ui-button ${
                        isActive ? 'ui-button--primary text-emerald-100' : 'ui-button--ghost'
                      }`}
                      type="button"
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button onClick={() => setDraft('')} className="ui-button ui-button--ghost">
                Clear
              </button>
              <button onClick={handleSave} className="ui-button ui-button--primary">
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" /> Save Log
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="ui-panel">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
          <span>Saved Logs</span>
          <RefreshCcw className="h-4 w-4 text-white/40" />
        </div>
        <div className="ui-stack">
          {savedLogs.length > 0 ? (
            savedLogs.map((log) => (
              <div key={log.id} className="ui-card">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                  <span>{formatTime(log.timestamp)}</span>
                  <span
                    className={`ui-chip ${
                      log.tag === 'Priority'
                        ? 'border-rose-400/40 text-rose-200'
                        : log.tag === 'Beacon'
                        ? 'border-sky-400/40 text-sky-200'
                        : 'border-emerald-400/40 text-emerald-200'
                    }`}
                    style={{ backgroundColor: 'transparent' }}
                  >
                    {log.tag}
                  </span>
                </div>
                <p className="text-sm text-white/70">{log.content}</p>
              </div>
            ))
          ) : (
            <div className="ui-card text-center text-sm text-white/50">
              No saved logs yet.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
