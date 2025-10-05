import { LayerVisibilityMap, VisibilityLayer, defaultLayerVisibility } from './visibility';

export interface VisibilityPreferences {
  presence: VisibilityLayer;
  profile: VisibilityLayer;
  commerce: VisibilityLayer;
  registryOptIn: boolean;
}

export interface EnclypseUser {
  id: string;
  name: string;
  color: string;
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
  industries: string[];
  interests: string[];
  skills: string[];
  location?: string;
  visibilityLayers: LayerVisibilityMap;
  visibilityPreferences: VisibilityPreferences;
}

export const defaultVisibilityPreferences = (): VisibilityPreferences => ({
  presence: 'friends',
  profile: 'industry',
  commerce: 'public',
  registryOptIn: true,
});

export const createDefaultUserProfile = (overrides?: Partial<EnclypseUser>): EnclypseUser => ({
  id: overrides?.id ?? `user_${Date.now()}`,
  name: overrides?.name ?? 'Operator',
  email: overrides?.email ?? '',
  password: overrides?.password ?? '',
  color:
    overrides?.color ??
    `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')}`,
  industries: overrides?.industries ?? ['Independent'],
  interests: overrides?.interests ?? ['Innovation'],
  skills: overrides?.skills ?? ['Strategy'],
  location: overrides?.location ?? 'Remote',
  profilePicture: overrides?.profilePicture,
  bio:
    overrides?.bio ??
    'Building quantum-grade collaboration protocols inside Enclypse.',
  visibilityLayers: overrides?.visibilityLayers ?? defaultLayerVisibility(),
  visibilityPreferences:
    overrides?.visibilityPreferences ?? defaultVisibilityPreferences(),
});
