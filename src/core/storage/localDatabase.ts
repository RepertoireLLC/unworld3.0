import Dexie, { type Table } from 'dexie';

export interface IdentityRecord {
  id?: number;
  publicKey: string;
  secretKey: string;
  peerId: string;
  fingerprint: string;
  createdAt: number;
  updatedAt: number;
}

export interface GossipRecord {
  id?: number;
  messageId: string;
  topic: string;
  payload: unknown;
  receivedAt: number;
}

class HarmoniaMeshDatabase extends Dexie {
  identities!: Table<IdentityRecord, number>;
  gossip!: Table<GossipRecord, number>;

  constructor() {
    super('harmonia_mesh');
    this.version(1).stores({
      identities: '++id, peerId, fingerprint',
      gossip: '++id, messageId, topic',
    });
  }
}

export const meshDb = new HarmoniaMeshDatabase();

export async function persistIdentity(identity: IdentityRecord) {
  const existing = await meshDb.identities.where('peerId').equals(identity.peerId).first();
  if (existing) {
    await meshDb.identities.update(existing.id!, {
      ...identity,
      updatedAt: Date.now(),
    });
    return existing.id!;
  }

  return meshDb.identities.add({ ...identity, createdAt: Date.now(), updatedAt: Date.now() });
}

export async function loadLatestIdentity() {
  return meshDb.identities.orderBy('updatedAt').last();
}

export async function clearIdentityRecords() {
  await meshDb.identities.clear();
}

export async function persistGossip(message: GossipRecord) {
  return meshDb.gossip.put(message);
}

export async function loadRecentGossip(topic: string, limit = 32) {
  return meshDb.gossip
    .where('topic')
    .equals(topic)
    .reverse()
    .limit(limit)
    .toArray();
}

