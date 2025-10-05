import { create } from 'zustand';

type ProfileModalMode = 'view' | 'edit';

interface ProfileModalState {
  userId: string;
  mode: ProfileModalMode;
}

interface ModalState {
  profileModal: ProfileModalState | null;
  openProfileModal: (userId: string, mode?: ProfileModalMode) => void;
  closeProfileModal: () => void;
  setProfileModalMode: (mode: ProfileModalMode) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  profileModal: null,
  openProfileModal: (userId, mode = 'view') =>
    set({ profileModal: { userId, mode } }),
  closeProfileModal: () => set({ profileModal: null }),
  setProfileModalMode: (mode) =>
    set((state) =>
      state.profileModal
        ? { profileModal: { ...state.profileModal, mode } }
        : state
    ),
}));

export type { ProfileModalMode, ProfileModalState };