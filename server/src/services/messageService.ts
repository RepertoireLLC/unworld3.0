import { nanoid } from 'nanoid';
import { getDatabase } from '../database/connection.js';
import { enclypseCrypto } from '../crypto/enclypse.js';
import { now } from '../utils/time.js';
import type { Mood, StoredMessage } from '../types/index.js';

export interface StoreMessageInput {
  conversationId: string;
  senderId: string;
  envelope: string;
  payload: Uint8Array;
  mood?: Mood;
  weight?: number;
}

export async function storeEncryptedMessage(input: StoreMessageInput): Promise<StoredMessage> {
  const db = getDatabase();
  const encrypted = await enclypseCrypto.encryptAtRest(input.payload);
  const id = nanoid();
  const createdAt = now();

  db.prepare(`
    INSERT INTO messages (id, conversation_id, sender_id, envelope, nonce, cipher_text, created_at, mood, weight)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.conversationId,
    input.senderId,
    input.envelope,
    encrypted.nonce,
    encrypted.cipherText,
    createdAt,
    input.mood ?? null,
    input.weight ?? 0
  );

  return {
    id,
    conversationId: input.conversationId,
    senderId: input.senderId,
    envelope: input.envelope,
    nonce: encrypted.nonce,
    cipherText: encrypted.cipherText,
    createdAt,
    mood: input.mood,
    weight: input.weight ?? 0
  };
}

export function getConversationMessages(conversationId: string, limit = 50): StoredMessage[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, conversation_id as conversationId, sender_id as senderId, envelope, nonce, cipher_text as cipherText,
           created_at as createdAt, delivered_at as deliveredAt, read_at as readAt, mood, weight
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(conversationId, limit) as StoredMessage[];

  return rows.reverse();
}
