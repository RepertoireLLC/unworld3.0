const textEncoder = new TextEncoder();

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  if (!passphrase) {
    throw new Error('An encryption key is required.');
  }
  const passphraseData = textEncoder.encode(passphrase);
  const hashBuffer = await crypto.subtle.digest('SHA-256', passphraseData);
  return crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export interface EncryptedPayload {
  data: string;
  iv: string;
  mimeType: string;
  size: number;
}

export async function encryptFile(file: File, passphrase: string): Promise<EncryptedPayload> {
  const key = await deriveKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fileBuffer);

  return {
    data: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
  };
}

export async function decryptPayload(payload: EncryptedPayload, passphrase: string): Promise<ArrayBuffer> {
  const key = await deriveKey(passphrase);
  const ivBuffer = base64ToArrayBuffer(payload.iv);
  const encryptedBuffer = base64ToArrayBuffer(payload.data);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(ivBuffer) }, key, encryptedBuffer);
}

export function payloadToObjectUrl(payload: ArrayBuffer, mimeType: string): string {
  const blob = new Blob([payload], { type: mimeType });
  return URL.createObjectURL(blob);
}
