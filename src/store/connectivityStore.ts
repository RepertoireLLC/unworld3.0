import { create } from 'zustand';
import { generateEncryptionKey } from '../utils/encryption';

type ConnectionMedium = 'bluetooth' | 'wifi';

export interface NearbyDevice {
  id: string;
  name: string;
  signal: number;
}

interface ConnectivityState {
  scanning: boolean;
  availableDevices: NearbyDevice[];
  connectedDevice: NearbyDevice | null;
  connectionMedium: ConnectionMedium;
  encryptionKey: string | null;
  lastSyncedAt: number | null;
  error: string | null;
  scanForDevices: () => Promise<void>;
  connectToDevice: (deviceId: string) => Promise<void>;
  disconnect: () => void;
  switchToWifi: () => void;
  clearError: () => void;
}

const mockDevices: NearbyDevice[] = [
  { id: 'bt-001', name: 'Nomad Beacon', signal: 92 },
  { id: 'bt-002', name: 'Aurora Pad', signal: 81 },
  { id: 'bt-003', name: 'Navigator Wristband', signal: 67 },
];

export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  scanning: false,
  availableDevices: [],
  connectedDevice: null,
  connectionMedium: 'wifi',
  encryptionKey: null,
  lastSyncedAt: null,
  error: null,

  async scanForDevices() {
    if (get().scanning) return;

    set({ scanning: true, error: null });

    await new Promise((resolve) => setTimeout(resolve, 600));

    set({
      availableDevices: mockDevices,
      scanning: false,
    });
  },

  async connectToDevice(deviceId) {
    const device = get().availableDevices.find((item) => item.id === deviceId);
    if (!device) {
      set({ error: 'Device not found nearby.' });
      return;
    }

    set({ scanning: false, error: null });

    await new Promise((resolve) => setTimeout(resolve, 400));

    set({
      connectedDevice: device,
      connectionMedium: 'bluetooth',
      encryptionKey: generateEncryptionKey(),
    });
  },

  disconnect() {
    set({
      connectedDevice: null,
      encryptionKey: null,
      connectionMedium: 'wifi',
    });
  },

  switchToWifi() {
    const { connectedDevice } = get();
    if (!connectedDevice) {
      set({ error: 'Connect to a device before switching transport.' });
      return;
    }

    set({
      connectionMedium: 'wifi',
      lastSyncedAt: Date.now(),
    });
  },

  clearError() {
    set({ error: null });
  },
}));
