export type AccessLevel = 'public' | 'private' | 'restricted';

export interface DataLayer<T = unknown> {
  id: string;
  name: string;
  accessLevel: AccessLevel;
  data: T;
  updatedAt?: string;
}

export function readPublicData<T>(layer: DataLayer<T>): T {
  if (layer.accessLevel === 'public') {
    return layer.data;
  }
  throw new Error('Access Denied: Private data is restricted.');
}

export function filterPublicLayers<T>(layers: DataLayer<T>[]): DataLayer<T>[] {
  return layers.filter((layer) => layer.accessLevel === 'public');
}

export function assertPublicLayers<T>(layers: DataLayer<T>[]): T[] {
  return layers.map((layer) => readPublicData(layer));
}

export function sanitizePayloadForAI(payload: Record<string, DataLayer<unknown>>) {
  const sanitized: Record<string, unknown> = {};
  Object.entries(payload).forEach(([key, layer]) => {
    if (layer.accessLevel === 'public') {
      sanitized[key] = layer.data;
    }
  });
  return sanitized;
}
