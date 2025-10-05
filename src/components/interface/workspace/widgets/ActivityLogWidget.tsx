import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Filter, Trash2 } from 'lucide-react';
import { useActivityLogStore, ActivityStatus } from '../../../../store/activityLogStore';

interface WidgetProps {
  widgetId: string;
}

const statusStyles: Record<ActivityStatus, string> = {
  success: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  warning: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  error: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
};

const statusIcons: Record<ActivityStatus, JSX.Element> = {
  success: <CheckCircle2 className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  error: <AlertTriangle className="h-4 w-4" />,
};

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function ActivityLogWidget({ widgetId: _widgetId }: WidgetProps) {
  const entries = useActivityLogStore((state) => state.entries);
  const clearLog = useActivityLogStore((state) => state.clearLog);
  const [filter, setFilter] = useState<ActivityStatus | 'all'>('all');

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter((entry) => entry.status === filter);
  }, [entries, filter]);

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Audit Feed</p>
          <h4 className="text-lg font-semibold text-white">Activity & Permission Log</h4>
        </div>
        <button
          type="button"
          onClick={clearLog}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20"
        >
          <Trash2 className="h-4 w-4" /> Clear
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
        <Filter className="h-4 w-4 text-white/40" />
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as ActivityStatus | 'all')}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-white/30 focus:outline-none"
        >
          <option value="all">All Events</option>
          <option value="success">Success</option>
          <option value="warning">Warnings</option>
          <option value="error">Errors</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
            No events recorded yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredEntries.map((entry) => (
              <li
                key={entry.id}
                className={`rounded-2xl border px-4 py-3 text-sm ${statusStyles[entry.status]}`}
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em]">
                  <span className="flex items-center gap-2 text-white/70">
                    {statusIcons[entry.status]}
                    {entry.action.replaceAll('_', ' ')}
                  </span>
                  <span className="flex items-center gap-1 text-white/60">
                    <Clock3 className="h-4 w-4" />
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/80">{entry.message}</p>
                {entry.resourceId && (
                  <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-white/50">Resource: {entry.resourceId}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
