import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AlexandriaAttachmentType = 'image' | 'video' | 'file';

export interface AlexandriaTab {
  id: string;
  title: string;
  url: string;
  isPrivate: boolean;
  shieldsUp: boolean;
  trustedKeywords: string[];
  createdAt: number;
  lastUpdated: number;
  lastQuery?: string;
}

export interface AlexandriaBookmark {
  id: string;
  title: string;
  url: string;
  createdAt: number;
}

export interface AlexandriaDownload {
  id: string;
  name: string;
  type: AlexandriaAttachmentType;
  size: number;
  mimeType: string;
  encryptedData: string;
  iv: string;
  timestamp: number;
  source: string;
}

export interface AlexandriaTabInit {
  url?: string;
  title?: string;
  isPrivate?: boolean;
  shieldsUp?: boolean;
  trustedKeywords?: string[];
}

interface BrowserState {
  tabsByUser: Record<string, AlexandriaTab[]>;
  activeTabByUser: Record<string, string | null>;
  bookmarksByUser: Record<string, AlexandriaBookmark[]>;
  downloadsByUser: Record<string, AlexandriaDownload[]>;
  openTab: (userId: string, tabData?: AlexandriaTabInit) => AlexandriaTab;
  closeTab: (userId: string, tabId: string) => void;
  setActiveTab: (userId: string, tabId: string | null) => void;
  updateTab: (userId: string, tabId: string, updates: Partial<Omit<AlexandriaTab, 'id' | 'createdAt'>>) => void;
  togglePrivate: (userId: string, tabId: string) => void;
  addBookmark: (userId: string, bookmark: { title: string; url: string }) => void;
  removeBookmark: (userId: string, bookmarkId: string) => void;
  logDownload: (
    userId: string,
    download: {
      name: string;
      type: AlexandriaAttachmentType;
      size: number;
      mimeType: string;
      encryptedData: string;
      iv: string;
      source: string;
    }
  ) => void;
}

const createTab = (tabData: AlexandriaTabInit | undefined): Omit<AlexandriaTab, 'id'> => {
  const timestamp = Date.now();
  return {
    title: tabData?.title ?? 'New Tab',
    url: tabData?.url ?? 'about:blank',
    isPrivate: tabData?.isPrivate ?? false,
    shieldsUp: tabData?.shieldsUp ?? true,
    trustedKeywords: tabData?.trustedKeywords ?? [],
    createdAt: timestamp,
    lastUpdated: timestamp,
    lastQuery: undefined,
  };
};

export const useAlexandriaStore = create<BrowserState>()(
  persist(
    (set, get) => ({
      tabsByUser: {},
      activeTabByUser: {},
      bookmarksByUser: {},
      downloadsByUser: {},

      openTab: (userId, tabData) => {
        const id = `tab_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const nextTab: AlexandriaTab = {
          id,
          ...createTab(tabData ?? {}),
        };

        set((state) => {
          const existingTabs = state.tabsByUser[userId] ?? [];
          return {
            tabsByUser: {
              ...state.tabsByUser,
              [userId]: [...existingTabs, nextTab],
            },
            activeTabByUser: {
              ...state.activeTabByUser,
              [userId]: nextTab.id,
            },
          };
        });

        return nextTab;
      },

      closeTab: (userId, tabId) => {
        set((state) => {
          const existingTabs = state.tabsByUser[userId] ?? [];
          const filtered = existingTabs.filter((tab) => tab.id !== tabId);
          const activeId = state.activeTabByUser[userId];
          const nextActive = activeId === tabId ? filtered[filtered.length - 1]?.id ?? null : activeId ?? null;

          return {
            tabsByUser: {
              ...state.tabsByUser,
              [userId]: filtered,
            },
            activeTabByUser: {
              ...state.activeTabByUser,
              [userId]: nextActive,
            },
          };
        });
      },

      setActiveTab: (userId, tabId) => {
        set((state) => ({
          activeTabByUser: {
            ...state.activeTabByUser,
            [userId]: tabId,
          },
        }));
      },

      updateTab: (userId, tabId, updates) => {
        set((state) => {
          const existingTabs = state.tabsByUser[userId] ?? [];
          const updatedTabs = existingTabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  ...updates,
                  lastUpdated: Date.now(),
                }
              : tab
          );

          return {
            tabsByUser: {
              ...state.tabsByUser,
              [userId]: updatedTabs,
            },
          };
        });
      },

      togglePrivate: (userId, tabId) => {
        const { tabsByUser } = get();
        const target = tabsByUser[userId]?.find((tab) => tab.id === tabId);
        if (!target) return;
        get().updateTab(userId, tabId, { isPrivate: !target.isPrivate });
      },

      addBookmark: (userId, bookmark) => {
        set((state) => {
          const existing = state.bookmarksByUser[userId] ?? [];
          if (existing.some((item) => item.url === bookmark.url)) {
            return state;
          }

          const nextBookmark: AlexandriaBookmark = {
            id: `bookmark_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            title: bookmark.title || bookmark.url,
            url: bookmark.url,
            createdAt: Date.now(),
          };

          return {
            bookmarksByUser: {
              ...state.bookmarksByUser,
              [userId]: [...existing, nextBookmark],
            },
          };
        });
      },

      removeBookmark: (userId, bookmarkId) => {
        set((state) => {
          const existing = state.bookmarksByUser[userId] ?? [];
          return {
            bookmarksByUser: {
              ...state.bookmarksByUser,
              [userId]: existing.filter((item) => item.id !== bookmarkId),
            },
          };
        });
      },

      logDownload: (userId, download) => {
        const nextDownload: AlexandriaDownload = {
          id: `download_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          timestamp: Date.now(),
          ...download,
        };

        set((state) => {
          const existing = state.downloadsByUser[userId] ?? [];
          return {
            downloadsByUser: {
              ...state.downloadsByUser,
              [userId]: [nextDownload, ...existing].slice(0, 20),
            },
          };
        });
      },
    }),
    {
      name: 'enclypse-alexandria-store',
      version: 1,
    }
  )
);
