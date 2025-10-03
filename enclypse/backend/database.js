import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'enclypse.sqlite');

fs.mkdirSync(dataDir, { recursive: true });

function openDatabase(fallback = false) {
  return new sqlite3.Database(dbPath, (err) => {
    if (err && !fallback) {
      console.error('Database error, recreating schema', err.message);
      fs.rmSync(dbPath, { force: true });
      openDatabase(true);
    } else if (err) {
      throw err;
    }
  });
}

export const db = openDatabase();

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    password_hash TEXT NOT NULL,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    private_key_nonce TEXT NOT NULL,
    private_key_salt TEXT NOT NULL,
    bluetooth_identifier TEXT UNIQUE,
    bio TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, contact_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    ciphertext TEXT,
    nonce TEXT,
    attachment_path TEXT,
    attachment_nonce TEXT,
    attachment_key TEXT,
    metadata TEXT,
    status TEXT DEFAULT 'sent',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS ephemeral_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    viewer_id INTEGER NOT NULL,
    viewed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS message_unlocks (
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    theme TEXT DEFAULT 'default',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS album_members (
    album_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'viewer',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (album_id, user_id),
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS album_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL,
    uploader_id INTEGER NOT NULL,
    ciphertext TEXT NOT NULL,
    nonce TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS chat_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    creator_id INTEGER NOT NULL,
    opponent_id INTEGER NOT NULL,
    state TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (opponent_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY,
    theme TEXT DEFAULT 'default',
    sound_enabled INTEGER DEFAULT 0,
    sound_contact TEXT DEFAULT '',
    ai_sidekick INTEGER DEFAULT 0,
    avatar TEXT DEFAULT '',
    trails_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS presence_trails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    position TEXT NOT NULL,
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS constellations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    style TEXT DEFAULT 'default',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS constellation_links (
    constellation_id INTEGER NOT NULL,
    from_user INTEGER NOT NULL,
    to_user INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (constellation_id, from_user, to_user),
    FOREIGN KEY (constellation_id) REFERENCES constellations(id) ON DELETE CASCADE,
    FOREIGN KEY (from_user) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS secret_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    cipher TEXT NOT NULL,
    nonce TEXT NOT NULL,
    sealed_keys TEXT,
    audience TEXT DEFAULT '',
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS qr_treasures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    hint TEXT DEFAULT '',
    payload TEXT NOT NULL,
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS qr_claims (
    treasure_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    claimed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (treasure_id, user_id),
    FOREIGN KEY (treasure_id) REFERENCES qr_treasures(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`, (err) => {
  if (err) {
    console.error('Failed to initialize schema', err);
  }
});

db.all('PRAGMA table_info(users)', (err, rows) => {
  if (err) {
    console.error('Failed to inspect users table', err);
    return;
  }
  const hasBluetooth = rows.some((column) => column.name === 'bluetooth_identifier');
  if (!hasBluetooth) {
    db.run('ALTER TABLE users ADD COLUMN bluetooth_identifier TEXT UNIQUE', (alterErr) => {
      if (alterErr) {
        console.error('Failed to add bluetooth_identifier column', alterErr);
      }
    });
  }
  const hasBio = rows.some((column) => column.name === 'bio');
  if (!hasBio) {
    db.run('ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ""', (alterErr) => {
      if (alterErr) {
        console.error('Failed to add bio column', alterErr);
      }
    });
  }
});

db.all('PRAGMA table_info(messages)', (err, rows) => {
  if (err) {
    console.error('Failed to inspect messages table', err);
    return;
  }
  const hasMetadata = rows.some((column) => column.name === 'metadata');
  if (!hasMetadata) {
    db.run('ALTER TABLE messages ADD COLUMN metadata TEXT', (alterErr) => {
      if (alterErr) {
        console.error('Failed to add metadata column', alterErr);
      }
    });
  }
});

db.all('PRAGMA table_info(secret_links)', (err, rows) => {
  if (err) {
    console.error('Failed to inspect secret_links table', err);
    return;
  }
  const hasAudience = rows.some((column) => column.name === 'audience');
  if (!hasAudience) {
    db.run('ALTER TABLE secret_links ADD COLUMN audience TEXT DEFAULT ""', (alterErr) => {
      if (alterErr) {
        console.error('Failed to add audience column', alterErr);
      }
    });
  }
  const hasSealedKeys = rows.some((column) => column.name === 'sealed_keys');
  if (!hasSealedKeys) {
    db.run('ALTER TABLE secret_links ADD COLUMN sealed_keys TEXT', (alterErr) => {
      if (alterErr) {
        console.error('Failed to add sealed_keys column', alterErr);
      }
    });
  }
});

export function run(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function runCallback(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function get(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function all(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export const paths = {
  dataDir,
  uploadsDir: path.resolve(__dirname, '../../uploads'),
};

fs.mkdirSync(paths.uploadsDir, { recursive: true });
