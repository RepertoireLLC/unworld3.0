const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_INDEX: Record<string, number> = {};
for (let index = 0; index < BASE64_ALPHABET.length; index += 1) {
  BASE64_INDEX[BASE64_ALPHABET[index] ?? ''] = index;
}

function encodeBytesToBase64(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return '';
  }

  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const remaining = bytes.length - index;
    const hasSecond = remaining > 1;
    const hasThird = remaining > 2;

    const byte1 = bytes[index] ?? 0;
    const byte2 = hasSecond ? bytes[index + 1] ?? 0 : 0;
    const byte3 = hasThird ? bytes[index + 2] ?? 0 : 0;

    const chunk = (byte1 << 16) | (byte2 << 8) | byte3;

    output += BASE64_ALPHABET[(chunk >> 18) & 63] ?? '=';
    output += BASE64_ALPHABET[(chunk >> 12) & 63] ?? '=';
    output += hasSecond ? BASE64_ALPHABET[(chunk >> 6) & 63] ?? '=' : '=';
    output += hasThird ? BASE64_ALPHABET[chunk & 63] ?? '=' : '=';
  }

  return output;
}

function decodeBase64Character(character: string): number {
  const value = BASE64_INDEX[character];
  if (typeof value === 'number') {
    return value;
  }
  throw new Error(`Invalid base64 character: ${character}`);
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const sanitized = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  if (sanitized.length % 4 !== 0) {
    throw new Error('Invalid base64 string.');
  }

  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  const outputLength = (sanitized.length / 4) * 3 - padding;
  const bytes = new Uint8Array(outputLength);

  let byteIndex = 0;
  for (let index = 0; index < sanitized.length; index += 4) {
    const char1 = sanitized[index] ?? '=';
    const char2 = sanitized[index + 1] ?? '=';
    const char3 = sanitized[index + 2] ?? '=';
    const char4 = sanitized[index + 3] ?? '=';

    const sextet1 = decodeBase64Character(char1);
    const sextet2 = decodeBase64Character(char2);
    const sextet3 = char3 === '=' ? 0 : decodeBase64Character(char3);
    const sextet4 = char4 === '=' ? 0 : decodeBase64Character(char4);

    const chunk = (sextet1 << 18) | (sextet2 << 12) | (sextet3 << 6) | sextet4;

    bytes[byteIndex] = (chunk >> 16) & 0xff;
    byteIndex += 1;

    if (char3 !== '=' && byteIndex < bytes.length) {
      bytes[byteIndex] = (chunk >> 8) & 0xff;
      byteIndex += 1;
    }

    if (char4 !== '=' && byteIndex < bytes.length) {
      bytes[byteIndex] = chunk & 0xff;
      byteIndex += 1;
    }
  }

  return bytes;
}

export function encodeStringToBase64(value: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  return encodeBytesToBase64(bytes);
}

export function decodeBase64ToString(base64: string): string {
  const bytes = decodeBase64ToBytes(base64);
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return encodeBytesToBase64(new Uint8Array(buffer));
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bytes = decodeBase64ToBytes(base64);
  const { buffer, byteOffset, byteLength } = bytes;
  return buffer.slice(byteOffset, byteOffset + byteLength);
}

export function encodeBinaryToBase64(bytes: Uint8Array): string {
  return encodeBytesToBase64(bytes);
}

export function decodeBase64ToBinary(base64: string): Uint8Array {
  return decodeBase64ToBytes(base64);
}
