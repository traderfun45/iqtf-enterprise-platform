import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'

const dbPath = path.resolve(process.cwd(), 'iqtf.db')

export const db = new DatabaseSync(dbPath)

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS markets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT,
    provider TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)
db.exec(`
  INSERT OR IGNORE INTO markets (symbol, name, provider)
  VALUES
    ('XAUUSD', 'Gold Spot', 'twelvedata'),
    ('GC', 'Gold Futures', 'cme'),
    ('EURUSD', 'Euro / US Dollar', 'twelvedata');
`)
