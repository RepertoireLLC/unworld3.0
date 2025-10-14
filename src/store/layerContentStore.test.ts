import { describe, it, expect, beforeEach } from 'vitest';
import {
  useLayerContentStore,
  resetLayerContentStore,
  TAG_TO_LAYER,
} from './layerContentStore';
import { withRole, type PermissionContext } from '../utils/permissions';

describe('layer content store', () => {
  const baseContext: PermissionContext = { role: 'member' };

  beforeEach(() => {
    resetLayerContentStore();
  });

  it('creates new entries at the top of the feed', () => {
    const before = useLayerContentStore.getState().entries.length;
    const entry = useLayerContentStore
      .getState()
      .createEntry({
        content: 'Test note',
        layer: TAG_TO_LAYER.Harmony,
        tag: 'Harmony',
        ownerId: 'tester',
      });
    const state = useLayerContentStore.getState();
    expect(state.entries.length).toBe(before + 1);
    expect(state.entries[0].id).toBe(entry.id);
  });

  it('updates and deletes entries', () => {
    const [first] = useLayerContentStore.getState().entries;
    const updated = useLayerContentStore
      .getState()
      .updateEntry(first.id, { content: 'Updated content', tag: 'Beacon' });
    expect(updated?.content).toBe('Updated content');
    expect(updated?.tag).toBe('Beacon');

    useLayerContentStore.getState().deleteEntry(first.id);
    expect(useLayerContentStore.getState().entries.find((entry) => entry.id === first.id)).toBeUndefined();
  });

  it('filters visible entries by permission-aware layers', () => {
    const items = useLayerContentStore
      .getState()
      .getVisibleEntries(['public', 'trusted', 'restricted'], baseContext);
    const ids = items.map((item) => item.tag);
    expect(ids).not.toContain('Priority');

    const elevated = withRole(baseContext, 'operator');
    const elevatedItems = useLayerContentStore
      .getState()
      .getVisibleEntries(['public', 'trusted', 'restricted'], elevated);
    expect(elevatedItems.map((item) => item.tag)).toContain('Priority');
  });
});
