import { create } from 'zustand';
import {
  LAYERS,
  type Layer,
  type PermissionContext,
  canAccessLayer,
  getAccessibleLayers,
  sortLayers,
  withRole,
} from '../utils/permissions';

const DEFAULT_PERMISSION_CONTEXT: PermissionContext = { role: 'member' };

interface LayerState {
  availableLayers: Layer[];
  activeLayers: Layer[];
  permissionContext: PermissionContext;
  toggleLayer: (layer: Layer) => void;
  setActiveLayers: (layers: Layer[]) => void;
  setPermissionContext: (context: PermissionContext) => void;
  elevateRole: (role: PermissionContext['role']) => void;
  isLayerActive: (layer: Layer) => boolean;
  isLayerAccessible: (layer: Layer) => boolean;
  getVisibleLayers: () => Layer[];
}

function computeDefaultLayers(context: PermissionContext): Layer[] {
  return sortLayers(getAccessibleLayers(context));
}

function sanitizeLayers(layers: Layer[], context: PermissionContext): Layer[] {
  const accessible = new Set(getAccessibleLayers(context));
  const sanitized = layers.filter((layer) => accessible.has(layer));
  return sortLayers(Array.from(new Set(sanitized)));
}

const initialState = {
  availableLayers: LAYERS.map((metadata) => metadata.id),
  activeLayers: computeDefaultLayers(DEFAULT_PERMISSION_CONTEXT),
  permissionContext: { ...DEFAULT_PERMISSION_CONTEXT },
};

export const useLayerStore = create<LayerState>((set, get) => ({
  ...initialState,
  toggleLayer: (layer) => {
    const state = get();
    if (!state.availableLayers.includes(layer) || !canAccessLayer(state.permissionContext, layer)) {
      return;
    }
    const isActive = state.activeLayers.includes(layer);
    const nextActive = isActive
      ? state.activeLayers.filter((existing) => existing !== layer)
      : sortLayers([...state.activeLayers, layer]);
    set({ activeLayers: nextActive });
  },
  setActiveLayers: (layers) => {
    const state = get();
    set({ activeLayers: sanitizeLayers(layers, state.permissionContext) });
  },
  setPermissionContext: (context) => {
    const nextContext: PermissionContext = {
      role: context.role,
      overrides: context.overrides ? { ...context.overrides } : undefined,
    };
    set({
      permissionContext: nextContext,
      activeLayers: computeDefaultLayers(nextContext),
    });
  },
  elevateRole: (role) => {
    const nextContext = withRole(get().permissionContext, role);
    set({
      permissionContext: nextContext,
      activeLayers: computeDefaultLayers(nextContext),
    });
  },
  isLayerActive: (layer) => {
    const state = get();
    return state.activeLayers.includes(layer) && canAccessLayer(state.permissionContext, layer);
  },
  isLayerAccessible: (layer) => {
    return canAccessLayer(get().permissionContext, layer);
  },
  getVisibleLayers: () => {
    const state = get();
    return sanitizeLayers(state.activeLayers, state.permissionContext);
  },
}));

export function resetLayerStore() {
  useLayerStore.setState({
    availableLayers: LAYERS.map((metadata) => metadata.id),
    activeLayers: computeDefaultLayers(DEFAULT_PERMISSION_CONTEXT),
    permissionContext: { ...DEFAULT_PERMISSION_CONTEXT },
  });
}

export { DEFAULT_PERMISSION_CONTEXT };
