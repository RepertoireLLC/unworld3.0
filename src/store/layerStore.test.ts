import { describe, it, expect, beforeEach } from 'vitest';
import { useLayerStore, resetLayerStore } from './layerStore';
import { withRole } from '../utils/permissions';

describe('layer store', () => {
  beforeEach(() => {
    resetLayerStore();
  });

  it('toggles accessible layers on and off', () => {
    const initial = useLayerStore.getState();
    expect(initial.isLayerActive('public')).toBe(true);
    useLayerStore.getState().toggleLayer('public');
    expect(useLayerStore.getState().isLayerActive('public')).toBe(false);
    useLayerStore.getState().toggleLayer('public');
    expect(useLayerStore.getState().isLayerActive('public')).toBe(true);
  });

  it('prevents activating layers without permission', () => {
    const state = useLayerStore.getState();
    expect(state.isLayerAccessible('restricted')).toBe(false);
    state.toggleLayer('restricted');
    expect(useLayerStore.getState().isLayerActive('restricted')).toBe(false);
  });

  it('updates visible layers atomically when permissions change', () => {
    const baseState = useLayerStore.getState();
    expect(baseState.getVisibleLayers()).toEqual(['public', 'trusted']);
    const elevatedContext = withRole(baseState.permissionContext, 'operator');
    useLayerStore.getState().setPermissionContext(elevatedContext);
    expect(useLayerStore.getState().getVisibleLayers()).toEqual([
      'public',
      'trusted',
      'restricted',
    ]);
  });

  it('accepts explicit elevation helper', () => {
    useLayerStore.getState().elevateRole('operator');
    expect(useLayerStore.getState().isLayerAccessible('restricted')).toBe(true);
  });
});
