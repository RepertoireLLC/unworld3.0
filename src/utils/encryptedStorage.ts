import type { StateStorage } from 'zustand/middleware';

const SALT_KEY = 'notes-storage-salt';
const DEFAULT_SECRET = 'enclypse-local-notes-secret';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const isBrowser = typeof window !== 'undefined';

/**
 * Retrieve the Web Crypto API from the current environment, if available.
 */
function getCrypto() {
  if (!isBrowser) return undefined;
  return window.crypto;
}

/**
 * Convert a byte array into a base64 string without relying on Node APIs.
 */
function bytesToBase64(bytes: Uint8Array) {
  if (!isBrowser) {
    return '';
  }
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

/**
 * Convert a base64 string back into its original byte array.
 */
function base64ToBytes(base64: string) {
  if (!isBrowser) {
    return new Uint8Array();
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/**
 * Resolve the encryption secret – prefers an environment variable but
 * gracefully falls back to a deterministic default for development.
 */
function getSecret() {
  const envSecret = import.meta.env.VITE_NOTES_CRYPTO_KEY;
  return (typeof envSecret === 'string' && envSecret.trim().length > 0)
    ? envSecret.trim()
    : DEFAULT_SECRET;
}

let cachedKeyPromise: Promise<CryptoKey> | null = null;

/**
 * Ensure a salt exists for key derivation and persist it for reuse.
 */
function ensureSalt(): Uint8Array {
  if (!isBrowser) {
    return new Uint8Array(16);
  }

  const existing = window.localStorage.getItem(SALT_KEY);
  if (existing) {
    try {
      return base64ToBytes(existing);
    } catch (error) {
      console.warn('[Notes] Unable to parse stored salt, regenerating.', error);
    }
  }

  const crypto = getCrypto();
  const salt = crypto?.getRandomValues(new Uint8Array(16)) ?? new Uint8Array(16);
  try {
    window.localStorage.setItem(SALT_KEY, bytesToBase64(salt));
  } catch (error) {
    console.warn('[Notes] Unable to persist salt, encryption may be disabled.', error);
  }
  return salt;
}

/**
 * Derive the AES-GCM key from the configured secret using PBKDF2.
 */
async function deriveKey(): Promise<CryptoKey> {
  if (!isBrowser) {
    throw new Error('Encryption is only available in browser environments.');
  }

  const crypto = getCrypto();
  if (!crypto?.subtle) {
    throw new Error('WebCrypto is not available.');
  }

  const salt = ensureSalt();
  const secret = encoder.encode(getSecret());

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cache the derived key so repeated encrypt/decrypt calls reuse the promise.
 */
async function getKey() {
  if (!cachedKeyPromise) {
    cachedKeyPromise = deriveKey().catch((error) => {
      cachedKeyPromise = null;
      throw error;
    });
  }
  return cachedKeyPromise;
}

/**
 * Lightweight feature detection for WebCrypto availability in the browser.
 */
export function isEncryptionAvailable() {
  return Boolean(isBrowser && getCrypto()?.subtle);
}

/**
 * Encrypt a raw JSON payload string using AES-GCM.
 */
async function encryptValue(value: string) {
  if (!isEncryptionAvailable()) {
    return value;
  }

  const crypto = getCrypto();
  if (!crypto) {
    return value;
  }

  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(value)
  );

  const encryptedBytes = new Uint8Array(payload);
  const combined = new Uint8Array(iv.byteLength + encryptedBytes.byteLength);
  combined.set(iv, 0);
  combined.set(encryptedBytes, iv.byteLength);

  return bytesToBase64(combined);
}

/**
 * Decrypt an AES-GCM payload that was previously encrypted by this module.
 */
async function decryptValue(value: string) {
  if (!isEncryptionAvailable()) {
    return value;
  }

  const crypto = getCrypto();
  if (!crypto) {
    return value;
  }

  const combined = base64ToBytes(value);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const key = await getKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return decoder.decode(decrypted);
}

export const encryptedStorage: StateStorage = {
  /**
   * Retrieve and decrypt an entry from storage, clearing corrupted items.
   */
  async getItem(name) {
    if (!isBrowser) return null;
    const stored = window.localStorage.getItem(name);
    if (!stored) return null;

    try {
      return await decryptValue(stored);
    } catch (error) {
      console.error('[Notes] Failed to decrypt stored value, clearing entry.', error);
      window.localStorage.removeItem(name);
      return null;
    }
  },
  /**
   * Encrypt and persist an entry, falling back to plaintext on failure.
   */
  async setItem(name, value) {
    if (!isBrowser) return;

    try {
      const encrypted = await encryptValue(value);
      window.localStorage.setItem(name, encrypted);
    } catch (error) {
      console.error('[Notes] Failed to encrypt note payload, falling back to plaintext.', error);
      window.localStorage.setItem(name, value);
    }
  },
  /**
   * Remove an entry entirely from storage.
   */
  async removeItem(name) {
    if (!isBrowser) return;
    window.localStorage.removeItem(name);
  },
};
