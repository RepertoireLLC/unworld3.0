import { create } from 'zustand';
import { LayerVisibilityMap, VisibilityLayer, defaultLayerVisibility } from '../types/visibility';

interface LayerState {
  activeLayers: LayerVisibilityMap;
  toggleLayer: (layer: VisibilityLayer) => void;
  setLayers: (layers: LayerVisibilityMap) => void;
  reset: () => void;
}

export const useLayerStore = create<LayerState>((set) => ({
  activeLayers: {
    ...defaultLayerVisibility(),
    public: true,
  },

  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [layer]: !state.activeLayers[layer],
      },
    })),

  setLayers: (layers) => set({ activeLayers: layers }),

  reset: () =>
    set({
      activeLayers: {
        ...defaultLayerVisibility(),
        public: true,
      },
    }),
}));
