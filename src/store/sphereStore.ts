import { create } from 'zustand';

interface SphereState {
  isFullscreen: boolean;
  highlightedUserId: string | null;
  focusError: string | null;
  setFullscreen: (isFullscreen: boolean) => void;
  focusUser: (userId: string | null) => void;
  setFocusError: (message: string | null) => void;
  clearFocusState: () => void;
}

export const useSphereStore = create<SphereState>((set) => ({
  isFullscreen: false,
  highlightedUserId: null,
  focusError: null,
  setFullscreen: (isFullscreen) =>
    set((state) => ({
      isFullscreen,
      ...(isFullscreen
        ? {}
        : {
            highlightedUserId: null,
            focusError: null,
          }),
    })),
  focusUser: (userId) =>
    set((state) => ({
      highlightedUserId: userId,
      focusError: userId ? null : state.focusError,
    })),
  setFocusError: (message) => set({ focusError: message }),
  clearFocusState: () =>
    set({
      highlightedUserId: null,
      focusError: null,
    })),
}));
