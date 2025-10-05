import { create } from 'zustand';
import { CommerceStore, ProductDefinition, createEmptyStore } from '../types/business';
import { VisibilityLayer } from '../types/visibility';

interface BusinessState {
  stores: Record<string, CommerceStore>;
  initializeForUser: (ownerId: string) => CommerceStore;
  upsertStore: (store: CommerceStore) => void;
  updateStoreMeta: (
    ownerId: string,
    updates: Partial<Omit<CommerceStore, 'ownerId' | 'id' | 'products'>>
  ) => void;
  addProduct: (ownerId: string, product: ProductDefinition) => void;
  updateProduct: (
    ownerId: string,
    productId: string,
    updates: Partial<ProductDefinition>
  ) => void;
  removeProduct: (ownerId: string, productId: string) => void;
  setVisibility: (ownerId: string, visibility: VisibilityLayer) => void;
  setPublished: (ownerId: string, published: boolean) => void;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  stores: {},

  initializeForUser: (ownerId) => {
    const current = get().stores[ownerId];
    if (current) {
      return current;
    }

    const freshStore = createEmptyStore(ownerId);
    set((state) => ({
      stores: {
        ...state.stores,
        [ownerId]: freshStore,
      },
    }));
    return freshStore;
  },

  upsertStore: (store) =>
    set((state) => ({
      stores: {
        ...state.stores,
        [store.ownerId]: {
          ...store,
          updatedAt: new Date().toISOString(),
        },
      },
    })),

  updateStoreMeta: (ownerId, updates) =>
    set((state) => {
      const existing = state.stores[ownerId] ?? createEmptyStore(ownerId);
      return {
        stores: {
          ...state.stores,
          [ownerId]: {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }),

  addProduct: (ownerId, product) =>
    set((state) => {
      const existing = state.stores[ownerId] ?? createEmptyStore(ownerId);
      return {
        stores: {
          ...state.stores,
          [ownerId]: {
            ...existing,
            products: [...existing.products, product],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }),

  updateProduct: (ownerId, productId, updates) =>
    set((state) => {
      const existing = state.stores[ownerId];
      if (!existing) return state;
      return {
        stores: {
          ...state.stores,
          [ownerId]: {
            ...existing,
            products: existing.products.map((product) =>
              product.id === productId ? { ...product, ...updates } : product
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }),

  removeProduct: (ownerId, productId) =>
    set((state) => {
      const existing = state.stores[ownerId];
      if (!existing) return state;
      return {
        stores: {
          ...state.stores,
          [ownerId]: {
            ...existing,
            products: existing.products.filter((product) => product.id !== productId),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }),

  setVisibility: (ownerId, visibility) =>
    set((state) => {
      const existing = state.stores[ownerId];
      if (!existing) return state;
      return {
        stores: {
          ...state.stores,
          [ownerId]: {
            ...existing,
            visibility,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }),

  setPublished: (ownerId, published) =>
    set((state) => {
      const existing = state.stores[ownerId];
      if (!existing) return state;
      return {
        stores: {
          ...state.stores,
          [ownerId]: {
            ...existing,
            published,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }),
}));
