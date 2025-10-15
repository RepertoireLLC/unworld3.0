import type { Libp2p } from 'libp2p';

export type NodeRole = 'standard' | 'relay';

export interface PeerIdentity {
  publicKey: string;
  secretKey: string;
  peerId: string;
  fingerprint: string;
}

export interface TorEndpoint {
  status: 'offline' | 'starting' | 'online' | 'error';
  onionAddress?: string;
  lastError?: string;
}

export interface PeerProfile {
  peerId: string;
  username: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'unknown';
  lastSeen?: number;
  capabilities: {
    relay: boolean;
    storage: boolean;
    compute: boolean;
  };
}

export interface GossipMessage<TPayload = unknown> {
  id: string;
  topic: string;
  signature: string;
  createdAt: number;
  author: string;
  payload: TPayload;
}

export interface P2PNodeContext {
  node?: Libp2p;
  identity: PeerIdentity;
  tor: TorEndpoint;
  peers: PeerProfile[];
  role: NodeRole;
  stop: () => Promise<void>;
}

export interface SynchronizerOptions {
  bootstrapOnions?: string[];
  relayPeers?: string[];
  enableRelay?: boolean;
}

export interface Synchronizer {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  publish: <TPayload>(topic: string, message: TPayload) => Promise<void>;
  subscribe: <TPayload>(
    topic: string,
    handler: (message: GossipMessage<TPayload>) => void,
  ) => () => void;
}

