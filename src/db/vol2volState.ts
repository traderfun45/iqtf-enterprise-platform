import { db } from './database.js'

export type Vol2VolState =
  | 'NO_POSITION'
  | 'LONG_ACTIVE'
  | 'SHORT_ACTIVE'

export type Vol2VolSignal =
  | 'LONG_ENTRY'
  | 'SHORT_ENTRY'
  | 'LONG_HOLD'
  | 'SHORT_HOLD'
  | 'LONG_EXIT'
  | 'SHORT_EXIT'
  | 'NO_TRADE'

export type Vol2VolConfidence =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'

export type Vol2VolAction =
  | 'ENTER_LONG'
  | 'ENTER_SHORT'
  | 'HOLD_LONG'
  | 'HOLD_SHORT'
  | 'EXIT_LONG'
  | 'EXIT_SHORT'
  | 'WAIT'

export type StoredVol2VolState = {
  symbol: string
  state: Vol2VolState
  signal: Vol2VolSignal
  confidence: Vol2VolConfidence
  action: Vol2VolAction
  updatedAt?: string
}

function mapRow(row: any): StoredVol2VolState {
  return {
    symbol: row.symbol,
    state: row.state,
    signal: row.signal,
    confidence: row.confidence,
    action: row.action,
    updatedAt: row.updated_at,
  }
}

export function getVol2VolState(
  symbol = 'GC',
): StoredVol2VolState {
  const row = db
    .prepare(`
      SELECT
        symbol,
        state,
        signal,
        confidence,
        action,
        updated_at
      FROM vol2vol_state
      WHERE symbol = ?
      LIMIT 1
    `)
    .get(symbol) as any

  if (!row) {
    return {
      symbol,
      state: 'NO_POSITION',
      signal: 'NO_TRADE',
      confidence: 'LOW',
      action: 'WAIT',
    }
  }

  return mapRow(row)
}

export function saveVol2VolState(
  data: StoredVol2VolState,
): StoredVol2VolState {
  db.prepare(`
    INSERT INTO vol2vol_state (
      symbol,
      state,
      signal,
      confidence,
      action,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(symbol)
    DO UPDATE SET
      state = excluded.state,
      signal = excluded.signal,
      confidence = excluded.confidence,
      action = excluded.action,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    data.symbol,
    data.state,
    data.signal,
    data.confidence,
    data.action,
  )

  return getVol2VolState(data.symbol)
}
