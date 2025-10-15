import type { AIConnection } from '../store/aiStore';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  decodeBase64ToBinary,
  encodeBinaryToBase64,
} from './base64';

const STORAGE_KEY = 'harmonia.ai.connections';
const MASTER_KEY_KEY = 'harmonia.ai.masterKey';
const MEMORY_STORAGE_VERSION = 'harmonia.memory.v1';

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
  window.localStorage.setItem(MASTER_KEY_KEY, arrayBufferToBase64(exported));
  return key;
}

async function encryptString(plainText: string) {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    cipherText: arrayBufferToBase64(cipherBuffer),
    iv: encodeBinaryToBase64(iv),
  };
}

async function decryptString(cipherText: string, iv: string) {
  const key = await getOrCreateKey();
  const cipherBuffer = base64ToArrayBuffer(cipherText);
  const ivBuffer = decodeBase64ToBinary(iv);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    cipherBuffer
  );
  return new TextDecoder().decode(plainBuffer);
}

async function encryptPayload<T>(payload: T) {
  const serialized = JSON.stringify(payload);
  return encryptString(serialized);
}

async function decryptPayload<T>(cipherText: string, iv: string): Promise<T> {
  const plain = await decryptString(cipherText, iv);
  return JSON.parse(plain) as T;
}

async function writeEncryptedPayload<T>(
  storageKey: string,
  payload: T,
  metadata?: Record<string, string>
) {
  if (typeof window === 'undefined') {
    return;
  }

  const encrypted = await encryptPayload(payload);
  const envelope = {
    ...encrypted,
    metadata: {
      savedAt: new Date().toISOString(),
      ...metadata,
    },
  };

  window.localStorage.setItem(storageKey, JSON.stringify(envelope));
}

async function readEncryptedPayload<T>(storageKey: string): Promise<T | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    return null;
  }

  const envelope = JSON.parse(stored) as {
    cipherText: string;
    iv: string;
  } & Record<string, unknown>;

  return decryptPayload<T>(envelope.cipherText, envelope.iv);
}

export interface SecureVault<T> {
  load: () => Promise<T | null>;
  save: (payload: T) => Promise<void>;
  clear: () => Promise<void>;
}

export function createSecureVault<T>(options: {
  storageKey: string;
  metadata?: Record<string, string>;
}): SecureVault<T> {
  const { storageKey, metadata } = options;

  return {
    load: () => readEncryptedPayload<T>(storageKey),
    save: async (payload: T) => {
      await writeEncryptedPayload(storageKey, payload, metadata);
    },
    clear: async () => {
      if (typeof window === 'undefined') {
        return;
      }
      window.localStorage.removeItem(storageKey);
    },
  };
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

  await writeEncryptedPayload(STORAGE_KEY, payload, {
    schema: 'harmonia.ai.connections',
  });
}

export async function retrieveAIConnections(): Promise<{
  connections: AIConnection[];
  activeConnectionId: string | null;
}> {
  if (typeof window === 'undefined') {
    return { connections: [], activeConnectionId: null };
  }

  const stored = await readEncryptedPayload<PersistedState>(STORAGE_KEY);
  if (!stored) {
    return { connections: [], activeConnectionId: null };
  }

  const connections: AIConnection[] = await Promise.all(
    stored.connections.map(async (connection) => ({
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
    activeConnectionId: stored.activeConnectionId,
  };
}

interface MemoryEnvelope {
  schemaVersion: string;
  threads: unknown;
}

export async function loadMemoryVault<T>(): Promise<T | null> {
  const payload = await readEncryptedPayload<MemoryEnvelope>(MEMORY_STORAGE_VERSION);
  if (!payload) {
    return null;
  }

  if (payload.schemaVersion !== '1') {
    return null;
  }

  return payload.threads as T;
}

export async function persistMemoryVault<T>(threads: T): Promise<void> {
  await writeEncryptedPayload(
    MEMORY_STORAGE_VERSION,
    {
      schemaVersion: '1',
      threads,
    },
    {
      schema: 'harmonia.memory.resonance',
    }
  );
}
