import { create } from 'zustand';

type Vec3Tuple = [number, number, number];

interface SphereState {
  isFullscreen: boolean;
  highlightedUserId: string | null;
  nodePositions: Record<string, Vec3Tuple>;
  focusError: string | null;
  setFullscreen: (isFullscreen: boolean) => void;
  focusUser: (userId: string | null) => void;
  registerNodePosition: (userId: string, position: Vec3Tuple) => void;
  unregisterNodePosition: (userId: string) => void;
  setFocusError: (message: string | null) => void;
  clearFocusState: () => void;
}

export const useSphereStore = create<SphereState>((set) => ({
  isFullscreen: false,
  highlightedUserId: null,
  nodePositions: {},
  focusError: null,
  setFullscreen: (isFullscreen) =>
    set((state) => ({
      isFullscreen,
      ...(isFullscreen
        ? {}
        : {
            highlightedUserId: null,
            focusError: null,
            nodePositions: state.nodePositions,
          }),
    })),
  focusUser: (userId) =>
    set((state) => ({
      highlightedUserId: userId,
      focusError: userId ? null : state.focusError,
    })),
  registerNodePosition: (userId, position) =>
    set((state) => ({
      nodePositions: {
        ...state.nodePositions,
        [userId]: position,
      },
      focusError:
        state.highlightedUserId === userId ? null : state.focusError,
    })),
  unregisterNodePosition: (userId) =>
    set((state) => {
      const { [userId]: _removed, ...remaining } = state.nodePositions;
      const shouldClearHighlight = state.highlightedUserId === userId;
      return {
        nodePositions: remaining,
        highlightedUserId: shouldClearHighlight ? null : state.highlightedUserId,
        focusError: shouldClearHighlight
          ? 'Node signal lost. Returning to network view.'
          : state.focusError,
      };
    }),
  setFocusError: (message) => set({ focusError: message }),
  clearFocusState: () =>
    set((state) => ({
      highlightedUserId: null,
      focusError: null,
      nodePositions: state.nodePositions,
    })),
}));
