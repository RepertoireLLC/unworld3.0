import type { AIConnection } from '../store/aiStore';

const STORAGE_KEY_PREFIX = 'harmonia.ai.connections';
const MASTER_KEY_PREFIX = 'harmonia.ai.masterKey';
const CHAT_STORAGE_KEY_PREFIX = 'harmonia.ai.chatHistory';
const LEGACY_STORAGE_KEY = 'harmonia.ai.connections';
const LEGACY_MASTER_KEY_KEY = 'harmonia.ai.masterKey';

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

interface PersistableChatMessage {
  id: string;
  connectionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status: 'pending' | 'sent' | 'error';
  reasoning?: string;
  error?: string;
}

interface PersistedChatThread {
  connectionId: string;
  cipherText: string;
  iv: string;
}

interface PersistedChatPayload {
  version: number;
  threads: PersistedChatThread[];
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

function hasWindow() {
  return typeof window !== 'undefined';
}

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}.${userId}`;
}

function getMasterKeyKey(userId: string) {
  return `${MASTER_KEY_PREFIX}.${userId}`;
}

function getChatStorageKey(userId: string) {
  return `${CHAT_STORAGE_KEY_PREFIX}.${userId}`;
}

async function getOrCreateKey(userId: string): Promise<CryptoKey> {
  if (!hasWindow()) {
    throw new Error('Encryption is only available in browser environments.');
  }

  const keyLocation = getMasterKeyKey(userId);
  const existing = window.localStorage.getItem(keyLocation);
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
  window.localStorage.setItem(keyLocation, bufferToBase64(exported));
  return key;
}

async function encryptString(plainText: string, userId: string) {
  const key = await getOrCreateKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    cipherText: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

async function decryptString(cipherText: string, iv: string, userId: string) {
  const key = await getOrCreateKey(userId);
  const cipherBuffer = base64ToArrayBuffer(cipherText);
  const ivBuffer = base64ToArrayBuffer(iv);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    key,
    cipherBuffer
  );
  return new TextDecoder().decode(plainBuffer);
}

async function decryptLegacyString(cipherText: string, iv: string) {
  if (!hasWindow()) {
    throw new Error('Encryption is only available in browser environments.');
  }
  const existing = window.localStorage.getItem(LEGACY_MASTER_KEY_KEY);
  if (!existing) {
    throw new Error('Legacy encryption key missing.');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(existing),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );
  const cipherBuffer = base64ToArrayBuffer(cipherText);
  const ivBuffer = base64ToArrayBuffer(iv);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    key,
    cipherBuffer
  );
  return new TextDecoder().decode(plainBuffer);
}

async function migrateLegacyState(userId: string) {
  if (!hasWindow()) {
    return { connections: [], activeConnectionId: null };
  }

  const stored = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!stored) {
    return { connections: [], activeConnectionId: null };
  }

  const parsed = JSON.parse(stored) as PersistedState;
  const connections: AIConnection[] = await Promise.all(
    parsed.connections.map(async (connection) => ({
      ...connection,
      apiKey:
        connection.credentials?.cipherText && connection.credentials.iv
          ? await decryptLegacyString(connection.credentials.cipherText, connection.credentials.iv)
          : undefined,
      status: 'idle',
      lastError: undefined,
    }))
  );

  // Persist to the user-specific namespace and clean up the legacy storage.
  await persistAIConnections(connections, parsed.activeConnectionId, userId);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_MASTER_KEY_KEY);

  return {
    connections,
    activeConnectionId: parsed.activeConnectionId,
  };
}

export async function persistAIConnections(
  connections: AIConnection[],
  activeConnectionId: string | null,
  userId: string | null
): Promise<void> {
  if (!hasWindow() || !userId) {
    return;
  }

  const storageKey = getStorageKey(userId);

  if (connections.length === 0) {
    window.localStorage.removeItem(storageKey);
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
          ? await encryptString(connection.apiKey, userId)
          : undefined,
      }))
    ),
  };

  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}

export async function persistAIChatHistory(
  messages: Record<string, PersistableChatMessage[]>,
  userId: string | null
): Promise<void> {
  if (!hasWindow() || !userId) {
    return;
  }

  const storageKey = getChatStorageKey(userId);
  const entries = Object.entries(messages);

  if (entries.length === 0) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  const payload: PersistedChatPayload = {
    version: 1,
    threads: await Promise.all(
      entries.map(async ([connectionId, history]) => {
        const serialised = JSON.stringify(history ?? []);
        const encrypted = await encryptString(serialised, userId);
        return {
          connectionId,
          cipherText: encrypted.cipherText,
          iv: encrypted.iv,
        } satisfies PersistedChatThread;
      })
    ),
  };

  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}

export async function retrieveAIChatHistory(
  userId: string | null
): Promise<Record<string, PersistableChatMessage[]>> {
  if (!hasWindow() || !userId) {
    return {};
  }

  const storageKey = getChatStorageKey(userId);
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    return {};
  }

  const parsed = JSON.parse(stored) as PersistedChatPayload;

  const historyEntries = await Promise.all(
    (parsed.threads ?? []).map(async (thread) => {
      try {
        const decrypted = await decryptString(thread.cipherText, thread.iv, userId);
        const messages = JSON.parse(decrypted) as PersistableChatMessage[];
        return [thread.connectionId, messages] as const;
      } catch (error) {
        console.error('Failed to decrypt chat thread', error);
        return null;
      }
    })
  );

  return historyEntries
    .filter((entry): entry is readonly [string, PersistableChatMessage[]] => Boolean(entry))
    .reduce<Record<string, PersistableChatMessage[]>>((accumulator, [connectionId, history]) => {
      accumulator[connectionId] = history;
      return accumulator;
    }, {});
}

export function clearAIChatHistory(userId: string | null): void {
  if (!hasWindow() || !userId) {
    return;
  }

  const storageKey = getChatStorageKey(userId);
  window.localStorage.removeItem(storageKey);
}

export async function retrieveAIConnections(userId: string | null): Promise<{
  connections: AIConnection[];
  activeConnectionId: string | null;
}> {
  if (!hasWindow() || !userId) {
    return { connections: [], activeConnectionId: null };
  }

  const storageKey = getStorageKey(userId);
  const stored = window.localStorage.getItem(storageKey);

  if (!stored) {
    return migrateLegacyState(userId);
  }

  const parsed = JSON.parse(stored) as PersistedState;
  const connections: AIConnection[] = await Promise.all(
    parsed.connections.map(async (connection) => ({
      ...connection,
      apiKey:
        connection.credentials?.cipherText && connection.credentials.iv
          ? await decryptString(connection.credentials.cipherText, connection.credentials.iv, userId)
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
