import { useAgoraStore } from '../../store/agoraStore';
import { useEffect, useMemo, useCallback, useRef } from 'react';
import { BroadcastPanel } from './BroadcastPanel';
import { HarmoniaAgoraPanel } from '../agora/HarmoniaAgoraPanel';
import { RadioTower, Atom, Users } from 'lucide-react';
import { WorkspaceTabs } from './WorkspaceTabs';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ForumThreadPanel } from '../forum/ForumThreadPanel';

const tabs = [
  {
    id: 'broadcast' as const,
    label: 'Quantum Broadcast',
    description: 'Maintain encrypted one-to-one relays.',
    icon: RadioTower,
  },
  {
    id: 'agora' as const,
    label: 'Harmonia Agora',
    description: 'Explore resonant public transmissions.',
    icon: Atom,
  },
];

export function HarmoniaCentralPanel() {
  const { activeTab, setActiveTab } = useAgoraStore();
  const [ensureTab, workspaceActiveTab, openThreadTab, setWorkspaceActiveTab, workspaceTabs] = useWorkspaceStore((state) => [
    state.ensureTab,
    state.getActiveTab(),
    state.openThreadTab,
    state.setActiveTab,
    state.tabs,
  ]);
  const workspaceActiveTabId = workspaceActiveTab?.id;
  const activeSyncSource = useRef<'workspace' | 'agora' | null>(null);

  useEffect(() => {
    ensureTab({ id: 'broadcast', title: 'Quantum Broadcast', type: 'broadcast', closable: false });
    ensureTab({ id: 'agora', title: 'Harmonia Agora', type: 'agora', closable: false });
  }, [ensureTab]);

  useEffect(() => {
    if (!workspaceActiveTabId) {
      return;
    }
    if (activeSyncSource.current === 'agora') {
      activeSyncSource.current = null;
      return;
    }
    if (workspaceActiveTabId === 'broadcast' && activeTab !== 'broadcast') {
      activeSyncSource.current = 'workspace';
      setActiveTab('broadcast');
    }
    if (workspaceActiveTabId === 'agora' && activeTab !== 'agora') {
      activeSyncSource.current = 'workspace';
      setActiveTab('agora');
    }
  }, [workspaceActiveTabId, activeTab, setActiveTab]);

  useEffect(() => {
    if (activeSyncSource.current === 'workspace') {
      activeSyncSource.current = null;
      return;
    }
    if (activeTab === 'broadcast' && workspaceActiveTabId !== 'broadcast') {
      activeSyncSource.current = 'agora';
      setWorkspaceActiveTab('broadcast');
    }
    if (activeTab === 'agora' && workspaceActiveTabId !== 'agora') {
      activeSyncSource.current = 'agora';
      setWorkspaceActiveTab('agora');
    }
  }, [activeTab, workspaceActiveTabId, setWorkspaceActiveTab]);

  const handleOpenThread = useCallback(
    (postId: string, title: string) => {
      openThreadTab({ postId, title });
    },
    [openThreadTab]
  );

  const content = useMemo(() => {
    if (!workspaceActiveTab) {
      return null;
    }
    if (workspaceActiveTab.id === 'broadcast') {
      return <BroadcastPanel />;
    }
    if (workspaceActiveTab.id === 'agora') {
      return <HarmoniaAgoraPanel onOpenThread={handleOpenThread} />;
    }
    if (workspaceActiveTab.type === 'thread') {
      const postId = workspaceActiveTab.data?.postId;
      if (typeof postId === 'string') {
        return <ForumThreadPanel postId={postId} />;
      }
    }
    return null;
  }, [workspaceActiveTab, handleOpenThread]);

  return (
    <div className="flex h-full flex-col gap-4">
      {workspaceTabs.length > 0 && <WorkspaceTabs />}
      <div className="theme-surface flex flex-wrap items-center gap-2 rounded-3xl p-3 text-xs uppercase tracking-[0.3em] text-white/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                activeSyncSource.current = 'agora';
                setActiveTab(tab.id);
              }}
              className={`flex flex-1 min-w-[180px] items-center justify-between gap-2 rounded-2xl px-4 py-3 transition ${
                isActive
                  ? 'border border-emerald-400/60 bg-emerald-500/10 text-emerald-200 shadow-[0_10px_30px_-20px_rgba(16,185,129,0.8)]'
                  : 'theme-chip text-white/60 hover:bg-white/20'
              }`}
            >
              <div className="flex flex-col text-left">
                <span>{tab.label}</span>
                <span className="text-[10px] uppercase tracking-[0.35em] text-white/40">
                  {tab.description}
                </span>
              </div>
              <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-300' : 'text-white/40'}`} />
            </button>
          );
        })}
        <div className="theme-chip ml-auto hidden items-center gap-2 rounded-2xl px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white/60 lg:flex">
          <Users className="h-4 w-4" />
          Agora Linked
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full overflow-hidden">
          {content}
        </div>
      </div>
    </div>
  );
}
