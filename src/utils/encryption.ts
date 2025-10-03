const MASTER_KEY_STORAGE = 'chat-master-key';

const generateKey = () => {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(16).slice(2, 18).padEnd(32, '0');
};

const getMasterKey = () => {
  if (typeof window === 'undefined') {
    return 'development-master-key';
  }
  const existing = window.localStorage.getItem(MASTER_KEY_STORAGE);
  if (existing) {
    return existing;
  }
  const key = generateKey();
  window.localStorage.setItem(MASTER_KEY_STORAGE, key);
  return key;
};

const xorEncrypt = (input: string, key: string) => {
  const inputCodes = Array.from(input).map((char) => char.charCodeAt(0));
  const keyCodes = Array.from(key).map((char) => char.charCodeAt(0));
  const encrypted = inputCodes.map((code, index) =>
    code ^ keyCodes[index % keyCodes.length]
  );
  return String.fromCharCode(...encrypted);
};

const base64Encode = (value: string) => {
  if (typeof btoa !== 'undefined') {
    return btoa(value);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'binary').toString('base64');
  }
  throw new Error('No base64 encoder available');
};

const base64Decode = (value: string) => {
  if (typeof atob !== 'undefined') {
    return atob(value);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('binary');
  }
  throw new Error('No base64 decoder available');
};

export const encryptPayload = (payload: unknown) => {
  const key = getMasterKey();
  const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const encrypted = xorEncrypt(json, key);
  return base64Encode(encrypted);
};

export const decryptPayload = <T = unknown>(payload: string): T => {
  const key = getMasterKey();
  const decoded = base64Decode(payload);
  const decrypted = xorEncrypt(decoded, key);
  return JSON.parse(decrypted) as T;
};
