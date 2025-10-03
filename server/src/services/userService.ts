import { nanoid } from 'nanoid';
import { getDatabase } from '../database/connection.js';
import { enclypseCrypto } from '../crypto/enclypse.js';
import { now } from '../utils/time.js';
import type { UserProfile } from '../types/index.js';

export interface CreateUserInput {
  displayName: string;
  colorCode: string;
  archetype: string;
}

export interface CreatedUser {
  profile: UserProfile;
  publicKeyBase64: string;
  encryptedPrivateKey: string;
  privateKeyNonce: string;
}

export async function createUser(input: CreateUserInput): Promise<CreatedUser> {
  const db = getDatabase();
  const id = nanoid();
  const timestamp = now();
  const keyPair = await enclypseCrypto.generateIdentityKeyPair();
  const encryptedPrivateKey = await enclypseCrypto.encryptAtRest(Buffer.from(keyPair.privateKey));

  const insertUser = db.prepare(`
    INSERT INTO users (id, display_name, color_code, archetype, created_at, updated_at)
    VALUES (@id, @displayName, @colorCode, @archetype, @createdAt, @updatedAt)
  `);

  const insertKeys = db.prepare(`
    INSERT INTO user_keys (user_id, public_key_base64, encrypted_private_key, private_key_nonce)
    VALUES (@userId, @publicKey, @encryptedPrivateKey, @privateKeyNonce)
  `);

  const transaction = db.transaction(() => {
    insertUser.run({
      id,
      displayName: input.displayName,
      colorCode: input.colorCode,
      archetype: input.archetype,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    insertKeys.run({
      userId: id,
      publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
      encryptedPrivateKey: encryptedPrivateKey.cipherText,
      privateKeyNonce: encryptedPrivateKey.nonce
    });
  });

  transaction();

  return {
    profile: {
      id,
      displayName: input.displayName,
      colorCode: input.colorCode,
      archetype: input.archetype,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    publicKeyBase64: Buffer.from(keyPair.publicKey).toString('base64'),
    encryptedPrivateKey: encryptedPrivateKey.cipherText,
    privateKeyNonce: encryptedPrivateKey.nonce
  } satisfies CreatedUser;
}

export function getUserProfile(userId: string): UserProfile | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT id, display_name as displayName, color_code as colorCode, archetype, created_at as createdAt, updated_at as updatedAt
    FROM users
    WHERE id = ?
  `).get(userId) as UserProfile | undefined;

  return row ?? null;
}

export function listContacts(ownerId: string) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT c.contact_id as contactId, u.display_name as displayName, u.color_code as colorCode, u.archetype as archetype,
           c.alias as alias, c.verified_at as verifiedAt
    FROM contacts c
    JOIN users u ON u.id = c.contact_id
    WHERE c.owner_id = ?
  `).all(ownerId) as Array<{
    contactId: string;
    displayName: string;
    colorCode: string;
    archetype: string;
    alias: string | null;
    verifiedAt: number | null;
  }>;

  return rows;
}
