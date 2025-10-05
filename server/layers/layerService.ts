import { runtimeConfig } from '../config/env';
import { layerManager } from './layerManager';
import { userService } from '../users/userService';
import { createCache } from '../utils/cache';
import { LayerMetadata, Role } from '../data/types';

const cache = createCache(runtimeConfig.cacheTtlSeconds);

export class LayerService {
  getVisibleLayers(roles?: Role | Role[]) {
    const roleKey = Array.isArray(roles) ? roles.sort().join(',') : roles ?? 'public';
    const cacheKey = `visible:${roleKey}`;
    const cached = cache.get<LayerMetadata[]>(cacheKey);
    if (cached) return cached;
    const layers = layerManager.getVisibleLayers(roles);
    cache.set(cacheKey, layers);
    return layers;
  }

  listAll() {
    return layerManager.list();
  }

  createLayer(data: Omit<LayerMetadata, 'id' | 'userCount' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const layer = layerManager.createLayer(data);
    cache.flushAll();
    return layer;
  }

  updateLayer(id: string, updates: Partial<LayerMetadata>) {
    const layer = layerManager.updateLayer(id, updates);
    cache.flushAll();
    return layer;
  }

  removeLayer(id: string, actorId: string) {
    const layer = layerManager.removeLayer(id, actorId);
    cache.flushAll();
    return layer;
  }

  getPublicUsers(domain: string) {
    const cacheKey = `users:${domain.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const users = userService.listPublicByDomain(domain);
    cache.set(cacheKey, users);
    return users;
  }
}

export const layerService = new LayerService();
