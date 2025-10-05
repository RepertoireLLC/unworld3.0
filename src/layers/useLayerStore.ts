import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type { LayerMetadata, LayerQueryOptions, Role } from './types';
import type { PublicUserProfile } from '../users/types';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

interface LayerStoreState {
  layers: LayerMetadata[];
  loading: boolean;
  error?: string;
  selectedLayers: string[];
  filters: LayerQueryOptions;
  layerUsers: Record<string, PublicUserProfile[]>;
  socket?: Socket;
  userRole?: Role;
  fetchLayers: (role?: Role) => Promise<void>;
  toggleLayerVisibility: (layerId: string, visible: boolean, broadcast?: boolean) => Promise<void>;
  setSelectedLayers: (ids: string[]) => void;
  setFilters: (filters: Partial<LayerQueryOptions>) => void;
  fetchUsersForLayer: (layer: LayerMetadata) => Promise<void>;
  createLayer: (payload: Partial<LayerMetadata>) => Promise<LayerMetadata | null>;
  updateLayer: (id: string, payload: Partial<LayerMetadata>) => Promise<LayerMetadata | null>;
  removeLayer: (id: string) => Promise<boolean>;
  ensureSocket: () => void;
}

const authHeaders = () => {
  const token = localStorage.getItem('enclypse_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const useLayerStore = create<LayerStoreState>((set, get) => ({
  layers: [],
  loading: false,
  selectedLayers: [],
  filters: {},
  layerUsers: {},
  socket: undefined,
  userRole: undefined,

  ensureSocket: () => {
    if (get().socket) return;
    const socket = io(API_URL, { transports: ['websocket'], autoConnect: true });
    socket.on('layer:updated', (layer: LayerMetadata) => {
      set((state) => ({
        layers: state.layers.map((existing) => (existing.id === layer.id ? layer : existing)),
      }));
    });
    socket.on('layer:created', (layer: LayerMetadata) => {
      set((state) => ({
        layers: state.layers.some((existing) => existing.id === layer.id)
          ? state.layers.map((existing) => (existing.id === layer.id ? layer : existing))
          : [...state.layers, layer],
      }));
    });
    socket.on('layer:deleted', ({ layerId }: { layerId: string }) => {
      set((state) => {
        const { [layerId]: _, ...rest } = state.layerUsers;
        return {
          layers: state.layers.filter((layer) => layer.id !== layerId),
          layerUsers: rest,
          selectedLayers: state.selectedLayers.filter((id) => id !== layerId),
        };
      });
    });
    socket.on('layers:init', (layers: LayerMetadata[]) => {
      set({ layers });
    });
    socket.on('user:presence', ({ userId, status }: { userId: string; status: 'online' | 'offline' }) => {
      set((state) => {
        const layerUsers = { ...state.layerUsers };
        Object.keys(layerUsers).forEach((key) => {
          layerUsers[key] = layerUsers[key].map((user) =>
            user.id === userId ? { ...user, status } : user
          );
        });
        return { layerUsers };
      });
    });
    set({ socket });
  },

  fetchLayers: async (role) => {
    set({ loading: true, error: undefined });
    try {
      const response = await fetch(`${API_URL}/api/layers`, {
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      if (!response.ok) {
        throw new Error(`Failed to load layers (${response.status})`);
      }
      const data = await response.json();
      const layers: LayerMetadata[] = data.layers;
      set({
        layers,
        loading: false,
        userRole: role,
      });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  toggleLayerVisibility: async (layerId, visible, broadcast = false) => {
    const { layers } = get();
    set({
      layers: layers.map((layer) =>
        layer.id === layerId ? { ...layer, visible } : layer
      ),
    });
    const socket = get().socket;
    if (socket && broadcast) {
      const actor = useAuthStore.getState().user;
      socket.emit('layer:toggle', { layerId, visible, actorId: actor?.id, actorName: actor?.name });
    }
  },

  setSelectedLayers: (ids) => {
    set({ selectedLayers: ids });
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  fetchUsersForLayer: async (layer) => {
    if (!layer) return;
    const key = layer.id;
    set((state) => ({ layerUsers: { ...state.layerUsers, [key]: state.layerUsers[key] ?? [] } }));
    try {
      const response = await fetch(`${API_URL}/api/layers/${encodeURIComponent(layer.name)}`, {
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      if (!response.ok) {
        throw new Error('Unable to fetch users');
      }
      const data = await response.json();
      set((state) => ({
        layerUsers: { ...state.layerUsers, [key]: data.users as PublicUserProfile[] },
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createLayer: async (payload) => {
    const response = await fetch(`${API_URL}/api/layers/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      set({ error: 'Failed to create layer' });
      return null;
    }
    const data = await response.json();
    set((state) => ({ layers: [...state.layers, data.layer as LayerMetadata] }));
    const socket = get().socket;
    socket?.emit('layer:created', data.layer);
    return data.layer as LayerMetadata;
  },

  updateLayer: async (id, payload) => {
    const response = await fetch(`${API_URL}/api/layers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      set({ error: 'Failed to update layer' });
      return null;
    }
    const data = await response.json();
    set((state) => ({
      layers: state.layers.map((layer) => (layer.id === id ? (data.layer as LayerMetadata) : layer)),
    }));
    return data.layer as LayerMetadata;
  },

  removeLayer: async (id) => {
    const response = await fetch(`${API_URL}/api/layers/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    if (!response.ok) {
      set({ error: 'Failed to delete layer' });
      return false;
    }
    set((state) => {
      const { [id]: _, ...restUsers } = state.layerUsers;
      return {
        layers: state.layers.filter((layer) => layer.id !== id),
        layerUsers: restUsers,
        selectedLayers: state.selectedLayers.filter((layerId) => layerId !== id),
      };
    });
    const socket = get().socket;
    socket?.emit('layer:deleted', { layerId: id });
    return true;
  },
}));
