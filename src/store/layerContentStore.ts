import { create } from 'zustand';
import type { Layer, PermissionContext } from '../utils/permissions';
import { filterItemsByLayerAccess } from '../utils/permissions';

export type LayerTag = 'Priority' | 'Beacon' | 'Harmony';

export interface LayeredLog {
  id: string;
  layer: Layer;
  tag: LayerTag;
  content: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export const TAG_TO_LAYER: Record<LayerTag, Layer> = {
  Priority: 'restricted',
  Beacon: 'trusted',
  Harmony: 'public',
};

const DEFAULT_LOGS: LayeredLog[] = [
  {
    id: '1',
    layer: TAG_TO_LAYER.Beacon,
    tag: 'Beacon',
    content: 'Awaiting decoded intel from Node Sigma. Maintain passive watch.',
    ownerId: 'system',
    createdAt: Date.now() - 1000 * 60 * 12,
    updatedAt: Date.now() - 1000 * 60 * 12,
  },
  {
    id: '2',
    layer: TAG_TO_LAYER.Priority,
    tag: 'Priority',
    content: 'Authorize sync capsule for Ops team. Request new clearance tokens.',
    ownerId: 'system',
    createdAt: Date.now() - 1000 * 60 * 45,
    updatedAt: Date.now() - 1000 * 60 * 45,
  },
];

interface LayerContentState {
  entries: LayeredLog[];
  createEntry: (input: {
    content: string;
    layer: Layer;
    tag: LayerTag;
    ownerId: string;
  }) => LayeredLog;
  updateEntry: (
    id: string,
    updates: Partial<Pick<LayeredLog, 'content' | 'layer' | 'tag'>>,
  ) => LayeredLog | null;
  deleteEntry: (id: string) => void;
  getEntriesByLayer: (layer: Layer) => LayeredLog[];
  getVisibleEntries: (layers: Layer[], context: PermissionContext) => LayeredLog[];
}

function sortByTimestamp(entries: LayeredLog[]): LayeredLog[] {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt);
}

export const useLayerContentStore = create<LayerContentState>((set, get) => ({
  entries: sortByTimestamp(DEFAULT_LOGS),
  createEntry: (input) => {
    const timestamp = Date.now();
    const entry: LayeredLog = {
      id: `log_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
      content: input.content,
      layer: input.layer,
      tag: input.tag,
      ownerId: input.ownerId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({ entries: sortByTimestamp([entry, ...state.entries]) }));
    return entry;
  },
  updateEntry: (id, updates) => {
    let updatedEntry: LayeredLog | null = null;
    set((state) => ({
      entries: sortByTimestamp(
        state.entries.map((entry) => {
          if (entry.id !== id) return entry;
          updatedEntry = {
            ...entry,
            ...updates,
            updatedAt: Date.now(),
          };
          return updatedEntry;
        }),
      ),
    }));
    return updatedEntry;
  },
  deleteEntry: (id) => {
    set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) }));
  },
  getEntriesByLayer: (layer) => {
    return get().entries.filter((entry) => entry.layer === layer);
  },
  getVisibleEntries: (layers, context) => {
    return filterItemsByLayerAccess(get().entries, context, layers);
  },
}));

export function resetLayerContentStore() {
  useLayerContentStore.setState({ entries: sortByTimestamp(DEFAULT_LOGS) });
}
