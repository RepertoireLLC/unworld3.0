import Database from 'better-sqlite3';
import { config } from './config';

const db = new Database(config.databasePath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    industries TEXT,
    interests TEXT,
    skills TEXT,
    location TEXT,
    visibility_layers TEXT,
    visibility_preferences TEXT,
    bio TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    visibility TEXT NOT NULL,
    published INTEGER DEFAULT 0,
    payload TEXT,
    encrypted_payload BLOB,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );
`);

export { db };
