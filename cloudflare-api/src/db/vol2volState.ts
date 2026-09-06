export type Vol2VolStateRow = {
  symbol: string
  state: string
  signal: string
  confidence: string
  action: string
  updated_at: string
}

export async function getVol2VolState(
  db: D1Database,
  symbol: string,
): Promise<Vol2VolStateRow> {
  const row = await db
    .prepare(
      `SELECT symbol, state, signal, confidence, action, updated_at
       FROM vol2vol_state
       WHERE symbol = ?`,
    )
    .bind(symbol)
    .first<Vol2VolStateRow>()

  return row ?? {
    symbol,
    state: 'NO_POSITION',
    signal: 'NO_TRADE',
    confidence: 'LOW',
    action: 'WAIT',
    updated_at: new Date().toISOString(),
  }
}

export async function saveVol2VolState(
  db: D1Database,
  data: {
    symbol: string
    state: string
    signal: string
    confidence: string
    action: string
  },
): Promise<Vol2VolStateRow> {
  const result = await db
    .prepare(
      `INSERT INTO vol2vol_state
       (symbol, state, signal, confidence, action, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(symbol) DO UPDATE SET
         state = excluded.state,
         signal = excluded.signal,
         confidence = excluded.confidence,
         action = excluded.action,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      data.symbol,
      data.state,
      data.signal,
      data.confidence,
      data.action,
    )
    .run()

  if (!result.success) {
    throw new Error('Failed to save Vol2Vol state')
  }

  return getVol2VolState(db, data.symbol)
}
