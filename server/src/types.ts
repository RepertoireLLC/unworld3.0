import { VisibilityLayer } from './visibility';

export interface UserRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  color?: string;
  industries: string[];
  interests: string[];
  skills: string[];
  location?: string;
  visibilityLayers: Record<VisibilityLayer, boolean>;
  visibilityPreferences: {
    presence: VisibilityLayer;
    profile: VisibilityLayer;
    commerce: VisibilityLayer;
    registryOptIn: boolean;
  };
  bio?: string;
}

export interface StorePayload {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  industry: string;
  visibility: VisibilityLayer;
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    paymentLink?: string;
    processor?: 'stripe' | 'paypal' | 'custom';
  }>;
  paymentProviders: Record<string, string | undefined>;
  published: boolean;
  registrySummary?: string;
  location?: string;
  updatedAt: string;
}
