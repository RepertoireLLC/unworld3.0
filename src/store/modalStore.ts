import { create } from 'zustand';

interface ModalState {
  profileUserId: string | null;
  setProfileUserId: (userId: string | null) => void;
  isAIIntegrationOpen: boolean;
  setAIIntegrationOpen: (isOpen: boolean) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  profileUserId: null,
  setProfileUserId: (userId) => set({ profileUserId: userId }),
  isAIIntegrationOpen: false,
  setAIIntegrationOpen: (isOpen) => set({ isAIIntegrationOpen: isOpen }),
}));