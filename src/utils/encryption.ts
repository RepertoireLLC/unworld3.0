const base64Encode = (input: string) =>
  typeof window === 'undefined'
    ? Buffer.from(input, 'utf-8').toString('base64')
    : window.btoa(input);

const base64Decode = (input: string) =>
  typeof window === 'undefined'
    ? Buffer.from(input, 'base64').toString('utf-8')
    : window.atob(input);

export function generateEncryptionKey(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < length; i += 1) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

export function encryptWithKey(message: string, key: string): string {
  if (!key) {
    return message;
  }

  const result: string[] = [];
  for (let i = 0; i < message.length; i += 1) {
    const charCode = message.charCodeAt(i);
    const keyCode = key.charCodeAt(i % key.length);
    result.push(String.fromCharCode(charCode ^ keyCode));
  }

  return base64Encode(result.join(''));
}

export function decryptWithKey(payload: string, key: string): string {
  if (!key) {
    return payload;
  }

  const decoded = base64Decode(payload);
  const result: string[] = [];
  for (let i = 0; i < decoded.length; i += 1) {
    const charCode = decoded.charCodeAt(i);
    const keyCode = key.charCodeAt(i % key.length);
    result.push(String.fromCharCode(charCode ^ keyCode));
  }

  return result.join('');
}
