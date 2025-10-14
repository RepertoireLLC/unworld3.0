import { create } from 'zustand';
import {
  configurePeerMesh,
  createOffer,
  acceptOffer,
  acceptAnswer,
  addRemoteCandidate,
  sendToPeer,
  closePeer,
  getPeerStatus,
  type PeerSignal,
  type MeshCallbacks,
} from '../core/network/peerMesh';
import { createSecureVault } from '../utils/encryption';
import { generateId } from '../utils/id';

export type MeshVisibility = 'private' | 'trusted' | 'public';

export interface MeshPeer {
  id: string;
  displayName: string;
  visibility: MeshVisibility;
  lastSeen: number;
  status: RTCPeerConnectionState | 'idle' | 'connecting';
  trusted: boolean;
  latencyMs?: number;
  channels: string[];
}

export interface MeshSignalEnvelope {
  peerId: string;
  signals: PeerSignal[];
}

interface MeshPreferences {
  allowPublicDiscovery: boolean;
  autoAcceptTrusted: boolean;
  fallbackIndexers: string[];
}

interface MeshState {
  initialized: boolean;
  localPeerId: string | null;
  displayName: string | null;
  peers: Record<string, MeshPeer>;
  channelListeners: Record<string, Set<(peerId: string, payload: unknown) => void>>;
  preferences: MeshPreferences;
  initialize: (displayName: string) => void;
  registerPeer: (peer: Omit<MeshPeer, 'status' | 'lastSeen' | 'channels'> & { channels?: string[] }) => MeshPeer;
  updateStatus: (peerId: string, status: MeshPeer['status'], latencyMs?: number) => void;
  addSignal: (envelope: MeshSignalEnvelope) => Promise<PeerSignal[]>;
  connectToPeer: (peerId: string) => Promise<PeerSignal[]>;
  receiveSignal: (peerId: string, signal: PeerSignal) => Promise<PeerSignal[]>;
  sendChannelMessage: (peerId: string, channel: string, payload: unknown) => void;
  broadcast: (channel: string, payload: unknown) => void;
  toggleTrust: (peerId: string, trusted: boolean) => void;
  registerChannelListener: (channel: string, handler: (peerId: string, payload: unknown) => void) => () => void;
  disconnectPeer: (peerId: string) => void;
  setPreferences: (preferences: Partial<MeshPreferences>) => void;
}

interface PersistedMeshState {
  preferences: MeshPreferences;
  trustedPeers: string[];
}

const meshVault = createSecureVault<PersistedMeshState>({
  storageKey: 'harmonia.mesh.preferences',
  metadata: { schema: 'harmonia.mesh' },
});

function defaultPreferences(): MeshPreferences {
  return {
    allowPublicDiscovery: true,
    autoAcceptTrusted: true,
    fallbackIndexers: ['https://mesh-indexer.harmonia.local'],
  };
}

async function loadPersistedState() {
  try {
    const stored = await meshVault.load();
    return stored ?? { preferences: defaultPreferences(), trustedPeers: [] };
  } catch (error) {
    console.warn('Failed to load mesh preferences', error);
    return { preferences: defaultPreferences(), trustedPeers: [] };
  }
}

async function persistState(preferences: MeshPreferences, peers: Record<string, MeshPeer>) {
  const trustedPeers = Object.values(peers)
    .filter((peer) => peer.trusted)
    .map((peer) => peer.id);
  try {
    await meshVault.save({ preferences, trustedPeers });
  } catch (error) {
    console.warn('Failed to persist mesh preferences', error);
  }
}

