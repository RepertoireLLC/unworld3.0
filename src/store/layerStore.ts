import { create } from 'zustand';

export interface Layer {
  id: string;
  name: string;
  domain: string;
  parentId: string | null;
}

export interface LayerMembershipSnapshot {
  layerId: string;
  userIds: string[];
}

interface LayerState {
  layers: Record<string, Layer>;
  domainRegistry: Record<string, string>;
  memberships: Record<string, Set<string>>;
  registerLayer: (layer: Omit<Layer, 'id'> & { id?: string }) => string;
  removeLayer: (layerId: string) => void;
  assignUserToLayer: (userId: string, layerId: string) => void;
  removeUserFromLayer: (userId: string, layerId: string) => void;
  getLayerById: (layerId: string) => Layer | undefined;
  getLayerAncestors: (layerId: string) => string[];
  getLayerDescendants: (layerId: string) => string[];
  getUserResolvedLayers: (userId: string) => Set<string>;
  userHasAccessToLayers: (userId: string, layerIds: string[]) => boolean;
  ensureDomainLayer: (domain: string, options?: { name?: string; parentId?: string | null }) => string;
  getLayersForDomain: (domain: string) => Layer[];
  getMembershipSnapshot: () => LayerMembershipSnapshot[];
  getDefaultLayerId: () => string;
}

export const ROOT_LAYER_ID = 'layer:root';
const ROOT_LAYER_NAME = 'Global';
const ROOT_DOMAIN = 'global';

const createInitialState = () => {
  const rootLayer: Layer = {
    id: ROOT_LAYER_ID,
    name: ROOT_LAYER_NAME,
    domain: ROOT_DOMAIN,
    parentId: null,
  };

  return {
    layers: { [ROOT_LAYER_ID]: rootLayer },
    domainRegistry: { [ROOT_DOMAIN]: ROOT_LAYER_ID },
    memberships: { [ROOT_LAYER_ID]: new Set<string>() },
  } satisfies Pick<LayerState, 'layers' | 'domainRegistry' | 'memberships'>;
};

export const useLayerStore = create<LayerState>((set, get) => ({
  ...createInitialState(),

  registerLayer: ({ id, name, domain, parentId }) => {
    const layerId = id ?? `layer:${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
    const resolvedParentId = parentId ?? ROOT_LAYER_ID;

    set((state) => {
      if (!state.layers[resolvedParentId]) {
        throw new Error(`Parent layer ${resolvedParentId} does not exist`);
      }

      const newLayer: Layer = {
        id: layerId,
        name,
        domain,
        parentId: resolvedParentId,
      };

      return {
        layers: {
          ...state.layers,
          [layerId]: newLayer,
        },
        domainRegistry: {
          ...state.domainRegistry,
          [domain]: layerId,
        },
        memberships: {
          ...state.memberships,
          [layerId]: state.memberships[layerId] ?? new Set<string>(),
        },
      };
    });

    return layerId;
  },

  removeLayer: (layerId) => {
    if (layerId === ROOT_LAYER_ID) {
      throw new Error('The root layer cannot be removed');
    }

    set((state) => {
      const { [layerId]: removedLayer, ...remainingLayers } = state.layers;
      if (!removedLayer) {
        return state;
      }

      const updatedDomainRegistry = Object.fromEntries(
        Object.entries(state.domainRegistry).filter(([, id]) => id !== layerId)
      );

      const memberships = { ...state.memberships };
      delete memberships[layerId];

      Object.values(remainingLayers).forEach((layer) => {
        if (layer.parentId === layerId) {
          remainingLayers[layer.id] = { ...layer, parentId: removedLayer.parentId };
        }
      });

      return {
        layers: remainingLayers,
        domainRegistry: updatedDomainRegistry,
        memberships,
      };
    });
  },

  assignUserToLayer: (userId, layerId) => {
    set((state) => {
      const existing = state.memberships[layerId] ?? new Set<string>();
      const next = new Set(existing);
      next.add(userId);

      return {
        memberships: {
          ...state.memberships,
          [layerId]: next,
        },
      };
    });
  },

  removeUserFromLayer: (userId, layerId) => {
    set((state) => {
      const existing = state.memberships[layerId];
      if (!existing) {
        return state;
      }
      const next = new Set(existing);
      next.delete(userId);
      return {
        memberships: {
          ...state.memberships,
          [layerId]: next,
        },
      };
    });
  },

  getLayerById: (layerId) => get().layers[layerId],

  getLayerAncestors: (layerId) => {
    const ancestors: string[] = [];
    let current = get().layers[layerId];
    while (current && current.parentId) {
      ancestors.push(current.parentId);
      current = get().layers[current.parentId];
    }
    return ancestors;
  },

  getLayerDescendants: (layerId) => {
    const descendants: string[] = [];
    const queue = [layerId];
    const { layers } = get();

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) continue;

      Object.values(layers).forEach((layer) => {
        if (layer.parentId === currentId) {
          descendants.push(layer.id);
          queue.push(layer.id);
        }
      });
    }

    return descendants;
  },

  getUserResolvedLayers: (userId) => {
    const { memberships, getLayerAncestors } = get();
    const resolved = new Set<string>();

    Object.entries(memberships).forEach(([layerId, members]) => {
      if (members.has(userId)) {
        resolved.add(layerId);
        getLayerAncestors(layerId).forEach((ancestorId) => resolved.add(ancestorId));
      }
    });

    return resolved;
  },

  userHasAccessToLayers: (userId, layerIds) => {
    if (layerIds.length === 0) {
      return true;
    }
    const { getLayerAncestors, getUserResolvedLayers } = get();
    const accessibleLayers = getUserResolvedLayers(userId);

    return layerIds.some((layerId) => {
      if (accessibleLayers.has(layerId)) {
        return true;
      }
      const ancestors = getLayerAncestors(layerId);
      return ancestors.some((ancestorId) => accessibleLayers.has(ancestorId));
    });
  },

  ensureDomainLayer: (domain, options) => {
    const existing = get().domainRegistry[domain];
    if (existing) {
      return existing;
    }

    return get().registerLayer({
      id: undefined,
      name: options?.name ?? domain,
      domain,
      parentId: options?.parentId ?? ROOT_LAYER_ID,
    });
  },

  getLayersForDomain: (domain) => {
    const { layers } = get();
    return Object.values(layers).filter((layer) => layer.domain === domain);
  },

  getMembershipSnapshot: () => {
    const { memberships } = get();
    return Object.entries(memberships).map(([layerId, members]) => ({
      layerId,
      userIds: Array.from(members),
    }));
  },

  getDefaultLayerId: () => ROOT_LAYER_ID,
}));
