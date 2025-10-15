import { create } from 'zustand';

type SettingsSection = 'account' | 'content' | 'privacy' | 'support' | 'theme';

interface ModalState {
  profileUserId: string | null;
  setProfileUserId: (userId: string | null) => void;
  isAIIntegrationOpen: boolean;
  setAIIntegrationOpen: (isOpen: boolean) => void;
  isSettingsOpen: boolean;
  setSettingsOpen: (isOpen: boolean) => void;
  settingsActiveSection: SettingsSection;
  setSettingsActiveSection: (section: SettingsSection) => void;
  isChessOverlayOpen: boolean;
  setChessOverlayOpen: (isOpen: boolean) => void;
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
  isChessOverlayOpen: false,
  setChessOverlayOpen: (isOpen) => set({ isChessOverlayOpen: isOpen }),
}));