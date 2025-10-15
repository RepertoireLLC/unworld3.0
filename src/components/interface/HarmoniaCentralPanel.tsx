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
  const [ensureTab, activeWorkspaceTabId, openThreadTab, setWorkspaceActiveTab, workspaceTabs] =
    useWorkspaceStore((state) => [
      state.ensureTab,
      state.activeTabId,
      state.openThreadTab,
      state.setActiveTab,
      state.tabs,
    ]);

  const workspaceActiveTab = useMemo(
    () => workspaceTabs.find((tab) => tab.id === activeWorkspaceTabId),
    [workspaceTabs, activeWorkspaceTabId]
  );

  const syncSourceRef = useRef<'workspace' | 'agora' | null>(null);
  const previousActiveTabRef = useRef(activeTab);
  const previousWorkspaceTabIdRef = useRef(activeWorkspaceTabId);

  useEffect(() => {
    if (previousActiveTabRef.current !== activeTab) {
      previousActiveTabRef.current = activeTab;
      syncSourceRef.current = 'agora';
    }
  }, [activeTab]);

  useEffect(() => {
    if (previousWorkspaceTabIdRef.current !== activeWorkspaceTabId) {
      previousWorkspaceTabIdRef.current = activeWorkspaceTabId;
      syncSourceRef.current = syncSourceRef.current === 'agora' ? null : 'workspace';
    }
  }, [activeWorkspaceTabId]);

  useEffect(() => {
    ensureTab({ id: 'broadcast', title: 'Quantum Broadcast', type: 'broadcast', closable: false });
    ensureTab({ id: 'agora', title: 'Harmonia Agora', type: 'agora', closable: false });
  }, [ensureTab]);

  useEffect(() => {
    if (!workspaceActiveTab) {
      syncSourceRef.current = null;
      return;
    }
    if (workspaceActiveTab.id !== 'broadcast' && workspaceActiveTab.id !== 'agora') {
      syncSourceRef.current = null;
      return;
    }
    if (workspaceActiveTab.id === activeTab) {
      syncSourceRef.current = null;
      return;
    }
    if (syncSourceRef.current === 'agora') {
      syncSourceRef.current = null;
      return;
    }
    syncSourceRef.current = 'workspace';
    setActiveTab(workspaceActiveTab.id);
  }, [workspaceActiveTab, activeTab, setActiveTab]);

  useEffect(() => {
    if (!workspaceTabs.some((tab) => tab.id === activeTab)) {
      return;
    }
    if (workspaceActiveTab?.id === activeTab) {
      syncSourceRef.current = null;
      return;
    }
    if (syncSourceRef.current === 'workspace') {
      syncSourceRef.current = null;
      return;
    }
    syncSourceRef.current = 'agora';
    setWorkspaceActiveTab(activeTab);
  }, [activeTab, workspaceActiveTab?.id, workspaceTabs, setWorkspaceActiveTab]);

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
    <div className="ui-stack h-full">
      {workspaceTabs.length > 0 && <WorkspaceTabs />}
      <div className="ui-panel ui-panel--muted flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/60">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`ui-button flex-1 min-w-[180px] justify-between ${
                isActive ? 'ui-button--primary text-emerald-100' : ''
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
        <div className="ui-chip ml-auto hidden items-center gap-2 text-[11px] lg:flex">
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
