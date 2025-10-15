import { useMemo } from 'react';
import { X } from 'lucide-react';
import { useWorkspaceStore, type WorkspaceTab } from '../../store/workspaceStore';

function getTabClass(tab: WorkspaceTab, isActive: boolean) {
  const base = 'group relative flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs uppercase tracking-[0.3em] transition';
  if (isActive) {
    return `${base} border-emerald-400/60 bg-emerald-500/10 text-emerald-200 shadow-[0_10px_30px_-20px_rgba(16,185,129,0.8)]`;
  }
  return `${base} border-white/10 bg-white/5 text-white/60 hover:bg-white/10`;
}

export function WorkspaceTabs() {
  const [tabs, activeTabId, setActiveTab, closeTab] = useWorkspaceStore((state) => [
    state.tabs,
    state.activeTabId,
    state.setActiveTab,
    state.closeTab,
  ]);

  const sortedTabs = useMemo(
    () => [...tabs].sort((a, b) => a.createdAt - b.createdAt),
    [tabs]
  );

  const closableTabs = useMemo(
    () => sortedTabs.filter((tab) => tab.closable),
    [sortedTabs]
  );

  if (closableTabs.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 overflow-x-auto pb-2">
      {closableTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div key={tab.id} className="flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={getTabClass(tab, isActive)}
            >
              <span className="max-w-[160px] truncate">{tab.title}</span>
              {tab.closable && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] ${
                    isActive ? 'border-emerald-400/30 text-emerald-200' : 'border-white/10 text-white/50'
                  }`}
                >
                  Live
                </span>
              )}
            </button>
            {tab.closable && (
              <button
                type="button"
                onClick={() => closeTab(tab.id)}
                className="ml-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-rose-500/20 hover:text-rose-100"
                aria-label={`Close ${tab.title}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
