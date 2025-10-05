import { describe, it, expect } from 'vitest';
import {
  applyPermissionUpdates,
  canAccessLayer,
  filterItemsByLayerAccess,
  getAccessibleLayers,
  type Layer,
  type PermissionContext,
  type PermissionUpdate,
  withRole,
} from './permissions';

describe('permission utilities', () => {
  const baseContext: PermissionContext = { role: 'member' };

  it('evaluates access by role hierarchy', () => {
    expect(canAccessLayer(baseContext, 'public')).toBe(true);
    expect(canAccessLayer(baseContext, 'trusted')).toBe(true);
    expect(canAccessLayer(baseContext, 'restricted')).toBe(false);

    const elevated = withRole(baseContext, 'operator');
    expect(canAccessLayer(elevated, 'restricted')).toBe(true);
  });

  it('applies overrides while respecting authority', () => {
    const updates: PermissionUpdate[] = [
      { layer: 'restricted', allow: true, actorRole: 'operator' },
      { layer: 'trusted', allow: false, actorRole: 'guest' },
    ];

    const overridden = applyPermissionUpdates(baseContext, updates);
    expect(canAccessLayer(overridden, 'restricted')).toBe(true);
    // Guest cannot revoke trusted access for members
    expect(canAccessLayer(overridden, 'trusted')).toBe(true);
  });

  it('filters data based on requested layers and permissions', () => {
    const items = [
      { id: '1', layer: 'public' as Layer },
      { id: '2', layer: 'trusted' as Layer },
      { id: '3', layer: 'restricted' as Layer },
    ];

    const memberVisible = filterItemsByLayerAccess(items, baseContext);
    expect(memberVisible.map((item) => item.id)).toEqual(['1', '2']);

    const operatorContext = withRole(baseContext, 'operator');
    const restrictedOnly = filterItemsByLayerAccess(
      items,
      operatorContext,
      ['restricted'],
    );
    expect(restrictedOnly.map((item) => item.id)).toEqual(['3']);
  });

  it('updates accessible layer cache after overrides', () => {
    const updated = applyPermissionUpdates(baseContext, [
      { layer: 'restricted', allow: true, actorRole: 'operator' },
    ]);
    expect(getAccessibleLayers(updated)).toContain('restricted');
  });
});
