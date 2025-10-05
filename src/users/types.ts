import type { Role } from '../layers/types';

export interface UserDomain {
  domain: string;
  public: boolean;
  coordinates: [number, number, number];
  skills: string[];
}

export interface PublicUserProfile {
  id: string;
  name: string;
  roles: Role[];
  domains: UserDomain[];
  location: { lat: number; lon: number };
  status: 'online' | 'offline';
}