export const useMeshStore = create<MeshState>((set, get) => ({
  initialized: false,
  localPeerId: null,
  displayName: null,
  peers: {},
  channelListeners: {},
  preferences: defaultPreferences(),
  initialize: (displayName) => {
    if (get().initialized) {
      return;
    }
    void loadPersistedState().then((state) => {
      set((current) => ({
        preferences: state.preferences,
        peers: Object.fromEntries(
          state.trustedPeers.map((peerId) => [
            peerId,
            {
              id: peerId,
              displayName: peerId,
              visibility: 'trusted',
              lastSeen: Date.now(),
              status: getPeerStatus(peerId),
              trusted: true,
              channels: [],
            } satisfies MeshPeer,
          ])
        ),
      }));
    });

    const peerId = generateId('mesh');
    const callbacks: MeshCallbacks = {
      onStatusChange: (peerIdValue, status) => {
        get().updateStatus(peerIdValue, status);
      },
      onMessage: (peerIdValue, channel, payload) => {
        const listeners = get().channelListeners[channel];
        if (listeners) {
          listeners.forEach((listener) => {
            try {
              listener(peerIdValue, payload);
            } catch (error) {
              console.warn('Channel listener failed', error);
            }
          });
        }
      },
      onError: (peerIdValue, error) => {
        console.warn('Mesh error', peerIdValue, error);
        get().updateStatus(peerIdValue, 'disconnected');
      },
    };
    configurePeerMesh(callbacks);
    set({ initialized: true, localPeerId: peerId, displayName });
  },
  registerPeer: (peer) => {
    const peerRecord: MeshPeer = {
      id: peer.id,
      displayName: peer.displayName,
      visibility: peer.visibility,
      lastSeen: Date.now(),
      status: getPeerStatus(peer.id),
      trusted: peer.trusted,
      latencyMs: peer.latencyMs,
      channels: peer.channels ?? [],
    };
    set((state) => ({
      peers: {
        ...state.peers,
        [peerRecord.id]: peerRecord,
      },
    }));
    void persistState(get().preferences, get().peers);
    return peerRecord;
  },
  updateStatus: (peerId, status, latencyMs) => {
    set((state) => {
      const peer = state.peers[peerId];
      if (!peer) {
        return state;
      }
      const next: MeshPeer = {
        ...peer,
        status,
        lastSeen: Date.now(),
        latencyMs: latencyMs ?? peer.latencyMs,
      };
      return {
        peers: {
          ...state.peers,
          [peerId]: next,
        },
      };
    });
  },
  addSignal: async (envelope) => {
    const responses: PeerSignal[] = [];
    for (const signal of envelope.signals) {
      const result = await get().receiveSignal(envelope.peerId, signal);
      responses.push(...result);
    }
    return responses;
  },
  connectToPeer: async (peerId) => {
    const signals = await createOffer(peerId);
    get().updateStatus(peerId, 'connecting');
    return signals;
  },
  receiveSignal: async (peerId, signal) => {
    if (signal.type === 'offer' && signal.sdp) {
      return acceptOffer(peerId, signal.sdp);
    }
    if (signal.type === 'answer' && signal.sdp) {
      await acceptAnswer(peerId, signal.sdp);
      return [];
    }
    if (signal.type === 'candidate' && signal.candidate) {
      await addRemoteCandidate(peerId, signal.candidate);
    }
    return [];
  },
  sendChannelMessage: (peerId, channel, payload) => {
    try {
      sendToPeer(peerId, channel, payload);
    } catch (error) {
      console.warn('Failed to send channel payload', error);
      get().updateStatus(peerId, 'disconnected');
    }
  },
  broadcast: (channel, payload) => {
    const { peers, sendChannelMessage } = get();
    Object.values(peers)
      .filter((peer) => peer.status === 'connected' && peer.channels.includes(channel))
      .forEach((peer) => {
        sendChannelMessage(peer.id, channel, payload);
      });
  },
  toggleTrust: (peerId, trusted) => {
    set((state) => {
      const peer = state.peers[peerId];
      if (!peer) {
        return state;
      }
      const updated: MeshPeer = {
        ...peer,
        trusted,
        visibility: trusted ? 'trusted' : peer.visibility,
      };
      return {
        peers: {
          ...state.peers,
          [peerId]: updated,
        },
      };
    });
    void persistState(get().preferences, get().peers);
  },
  registerChannelListener: (channel, handler) => {
    set((state) => {
      const listeners = new Set(state.channelListeners[channel] ?? []);
      listeners.add(handler);
      return {
        channelListeners: {
          ...state.channelListeners,
          [channel]: listeners,
        },
      };
    });
    return () => {
      set((state) => {
        const listeners = new Set(state.channelListeners[channel] ?? []);
        listeners.delete(handler);
        return {
          channelListeners: {
            ...state.channelListeners,
            [channel]: listeners,
          },
        };
      });
    };
  },
  disconnectPeer: (peerId) => {
    closePeer(peerId);
    set((state) => {
      const { [peerId]: _removed, ...rest } = state.peers;
      return {
        peers: rest,
      };
    });
  },
  setPreferences: (preferences) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        ...preferences,
      },
    }));
    void persistState(get().preferences, get().peers);
  },
}));
