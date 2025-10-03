import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { now } from '../utils/time.js';
import { getDatabase } from '../database/connection.js';

type PresenceStatus = 'online' | 'offline' | 'aether';

interface PresenceEvent {
  id: string;
  userId: string;
  status: PresenceStatus;
  emittedAt: number;
  signature: string;
}

class PresenceManager {
  private statuses = new Map<string, PresenceEvent>();

  upsert(event: PresenceEvent) {
    this.statuses.set(event.userId, event);
    const db = getDatabase();
    db.prepare(`
      INSERT INTO presence_events (id, user_id, status, emitted_at, signature)
      VALUES (?, ?, ?, ?, ?)
    `).run(event.id, event.userId, event.status, event.emittedAt, event.signature);
  }

  getActiveStatuses() {
    const threshold = now() - env.PRESENCE_TIMEOUT_SECONDS;
    const entries: Array<{ userId: string; status: PresenceStatus; lastSeen: number; signature: string; }> = [];
    for (const [, event] of this.statuses) {
      if (event.emittedAt >= threshold) {
        entries.push({
          userId: event.userId,
          status: event.status,
          lastSeen: event.emittedAt,
          signature: event.signature
        });
      }
    }
    return entries;
  }
}

export const presenceManager = new PresenceManager();

export function recordPresence(userId: string, status: PresenceStatus, signature: string) {
  presenceManager.upsert({
    id: nanoid(),
    userId,
    status,
    emittedAt: now(),
    signature
  });
  return presenceManager.getActiveStatuses();
}
