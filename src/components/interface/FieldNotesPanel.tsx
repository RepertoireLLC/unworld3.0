import { useState } from 'react';
import { NotebookPen, Lock, Save, RefreshCcw, Tag } from 'lucide-react';
import { cn } from '../../utils/cn';

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
    <aside className="space-y-6">
      <section className="ds-panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] ds-text-subtle">
              Field Notes
            </p>
            <h3 className="mt-1 text-lg font-semibold ds-text-primary">
              Tactical Annotations
            </h3>
          </div>
          <Lock className="h-5 w-5 ds-text-positive" />
        </div>

        <div className="mt-5 rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-base)' }}>
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] ds-text-subtle">
            <span>Secure Notepad</span>
            <NotebookPen className="h-4 w-4 ds-text-info" />
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Compose encrypted field note..."
            className="ds-textarea h-32"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 ds-text-subtle" />
              <div className="flex gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={cn('ds-tag', selectedTag === tag ? '' : 'opacity-70 hover:opacity-100')}
                    data-variant={tag.toLowerCase()}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setDraft('')}
                className="ds-button ds-button-ghost px-4 py-2"
              >
                Clear
              </button>
              <button
                onClick={handleSave}
                className="ds-button ds-button-success px-4 py-2"
              >
                <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Log</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="ds-panel p-6">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] ds-text-subtle">
          <span>Saved Logs</span>
          <RefreshCcw className="h-4 w-4 ds-text-subtle" />
        </div>
        <div className="mt-4 space-y-3">
          {savedLogs.length > 0 ? (
            savedLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border px-4 py-4"
                style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-base)' }}
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] ds-text-subtle">
                  <span>{formatTime(log.timestamp)}</span>
                  <span className="ds-tag" data-variant={log.tag.toLowerCase()}>{log.tag}</span>
                </div>
                <p className="mt-3 text-sm ds-text-secondary">{log.content}</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border px-6 py-6 text-center text-sm ds-text-subtle" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-base)' }}>
              No saved logs yet.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
