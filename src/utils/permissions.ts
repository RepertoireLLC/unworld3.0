export type Layer = 'public' | 'trusted' | 'restricted';
export type Role = 'guest' | 'member' | 'operator' | 'admin';

export interface PermissionContext {
  role: Role;
  overrides?: Partial<Record<Layer, boolean>>;
}

export interface PermissionUpdate {
  layer: Layer;
  allow: boolean;
  actorRole?: Role;
}

export interface LayerMetadata {
  id: Layer;
  label: string;
  description: string;
  minimumRole: Role;
}

export const LAYERS: LayerMetadata[] = [
  {
    id: 'public',
    label: 'Public',
    description: 'Broadcast-safe information shared with every operator.',
    minimumRole: 'guest',
  },
  {
    id: 'trusted',
    label: 'Trusted',
    description: 'Confidential signals visible to linked operators.',
    minimumRole: 'member',
  },
  {
    id: 'restricted',
    label: 'Restricted',
    description: 'Highly sensitive intel limited to senior operators.',
    minimumRole: 'operator',
  },
];

const ROLE_HIERARCHY: Role[] = ['guest', 'member', 'operator', 'admin'];
const ROLE_RANK = ROLE_HIERARCHY.reduce<Record<Role, number>>((acc, role, index) => {
  acc[role] = index;
  return acc;
}, {} as Record<Role, number>);

const BASE_PERMISSIONS: Record<Role, Record<Layer, boolean>> = {
  guest: {
    public: true,
    trusted: false,
    restricted: false,
  },
  member: {
    public: true,
    trusted: true,
    restricted: false,
  },
  operator: {
    public: true,
    trusted: true,
    restricted: true,
  },
  admin: {
    public: true,
    trusted: true,
    restricted: true,
  },
};

function resolveOverrides(context: PermissionContext): Partial<Record<Layer, boolean>> {
  return context.overrides ? { ...context.overrides } : {};
}

export function canAccessLayer(context: PermissionContext, layer: Layer): boolean {
  const overrides = resolveOverrides(context);
  if (overrides[layer] !== undefined) {
    return !!overrides[layer];
  }
  return BASE_PERMISSIONS[context.role][layer];
}

export function canManageLayer(role: Role, layer: Layer): boolean {
  const minimum = LAYERS.find((metadata) => metadata.id === layer)?.minimumRole ?? 'guest';
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function getAccessibleLayers(context: PermissionContext): Layer[] {
  return LAYERS.map((metadata) => metadata.id).filter((layer) => canAccessLayer(context, layer as Layer));
}

export function filterItemsByLayerAccess<T extends { layer: Layer }>(
  items: T[],
  context: PermissionContext,
  requestedLayers?: Layer[],
): T[] {
  const accessible = new Set(getAccessibleLayers(context));
  const allowedLayers = requestedLayers
    ? requestedLayers.filter((layer) => accessible.has(layer))
    : Array.from(accessible);

  return items.filter((item) => allowedLayers.includes(item.layer));
}

export function applyPermissionUpdates(
  context: PermissionContext,
  updates: PermissionUpdate[],
): PermissionContext {
  const overrides = resolveOverrides(context);
  const next: PermissionContext = {
    role: context.role,
    overrides: { ...overrides },
  };

  for (const update of updates) {
    const actor = update.actorRole ?? context.role;
    if (!canManageLayer(actor, update.layer)) {
      continue;
    }
    next.overrides![update.layer] = update.allow;
  }

  return next;
}

export function sortLayers(layers: Layer[]): Layer[] {
  const order = LAYERS.map((layer) => layer.id);
  return [...layers].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export function withRole(context: PermissionContext, role: Role): PermissionContext {
  return {
    role,
    overrides: resolveOverrides(context),
  };
}
