import { getDatabase } from './connection.js';

export function initializeDatabase() {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      color_code TEXT NOT NULL,
      archetype TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_keys (
      user_id TEXT NOT NULL PRIMARY KEY,
      public_key_base64 TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      private_key_nonce TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      metadata TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contacts (
      owner_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      alias TEXT,
      verified_at INTEGER,
      created_at INTEGER NOT NULL,
      PRIMARY KEY(owner_id, contact_id),
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(contact_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friend_invites (
      id TEXT PRIMARY KEY,
      inviter_id TEXT NOT NULL,
      invitee_fingerprint TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      payload_cipher TEXT NOT NULL,
      payload_nonce TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(inviter_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY(conversation_id, user_id),
      FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      envelope TEXT NOT NULL,
      nonce TEXT NOT NULL,
      cipher_text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      delivered_at INTEGER,
      read_at INTEGER,
      mood TEXT,
      weight INTEGER DEFAULT 0,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS presence_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      emitted_at INTEGER NOT NULL,
      signature TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      media_type TEXT NOT NULL,
      cipher_text TEXT NOT NULL,
      nonce TEXT NOT NULL,
      key_cipher TEXT NOT NULL,
      key_nonce TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      secret_hint TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS album_members (
      album_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      key_cipher TEXT NOT NULL,
      key_nonce TEXT NOT NULL,
      PRIMARY KEY(album_id, user_id),
      FOREIGN KEY(album_id) REFERENCES albums(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}
