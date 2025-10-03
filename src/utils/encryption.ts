const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string) => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const importKey = async (keyBase64: string) => {
  const keyBuffer = base64ToArrayBuffer(keyBase64);
  return crypto.subtle.importKey('raw', keyBuffer, 'AES-GCM', false, ['encrypt', 'decrypt']);
};

const generateIv = () => {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
};

export const encryptText = async (keyBase64: string, text: string) => {
  const key = await importKey(keyBase64);
  const iv = generateIv();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(text)
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
};

export const decryptText = async (keyBase64: string, ciphertext: string, ivBase64: string) => {
  const key = await importKey(keyBase64);
  const ivArray = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivArray },
    key,
    base64ToArrayBuffer(ciphertext)
  );

  return textDecoder.decode(decrypted);
};

export const encryptBuffer = async (keyBase64: string, buffer: ArrayBuffer) => {
  const key = await importKey(keyBase64);
  const iv = generateIv();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    buffer
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
};

export const decryptBuffer = async (keyBase64: string, ciphertext: string, ivBase64: string) => {
  const key = await importKey(keyBase64);
  const ivArray = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivArray },
    key,
    base64ToArrayBuffer(ciphertext)
  );

  return decrypted;
};

export const bufferToDataUrl = (buffer: ArrayBuffer, mimeType: string) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
};

