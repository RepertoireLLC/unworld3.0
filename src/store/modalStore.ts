import { create } from 'zustand';

interface ModalState {
  profileUserId: string | null;
  setProfileUserId: (userId: string | null) => void;
  isAIIntegrationOpen: boolean;
  setAIIntegrationOpen: (isOpen: boolean) => void;
  isSettingsOpen: boolean;
  setSettingsOpen: (isOpen: boolean) => void;
  settingsActiveSection: 'account' | 'content' | 'plugins' | 'privacy' | 'support';
  setSettingsActiveSection: (section: 'account' | 'content' | 'plugins' | 'privacy' | 'support') => void;
}

export const useModalStore = create<ModalState>((set) => ({
  profileUserId: null,
  setProfileUserId: (userId) => set({ profileUserId: userId }),
  isAIIntegrationOpen: false,
  setAIIntegrationOpen: (isOpen) => set({ isAIIntegrationOpen: isOpen }),
  isSettingsOpen: false,
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  settingsActiveSection: 'account',
  setSettingsActiveSection: (section) => set({ settingsActiveSection: section }),
}));