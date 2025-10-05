import { create } from 'zustand';

export type LayerId = 'presence' | 'broadcasts' | 'notes' | 'media';

export interface Layer {
  id: LayerId;
  name: string;
  description: string;
}

interface LayerState {
  layers: Layer[];
  activeLayerIds: LayerId[];
  toggleLayer: (layerId: LayerId) => void;
  setLayerActive: (layerId: LayerId, active: boolean) => void;
  isLayerActive: (layerId: LayerId) => boolean;
}

const DEFAULT_LAYERS: Layer[] = [
  {
    id: 'presence',
    name: 'Presence Mesh',
    description: 'Operator visibility, status, and spatial overlays.',
  },
  {
    id: 'broadcasts',
    name: 'Broadcast Relays',
    description: 'Secure message feeds and live channel telemetry.',
  },
  {
    id: 'notes',
    name: 'Field Notes',
    description: 'Mission annotations and logged directives.',
  },
  {
    id: 'media',
    name: 'Media Vault',
    description: 'Stories, imagery, and shared intelligence captures.',
  },
];

export const useLayerStore = create<LayerState>((set, get) => ({
  layers: DEFAULT_LAYERS,
  activeLayerIds: DEFAULT_LAYERS.map((layer) => layer.id),

  toggleLayer: (layerId) => {
    const { activeLayerIds } = get();
    const isActive = activeLayerIds.includes(layerId);
    const nextActive = isActive
      ? activeLayerIds.filter((id) => id !== layerId)
      : [...activeLayerIds, layerId];

    set({ activeLayerIds: nextActive });
  },

  setLayerActive: (layerId, active) => {
    const { activeLayerIds } = get();
    const hasLayer = activeLayerIds.includes(layerId);

    if (active && !hasLayer) {
      set({ activeLayerIds: [...activeLayerIds, layerId] });
      return;
    }

    if (!active && hasLayer) {
      set({ activeLayerIds: activeLayerIds.filter((id) => id !== layerId) });
    }
  },

  isLayerActive: (layerId) => get().activeLayerIds.includes(layerId),
}));
