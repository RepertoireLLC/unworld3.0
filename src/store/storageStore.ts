import { create } from 'zustand';
import { createSecureVault } from '../utils/encryption';

export type StorageVisibility = 'private' | 'trusted';

export interface StoredAsset {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  visibility: StorageVisibility;
  dataUrl: string;
  tags: string[];
}

interface StorageState {
  assets: StoredAsset[];
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  saveAsset: (file: File, options?: { visibility?: StorageVisibility; tags?: string[] }) => Promise<StoredAsset | null>;
  deleteAsset: (assetId: string) => Promise<void>;
  updateVisibility: (assetId: string, visibility: StorageVisibility) => Promise<void>;
}

const vault = createSecureVault<StoredAsset[]>({
  storageKey: 'harmonia.private.assets',
  metadata: { schema: 'harmonia.private.assets' },
});

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  });
}

export const useStorageStore = create<StorageState>((set, get) => ({
  assets: [],
  isHydrated: false,
  hydrate: async () => {
    if (get().isHydrated) {
      return;
    }
    try {
      const stored = (await vault.load()) ?? [];
      set({ assets: stored, isHydrated: true });
    } catch (error) {
      console.warn('Failed to hydrate storage vault', error);
      set({ assets: [], isHydrated: true });
    }
  },
  saveAsset: async (file, options) => {
    if (typeof window === 'undefined') {
      return null;
    }
    await get().hydrate();
    try {
      const dataUrl = await fileToDataUrl(file);
      const asset: StoredAsset = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
        visibility: options?.visibility ?? 'private',
        dataUrl,
        tags: options?.tags ?? [],
      };
      set((state) => ({ assets: [asset, ...state.assets] }));
      await vault.save(get().assets);
      return asset;
    } catch (error) {
      console.warn('Failed to persist asset', error);
      return null;
    }
  },
  deleteAsset: async (assetId) => {
    await get().hydrate();
    set((state) => ({ assets: state.assets.filter((asset) => asset.id !== assetId) }));
    await vault.save(get().assets);
  },
  updateVisibility: async (assetId, visibility) => {
    await get().hydrate();
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === assetId
          ? { ...asset, visibility }
          : asset
      ),
    }));
    await vault.save(get().assets);
  },
}));
