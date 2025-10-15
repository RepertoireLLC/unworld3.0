import { useMemo } from 'react';
import { X } from 'lucide-react';
import { useWorkspaceStore, type WorkspaceTab } from '../../store/workspaceStore';

export function WorkspaceTabs() {
  const [tabs, activeTabId, setActiveTab, closeTab] = useWorkspaceStore((state) => [
    state.tabs,
    state.activeTabId,
    state.setActiveTab,
    state.closeTab,
  ]);

  const sortedTabs = useMemo(() => {
    const baseTabIds = new Set(['broadcast', 'agora']);
    return [...tabs]
      .filter((tab) => !baseTabIds.has(tab.id))
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [tabs]);

  if (sortedTabs.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 overflow-x-auto pb-2">
      {sortedTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div key={tab.id} className="flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`ui-button whitespace-nowrap ${
                isActive ? 'ui-button--primary text-emerald-100' : ''
              }`}
            >
              <span className="max-w-[160px] truncate">{tab.title}</span>
              {tab.closable && (
                <span className={`ui-chip px-2 py-1 ${isActive ? 'text-emerald-100' : 'text-white/60'}`}>Live</span>
              )}
            </button>
            {tab.closable && (
              <button
                type="button"
                onClick={() => closeTab(tab.id)}
                className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/60 transition hover:bg-rose-500/20 hover:text-rose-100"
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
