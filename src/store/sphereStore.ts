import { create } from 'zustand';

type Vec3Tuple = [number, number, number];

interface SphereState {
  isFullscreen: boolean;
  highlightedUserId: string | null;
  focusLockUserId: string | null;
  nodePositions: Record<string, Vec3Tuple>;
  nodeRegistrationCounts: Record<string, number>;
  focusError: string | null;
  setFullscreen: (isFullscreen: boolean) => void;
  focusUser: (userId: string | null) => void;
  setFocusLockUser: (userId: string | null) => void;
  registerNodePosition: (userId: string, position: Vec3Tuple) => void;
  unregisterNodePosition: (userId: string) => void;
  setFocusError: (message: string | null) => void;
  clearFocusState: () => void;
}

export const useSphereStore = create<SphereState>((set) => ({
  isFullscreen: false,
  highlightedUserId: null,
  focusLockUserId: null,
  nodePositions: {},
  nodeRegistrationCounts: {},
  focusError: null,
  setFullscreen: (isFullscreen) =>
    set((state) => ({
      isFullscreen,
      ...(isFullscreen
        ? {}
        : {
            highlightedUserId: null,
            focusLockUserId: null,
            focusError: null,
            nodePositions: state.nodePositions,
          }),
    })),
  focusUser: (userId) =>
    set((state) => ({
      highlightedUserId: userId,
      focusLockUserId: null,
      focusError: userId ? null : state.focusError,
    })),
  setFocusLockUser: (userId) =>
    set({
      focusLockUserId: userId,
    }),
  registerNodePosition: (userId, position) =>
    set((state) => ({
      nodePositions: {
        ...state.nodePositions,
        [userId]: position,
      },
      nodeRegistrationCounts: {
        ...state.nodeRegistrationCounts,
        [userId]: (state.nodeRegistrationCounts[userId] ?? 0) + 1,
      },
      focusError:
        state.highlightedUserId === userId ? null : state.focusError,
    })),
  unregisterNodePosition: (userId) =>
    set((state) => {
      const currentCount = state.nodeRegistrationCounts[userId] ?? 0;

      if (currentCount <= 1) {
        const { [userId]: _removedPosition, ...remainingPositions } =
          state.nodePositions;
        const { [userId]: _removedCount, ...remainingCounts } =
          state.nodeRegistrationCounts;
        const shouldClearHighlight = state.highlightedUserId === userId;

        return {
          nodePositions: remainingPositions,
          nodeRegistrationCounts: remainingCounts,
          highlightedUserId: shouldClearHighlight
            ? null
            : state.highlightedUserId,
          focusError: shouldClearHighlight
            ? 'Node signal lost. Returning to network view.'
            : state.focusError,
        };
      }

      return {
        nodeRegistrationCounts: {
          ...state.nodeRegistrationCounts,
          [userId]: currentCount - 1,
        },
      };
    }),
  setFocusError: (message) => set({ focusError: message }),
  clearFocusState: () =>
    set((state) => ({
      highlightedUserId: null,
      focusLockUserId: null,
      focusError: null,
      nodePositions: state.nodePositions,
      nodeRegistrationCounts: state.nodeRegistrationCounts,
    })),
}));
