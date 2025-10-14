import { create } from 'zustand';
import { FeedMode } from './forumStore';

type AgoraTab = 'broadcast' | 'agora' | 'forum' | 'reels';

interface AgoraState {
  activeTab: AgoraTab;
  setActiveTab: (tab: AgoraTab) => void;
  feedMode: FeedMode;
  setFeedMode: (mode: FeedMode) => void;
  transparencyEnabled: boolean;
  setTransparencyEnabled: (value: boolean) => void;
  curiosityRatio: number;
  setCuriosityRatio: (ratio: number) => void;
}

export const useAgoraStore = create<AgoraState>((set) => ({
  activeTab: 'broadcast',
  feedMode: 'resonant',
  transparencyEnabled: false,
  curiosityRatio: 0.2,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setFeedMode: (mode) => set({ feedMode: mode }),
  setTransparencyEnabled: (value) => set({ transparencyEnabled: value }),
  setCuriosityRatio: (ratio) => set({ curiosityRatio: Math.min(Math.max(ratio, 0.05), 0.5) }),
}));
