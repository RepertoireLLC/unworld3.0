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
  createdAt: string;
  updatedAt: string;
}

export interface UserDomain {
  domain: string;
  public: boolean;
  coordinates: [number, number, number];
  skills: string[];
}

export interface UserProfile {
  id: string;
  hashedId: string;
  name: string;
  roles: Role[];
  domains: UserDomain[];
  location: { lat: number; lon: number };
  status: 'online' | 'offline';
}

export interface ConnectionEdge {
  id: string;
  sourceDomain: string;
  targetDomain: string;
  weight: number;
}

export interface MetricsSnapshot {
  timestamp: string;
  totalUsers: number;
  activeUsers: number;
  layerCount: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}
