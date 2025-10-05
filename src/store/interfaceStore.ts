import { create } from 'zustand';

interface InterfaceState {
  isSphereExpanded: boolean;
  setSphereExpanded: (expanded: boolean) => void;
  toggleSphereExpanded: () => void;
}

export const useInterfaceStore = create<InterfaceState>((set) => ({
  isSphereExpanded: false,
  setSphereExpanded: (expanded) => set({ isSphereExpanded: expanded }),
  toggleSphereExpanded: () =>
    set((state) => ({ isSphereExpanded: !state.isSphereExpanded })),
}));
