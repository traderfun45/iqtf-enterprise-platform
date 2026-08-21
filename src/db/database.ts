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

  CREATE TABLE IF NOT EXISTS cme_market_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    data_date TEXT NOT NULL,
    data_time TEXT,
    settlement_price REAL,
    volume INTEGER,
    volume_zscore REAL,
    open_interest INTEGER,
    oi_change INTEGER,
    oi_zscore REAL,
    source TEXT NOT NULL DEFAULT 'CME',
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
  );
    CREATE TABLE IF NOT EXISTS vol2vol_state (
    symbol TEXT PRIMARY KEY,
    state TEXT NOT NULL DEFAULT 'NO_POSITION',
    signal TEXT NOT NULL DEFAULT 'NO_TRADE',
    confidence TEXT NOT NULL DEFAULT 'LOW',
    action TEXT NOT NULL DEFAULT 'WAIT',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
try {
  db.exec(`
    ALTER TABLE cme_market_data
    ADD COLUMN input_method TEXT NOT NULL DEFAULT 'MANUAL';
  `)
} catch {
  // Column already exists
}

try {
  db.exec(`
    ALTER TABLE cme_market_data
    ADD COLUMN image_reference TEXT;
  `)
} catch {
  // Column already exists
}
db.exec(`
  INSERT OR IGNORE INTO markets (symbol, name, provider)
  VALUES
    ('XAUUSD', 'Gold Spot', 'twelvedata'),
    ('GC', 'Gold Futures', 'cme'),
    ('EURUSD', 'Euro / US Dollar', 'twelvedata');
`)
