import { useLayerStore } from '../store/layerStore';

export enum Visibility {
  PUBLIC = 'public',
  MEMBERS = 'members',
  PRIVATE = 'private',
}

export interface AccessControlledEntity {
  ownerId?: string | null;
  layerIds: string[];
  visibility: Visibility;
}

const normalizeLayerIds = (layerIds?: string[]) =>
  Array.from(new Set((layerIds ?? []).filter(Boolean)));

export const resolveLayerIds = (layerIds?: string[]) => {
  const normalized = normalizeLayerIds(layerIds);
  if (normalized.length > 0) {
    return normalized;
  }
  const { getDefaultLayerId } = useLayerStore.getState();
  return [getDefaultLayerId()];
};

export const userHasLayerAccess = (
  userId: string | null | undefined,
  layerIds: string[]
) => {
  if (!userId) {
    return false;
  }

  const normalized = resolveLayerIds(layerIds);
  const { userHasAccessToLayers } = useLayerStore.getState();
  return userHasAccessToLayers(userId, normalized);
};

export const canReadEntity = (
  userId: string | null | undefined,
  entity: AccessControlledEntity
) => {
  switch (entity.visibility) {
    case Visibility.PUBLIC:
      return true;
    case Visibility.PRIVATE:
      return Boolean(entity.ownerId && entity.ownerId === userId);
    case Visibility.MEMBERS:
    default:
      if (!userId) {
        return false;
      }
      return (
        userHasLayerAccess(userId, resolveLayerIds(entity.layerIds)) ||
        (entity.ownerId ? entity.ownerId === userId : false)
      );
  }
};

export const canWriteEntity = (
  userId: string | null | undefined,
  entity: AccessControlledEntity
) => {
  if (!userId) {
    return false;
  }

  if (entity.ownerId && entity.ownerId === userId) {
    return true;
  }

  if (entity.visibility === Visibility.PRIVATE) {
    return false;
  }

  return userHasLayerAccess(userId, resolveLayerIds(entity.layerIds));
};

export const filterReadableEntities = <T extends AccessControlledEntity>(
  userId: string | null | undefined,
  entities: T[]
) => entities.filter((entity) => canReadEntity(userId, entity));

export const assertCanRead = (
  userId: string | null | undefined,
  entity: AccessControlledEntity,
  errorMessage = 'You do not have permission to view this content.'
) => {
  if (!canReadEntity(userId, entity)) {
    throw new Error(errorMessage);
  }
};

export const assertCanWrite = (
  userId: string | null | undefined,
  entity: AccessControlledEntity,
  errorMessage = 'You do not have permission to modify this content.'
) => {
  if (!canWriteEntity(userId, entity)) {
    throw new Error(errorMessage);
  }
};

export const withDefaultAccessControl = <T extends AccessControlledEntity>(
  entity: Omit<T, 'layerIds'> & Partial<Pick<T, 'layerIds'>>
): T => ({
  ...entity,
  layerIds: resolveLayerIds(entity.layerIds),
});
