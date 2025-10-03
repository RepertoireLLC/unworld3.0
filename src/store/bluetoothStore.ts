import { create } from 'zustand';
import type { WifiNetwork } from '../types/network';

export interface WifiRelay extends WifiNetwork {
  ownerId: string;
  type: 'local' | 'peer';
  viaBluetooth: boolean;
  latencyMs: number;
}

interface BluetoothConnection {
  peers: [string, string];
  key: string;
  signalStrength: number;
  lastUpdated: number;
  connected: boolean;
  wifiRelays: WifiRelay[];
  activeWifiId: string | null;
}

interface BluetoothState {
  connections: Record<string, BluetoothConnection>;
  ensureConnection: (peerA: string, peerB: string) => BluetoothConnection;
  getConnection: (peerA: string, peerB: string) => BluetoothConnection | undefined;
  updateSignalStrength: (peerA: string, peerB: string, strength: number) => void;
  registerWifiRelays: (peerA: string, peerB: string, relays: WifiRelay[]) => void;
  selectWifiRelay: (peerA: string, peerB: string, relayId: string) => void;
  disconnect: (peerA: string, peerB: string) => void;
}

const connectionKey = (peerA: string, peerB: string) => {
  return [peerA, peerB].sort().join('::');
};

const generateKey = () => {
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i += 1) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  let binary = '';
  array.forEach((value) => {
    binary += String.fromCharCode(value);
  });

  return btoa(binary);
};

export const useBluetoothStore = create<BluetoothState>((set, get) => ({
  connections: {},

  ensureConnection: (peerA, peerB) => {
    const id = connectionKey(peerA, peerB);
    const existing = get().connections[id];
    if (existing) {
      if (!existing.connected) {
        set((state) => ({
          connections: {
            ...state.connections,
            [id]: {
              ...existing,
              connected: true,
              lastUpdated: Date.now(),
            },
          },
        }));
      }
      return get().connections[id];
    }

    const connection: BluetoothConnection = {
      peers: [peerA, peerB].sort() as [string, string],
      key: generateKey(),
      signalStrength: 80,
      lastUpdated: Date.now(),
      connected: true,
      wifiRelays: [],
      activeWifiId: null,
    };

    set((state) => ({
      connections: {
        ...state.connections,
        [id]: connection,
      },
    }));

    return connection;
  },

  getConnection: (peerA, peerB) => {
    const id = connectionKey(peerA, peerB);
    return get().connections[id];
  },

  updateSignalStrength: (peerA, peerB, strength) => {
    const id = connectionKey(peerA, peerB);
    const existing = get().connections[id];
    if (!existing) return;

    const clamped = Math.max(0, Math.min(100, Math.round(strength)));

    set((state) => ({
      connections: {
        ...state.connections,
        [id]: {
          ...existing,
          signalStrength: clamped,
          lastUpdated: Date.now(),
        },
      },
    }));
  },

  registerWifiRelays: (peerA, peerB, relays) => {
    if (!relays.length) return;
    const id = connectionKey(peerA, peerB);
    const base = get().connections[id] ?? get().ensureConnection(peerA, peerB);
    const existingRelays = base.wifiRelays;

    const mergedMap = new Map<string, WifiRelay>();
    [...existingRelays, ...relays].forEach((relay) => {
      const normalized: WifiRelay = {
        ...relay,
        viaBluetooth: relay.viaBluetooth ?? relay.type === 'peer',
        latencyMs: relay.latencyMs ?? (relay.type === 'peer' ? 22 : 6),
      };
      mergedMap.set(normalized.id, normalized);
    });

    const nextRelays = Array.from(mergedMap.values());
    const nextActive = base.activeWifiId && mergedMap.has(base.activeWifiId)
      ? base.activeWifiId
      : nextRelays[0]?.id ?? null;

    set((state) => ({
      connections: {
        ...state.connections,
        [id]: {
          ...base,
          wifiRelays: nextRelays,
          activeWifiId: nextActive,
          lastUpdated: Date.now(),
        },
      },
    }));
  },

  selectWifiRelay: (peerA, peerB, relayId) => {
    const id = connectionKey(peerA, peerB);
    const existing = get().connections[id];
    if (!existing) return;
    if (!existing.wifiRelays.some((relay) => relay.id === relayId)) {
      return;
    }

    set((state) => ({
      connections: {
        ...state.connections,
        [id]: {
          ...existing,
          activeWifiId: relayId,
          lastUpdated: Date.now(),
        },
      },
    }));
  },

  disconnect: (peerA, peerB) => {
    const id = connectionKey(peerA, peerB);
    const existing = get().connections[id];
    if (!existing) return;

    set((state) => ({
      connections: {
        ...state.connections,
        [id]: {
          ...existing,
          connected: false,
          lastUpdated: Date.now(),
        },
      },
    }));
  },
}));

