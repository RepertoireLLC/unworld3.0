type BufferLike = {
  from: (input: Uint8Array | string, encoding?: string) => {
    toString: (encoding: string) => string;
  };
};

const globalScope = globalThis as unknown as {
  Buffer?: BufferLike;
  atob?: typeof atob;
  btoa?: typeof btoa;
};

export function encodeBase64(data: Uint8Array): string {
  if (typeof globalScope.btoa === 'function') {
    let binary = '';
    data.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return globalScope.btoa(binary);
  }

  if (globalScope.Buffer) {
    return globalScope.Buffer.from(data).toString('base64');
  }

  throw new Error('No base64 encoder available in this environment');
}

export function decodeBase64(value: string): Uint8Array {
  if (typeof globalScope.atob === 'function') {
    const binary = globalScope.atob(value);
    const buffer = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      buffer[index] = binary.charCodeAt(index);
    }
    return buffer;
  }

  if (globalScope.Buffer) {
    return Uint8Array.from(globalScope.Buffer.from(value, 'base64'));
  }

  throw new Error('No base64 decoder available in this environment');
}

