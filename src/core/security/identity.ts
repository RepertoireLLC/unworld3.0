import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from '../utils/base64';
import {
  clearIdentityRecords,
  loadLatestIdentity,
  persistIdentity,
  type IdentityRecord,
} from '../storage/localDatabase';
import type { PeerIdentity } from '../p2p/types';

export interface IdentityManagerOptions {
  fingerprintPrefix?: string;
}

const FINGERPRINT_PREFIX = 'HM-';

export async function loadOrCreateIdentity(options: IdentityManagerOptions = {}): Promise<PeerIdentity> {
  const existing = await loadLatestIdentity();
  if (existing) {
    return toPeerIdentity(existing);
  }

  const keypair = nacl.sign.keyPair();
  const publicKey = encodeBase64(keypair.publicKey);
  const secretKey = encodeBase64(keypair.secretKey);
  const fingerprint = buildFingerprint(keypair.publicKey, options.fingerprintPrefix);

  const record: IdentityRecord = {
    publicKey,
    secretKey,
    peerId: fingerprint,
    fingerprint,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await persistIdentity(record);

  return toPeerIdentity(record);
}

export async function rotateIdentity(options: IdentityManagerOptions = {}): Promise<PeerIdentity> {
  const keypair = nacl.sign.keyPair();
  const publicKey = encodeBase64(keypair.publicKey);
  const secretKey = encodeBase64(keypair.secretKey);
  const fingerprint = buildFingerprint(keypair.publicKey, options.fingerprintPrefix);

  const record: IdentityRecord = {
    publicKey,
    secretKey,
    peerId: fingerprint,
    fingerprint,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await clearIdentityRecords();
  await persistIdentity(record);

  return toPeerIdentity(record);
}

export async function burnIdentity(): Promise<void> {
  await clearIdentityRecords();
}

export function signPayload(payload: unknown, secretKeyBase64: string): string {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const secretKey = decodeBase64(secretKeyBase64);
  const signature = nacl.sign.detached(new TextEncoder().encode(serialized), secretKey);
  return encodeBase64(signature);
}

export function verifySignature(payload: unknown, signatureBase64: string, publicKeyBase64: string): boolean {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = decodeBase64(signatureBase64);
  const publicKey = decodeBase64(publicKeyBase64);
  return nacl.sign.detached.verify(new TextEncoder().encode(serialized), signature, publicKey);
}

function buildFingerprint(publicKey: Uint8Array, prefix = FINGERPRINT_PREFIX) {
  const digest = nacl.hash(publicKey).slice(0, 16);
  return prefix + toHex(digest);
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function toPeerIdentity(record: IdentityRecord): PeerIdentity {
  return {
    publicKey: record.publicKey,
    secretKey: record.secretKey,
    peerId: record.peerId,
    fingerprint: record.fingerprint,
  };
}

