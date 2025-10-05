import { Role } from '../data/types';

export const ROLE_PRIORITY: Record<Role, number> = {
  admin: 3,
  moderator: 2,
  user: 1,
  developer: 1,
  artist: 1,
  researcher: 1,
};

export const isElevated = (roles: Role[]) => roles.includes('admin') || roles.includes('moderator');
