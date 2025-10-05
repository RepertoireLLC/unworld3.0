export type VisibilityLayer = 'private' | 'friends' | 'industry' | 'public';

export interface LayerVisibilityMap {
  private: boolean;
  friends: boolean;
  industry: boolean;
  public: boolean;
}

export const VISIBILITY_LAYERS: { value: VisibilityLayer; label: string; description: string }[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Visible only to you. Data is encrypted at rest and in transit.',
  },
  {
    value: 'friends',
    label: 'Network',
    description: 'Shared with approved contacts within your trusted network.',
  },
  {
    value: 'industry',
    label: 'Industry',
    description: 'Discoverable to peers within your selected industries.',
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Published to the Enclypse registry and global layer.',
  },
];

export const defaultLayerVisibility = (): LayerVisibilityMap => ({
  private: true,
  friends: true,
  industry: true,
  public: false,
});
