import { CommerceStore } from '../types/business';
import { VisibilityLayer } from '../types/visibility';
import { VisibilityPreferences } from '../types/user';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'API request failed');
  }

  return response.json();
}

export async function syncCommerceStore(payload: { ownerId: string; store: CommerceStore }) {
  try {
    await request('/stores', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('Falling back to local persistence for store sync.', error);
    throw error;
  }
}

export async function updateProfileVisibility(payload: {
  userId: string;
  layers: Partial<Record<VisibilityLayer, boolean>>;
  preferences?: Partial<VisibilityPreferences>;
}) {
  try {
    await request(`/profiles/${payload.userId}/visibility`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('Unable to sync visibility settings. Changes remain local.', error);
  }
}

export async function fetchRegistry(filters: {
  layer: VisibilityLayer;
  industry?: string;
  search?: string;
}) {
  try {
    return await request('/registry', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  } catch (error) {
    console.warn('Registry fetch failed, using local cache.', error);
    return null;
  }
}
