export const visibilityLayers = ['private', 'friends', 'industry', 'public'] as const;

export type VisibilityLayer = (typeof visibilityLayers)[number];
