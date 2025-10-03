import { create } from 'zustand';

interface BluetoothConnection {
  peers: [string, string];
  key: string;
  signalStrength: number;
  lastUpdated: number;
  connected: boolean;
}

interface BluetoothState {
  connections: Record<string, BluetoothConnection>;
  ensureConnection: (peerA: string, peerB: string) => BluetoothConnection;
  getConnection: (peerA: string, peerB: string) => BluetoothConnection | undefined;
  updateSignalStrength: (peerA: string, peerB: string, strength: number) => void;
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

