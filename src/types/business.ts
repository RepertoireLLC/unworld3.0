import { VisibilityLayer } from './visibility';

export interface ProductDefinition {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  paymentLink?: string;
  processor?: 'stripe' | 'paypal' | 'custom';
}

export interface PaymentProviders {
  stripe?: string;
  paypal?: string;
  custom?: string;
}

export interface CommerceStore {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  industry: string;
  visibility: VisibilityLayer;
  products: ProductDefinition[];
  paymentProviders: PaymentProviders;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  location?: string;
  registrySummary?: string;
}

export const createEmptyStore = (ownerId: string): CommerceStore => ({
  id: `store_${ownerId}`,
  ownerId,
  name: 'Untitled Storefront',
  description: 'Launch a commerce capsule to broadcast your offerings.',
  industry: 'General',
  visibility: 'private',
  products: [],
  paymentProviders: {},
  published: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
