import { create } from 'zustand';

export type WorkspaceTabType =
  | 'broadcast'
  | 'agora'
  | 'thread'
  | 'profile'
  | 'media';

export interface WorkspaceTab {
  id: string;
  title: string;
  type: WorkspaceTabType;
  closable: boolean;
  createdAt: number;
  data?: Record<string, unknown>;
}

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeTabId: string;
  ensureTab: (tab: Omit<WorkspaceTab, 'createdAt'>) => void;
  setActiveTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  openThreadTab: (input: { postId: string; title: string }) => WorkspaceTab;
  getActiveTab: () => WorkspaceTab | undefined;
}

function createTab(tab: Omit<WorkspaceTab, 'createdAt'>): WorkspaceTab {
  return { ...tab, createdAt: Date.now() };
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  tabs: [],
  activeTabId: '',
  ensureTab: (tab) => {
    set((state) => {
      const existing = state.tabs.find((entry) => entry.id === tab.id);
      if (existing) {
        return state.activeTabId ? {} : { activeTabId: existing.id };
      }
      const nextTab = createTab(tab);
      const tabs = [...state.tabs, nextTab];
      return {
        tabs,
        activeTabId: state.activeTabId || nextTab.id,
      };
    });
  },
  setActiveTab: (tabId) => {
    const { tabs } = get();
    if (tabs.some((tab) => tab.id === tabId)) {
      set({ activeTabId: tabId });
    }
  },
  closeTab: (tabId) => {
    set((state) => {
      const tab = state.tabs.find((item) => item.id === tabId);
      if (!tab || !tab.closable) {
        return {};
      }
      const remaining = state.tabs.filter((item) => item.id !== tabId);
      let nextActiveId = state.activeTabId;
      if (state.activeTabId === tabId) {
        const sorted = remaining.slice().sort((a, b) => b.createdAt - a.createdAt);
        const fallback = sorted.find((item) => !item.closable) ?? sorted[0];
        nextActiveId = fallback?.id ?? '';
      }
      return {
        tabs: remaining,
        activeTabId: nextActiveId,
      };
    });
  },
  openThreadTab: ({ postId, title }) => {
    const tabId = `thread:${postId}`;
    const existing = get().tabs.find((tab) => tab.id === tabId);
    if (existing) {
      get().setActiveTab(existing.id);
      return existing;
    }
    const tab: WorkspaceTab = {
      id: tabId,
      title,
      type: 'thread',
      closable: true,
      createdAt: Date.now(),
      data: { postId },
    };
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
    return tab;
  },
  getActiveTab: () => get().tabs.find((tab) => tab.id === get().activeTabId),
}));
