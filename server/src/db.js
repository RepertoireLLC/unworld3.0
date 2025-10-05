import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'enclypse.db');
export const db = new DatabaseSync(dbPath);

db.exec(`
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  color TEXT,
  bio TEXT,
  profile_picture TEXT,
  presence TEXT NOT NULL DEFAULT 'offline',
  last_seen INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  is_direct INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  last_joined_at INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  client_message_id TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS read_receipts (
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message_id TEXT,
  read_at INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
);
`);

const selectUsers = db.prepare('SELECT COUNT(*) as count FROM users');
if (selectUsers.get().count === 0) {
  const now = Date.now();
  const users = [
    { id: 'user_alex', name: 'Alex Vega', color: '#7c3aed', email: 'alex@example.com' },
    { id: 'user_jules', name: 'Jules Kim', color: '#22d3ee', email: 'jules@example.com' },
    { id: 'user_sam', name: 'Sam Rivera', color: '#f97316', email: 'sam@example.com' }
  ];
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, color, presence, created_at, updated_at)
    VALUES (@id, @name, @email, @color, 'offline', @created_at, @updated_at)
  `);
  const insertConversation = db.prepare(`
    INSERT INTO conversations (id, title, is_direct, created_at, updated_at)
    VALUES (@id, @title, @is_direct, @created_at, @updated_at)
  `);
  const insertMember = db.prepare(`
    INSERT INTO conversation_members (conversation_id, user_id, role, last_joined_at)
    VALUES (@conversation_id, @user_id, 'member', @last_joined_at)
  `);
  const insertMessage = db.prepare(`
    INSERT INTO messages (id, conversation_id, sender_id, body, created_at)
    VALUES (@id, @conversation_id, @sender_id, @body, @created_at)
  `);

  const directConversationId = randomUUID();

  db.transaction(() => {
    users.forEach((user) => {
      insertUser.run({ ...user, created_at: now, updated_at: now });
    });

    insertConversation.run({
      id: directConversationId,
      title: null,
      is_direct: 1,
      created_at: now,
      updated_at: now
    });

    insertMember.run({ conversation_id: directConversationId, user_id: 'user_alex', last_joined_at: now });
    insertMember.run({ conversation_id: directConversationId, user_id: 'user_jules', last_joined_at: now });

    insertMessage.run({
      id: randomUUID(),
      conversation_id: directConversationId,
      sender_id: 'user_alex',
      body: 'Hey Jules, ready for the demo review?',
      created_at: now - 1000 * 60 * 5
    });

    insertMessage.run({
      id: randomUUID(),
      conversation_id: directConversationId,
      sender_id: 'user_jules',
      body: 'Absolutely! Uploading the final build now.',
      created_at: now - 1000 * 60 * 4
    });
  })();
}

export function now() {
  return Date.now();
}
