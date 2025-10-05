import { create } from 'zustand';

export type WorkspaceView = 'dashboard' | 'commerce' | 'registry';

interface NavigationState {
  activeView: WorkspaceView;
  setActiveView: (view: WorkspaceView) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),
}));
