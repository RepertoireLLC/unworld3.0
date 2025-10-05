import crypto from 'node:crypto';

export const hashIdentifier = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');
