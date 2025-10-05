import { LayerMetadata, Role, UserProfile } from '../data/types';
import { seedLayers } from '../data/seed';
import { v4 as uuid } from 'uuid';
import { auditLogger } from '../logs/auditLogger';

export class LayerManager {
  private layers = new Map<string, LayerMetadata>();

  constructor(initialLayers: LayerMetadata[] = []) {
    initialLayers.forEach((layer) => {
      this.layers.set(layer.id, layer);
    });
  }

  list() {
    return Array.from(this.layers.values());
  }

  getVisibleLayers(roles?: Role | Role[]) {
    const roleList = Array.isArray(roles) ? roles : roles ? [roles] : [];
    return this.list().filter((layer) => {
      if (!layer.visible) return false;
      if (layer.access.public) return true;
      if (roleList.length === 0 || !layer.access.restrictedRoles) return false;
      return roleList.some((role) => layer.access.restrictedRoles?.includes(role));
    });
  }

  createLayer(input: Omit<LayerMetadata, 'id' | 'userCount' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = new Date().toISOString();
    const layer: LayerMetadata = {
      ...input,
      id: input.id ?? uuid(),
      userCount: input.userCount ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    this.layers.set(layer.id, layer);
    auditLogger.record({
      actorId: input.createdBy,
      actorName: input.createdBy,
      action: 'layer:create',
      targetId: layer.id,
      details: { name: layer.name },
    });
    return layer;
  }

  updateLayer(id: string, updates: Partial<LayerMetadata>) {
    const existing = this.layers.get(id);
    if (!existing) {
      throw new Error('Layer not found');
    }
    const layer: LayerMetadata = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.layers.set(id, layer);
    auditLogger.record({
      actorId: updates.createdBy ?? 'system',
      actorName: updates.createdBy ?? 'system',
      action: 'layer:update',
      targetId: id,
      details: updates,
    });
    return layer;
  }

  toggleVisibility(id: string, visible: boolean) {
    return this.updateLayer(id, { visible });
  }

  removeLayer(id: string, actorId: string) {
    const existing = this.layers.get(id);
    if (!existing) {
      throw new Error('Layer not found');
    }
    this.layers.delete(id);
    auditLogger.record({
      actorId,
      actorName: actorId,
      action: 'layer:delete',
      targetId: id,
      details: { name: existing.name },
    });
    return existing;
  }

  refreshUserCounts(users: UserProfile[]) {
    const counts = new Map<string, number>();
    users.forEach((user) => {
      user.domains.forEach((domain) => {
        if (domain.public) {
          const layer = this.findByName(domain.domain);
          if (layer) {
            counts.set(layer.id, (counts.get(layer.id) ?? 0) + 1);
          }
        }
      });
    });

    this.layers.forEach((layer, id) => {
      const next = counts.get(id) ?? 0;
      if (layer.userCount !== next) {
        this.layers.set(id, { ...layer, userCount: next });
      }
    });
  }

  findByName(name: string) {
    return this.list().find((layer) => layer.name.toLowerCase() === name.toLowerCase()) ?? null;
  }
}

export const layerManager = new LayerManager(seedLayers);
