import { randomBytes } from 'node:crypto';
import { getDatabase } from '../database/connection.js';
import { env } from '../config/env.js';
import { now } from '../utils/time.js';

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  metadata?: Record<string, unknown> | null;
}

export function createSession(userId: string, metadata?: Record<string, unknown>): SessionRecord {
  const db = getDatabase();
  const token = randomBytes(32).toString('base64url');
  const createdAt = now();
  const expiresAt = createdAt + env.SESSION_TOKEN_TTL_SECONDS;

  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(token, userId, createdAt, expiresAt, metadata ? JSON.stringify(metadata) : null);

  return {
    token,
    userId,
    createdAt,
    expiresAt,
    metadata
  };
}

export function validateSession(token: string): SessionRecord | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT token, user_id as userId, created_at as createdAt, expires_at as expiresAt, metadata
    FROM sessions
    WHERE token = ?
  `).get(token) as (SessionRecord & { metadata: string | null }) | undefined;

  if (!row) {
    return null;
  }

  if (row.expiresAt < now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }

  return {
    token: row.token,
    userId: row.userId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  };
}

export function revokeSession(token: string) {
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
