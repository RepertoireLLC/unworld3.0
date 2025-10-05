export type Role = 'admin' | 'moderator' | 'user' | 'developer' | 'artist' | 'researcher' | 'musician';

export interface LayerAccess {
  public: boolean;
  restrictedRoles?: Role[];
}

export interface LayerMetadata {
  id: string;
  name: string;
  color: string;
  opacity: number;
  visible: boolean;
  createdBy: string;
  userCount: number;
  access: LayerAccess;
  createdAt?: string;
  updatedAt?: string;
}

export interface DomainFilter {
  domain: string;
  enabled: boolean;
}

export interface LayerQueryOptions {
  proximityKm?: number;
  includeRestricted?: boolean;
}
