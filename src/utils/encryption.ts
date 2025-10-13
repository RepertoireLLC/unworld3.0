import type { AIConnection } from '../store/aiStore';

const STORAGE_KEY = 'harmonia.ai.connections';
const MASTER_KEY_KEY = 'harmonia.ai.masterKey';

interface PersistedConnection {
  id: string;
  name: string;
  modelType: AIConnection['modelType'];
  endpoint: string;
  notes?: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
  credentials?: {
    cipherText: string;
    iv: string;
  };
}

interface PersistedState {
  connections: PersistedConnection[];
  activeConnectionId: string | null;
}

function bufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function getOrCreateKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined') {
    throw new Error('Encryption is only available in browser environments.');
  }

  const existing = window.localStorage.getItem(MASTER_KEY_KEY);
  if (existing) {
    const rawKey = base64ToArrayBuffer(existing);
    return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, [
      'encrypt',
      'decrypt',
    ]);
  }

  const raw = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', true, [
    'encrypt',
    'decrypt',
  ]);
  const exported = await crypto.subtle.exportKey('raw', key);
  window.localStorage.setItem(MASTER_KEY_KEY, bufferToBase64(exported));
  return key;
}

async function encryptString(plainText: string) {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    cipherText: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

async function decryptString(cipherText: string, iv: string) {
  const key = await getOrCreateKey();
  const cipherBuffer = base64ToArrayBuffer(cipherText);
  const ivBuffer = base64ToArrayBuffer(iv);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    key,
    cipherBuffer
  );
  return new TextDecoder().decode(plainBuffer);
}

export async function persistAIConnections(
  connections: AIConnection[],
  activeConnectionId: string | null
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: PersistedState = {
    activeConnectionId,
    connections: await Promise.all(
      connections.map(async (connection) => ({
        id: connection.id,
        name: connection.name,
        modelType: connection.modelType,
        endpoint: connection.endpoint,
        notes: connection.notes,
        isEnabled: connection.isEnabled,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
        lastTestedAt: connection.lastTestedAt,
        credentials: connection.apiKey
          ? await encryptString(connection.apiKey)
          : undefined,
      }))
    ),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function retrieveAIConnections(): Promise<{
  connections: AIConnection[];
  activeConnectionId: string | null;
}> {
  if (typeof window === 'undefined') {
    return { connections: [], activeConnectionId: null };
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { connections: [], activeConnectionId: null };
  }

  const parsed = JSON.parse(stored) as PersistedState;
  const connections: AIConnection[] = await Promise.all(
    parsed.connections.map(async (connection) => ({
      ...connection,
      apiKey:
        connection.credentials?.cipherText && connection.credentials.iv
          ? await decryptString(connection.credentials.cipherText, connection.credentials.iv)
          : undefined,
      status: 'idle',
      lastError: undefined,
    }))
  );

  return {
    connections,
    activeConnectionId: parsed.activeConnectionId,
  };
}
