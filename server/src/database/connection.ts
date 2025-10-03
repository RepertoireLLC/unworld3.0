import Database from 'better-sqlite3';
import { env } from '../config/env.js';

let db: Database.Database | null = null;

export function getDatabase() {
  if (!db) {
    db = new Database(env.DATABASE_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = FULL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}
