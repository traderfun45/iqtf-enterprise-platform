import { db } from './database'

export type CmeMarketData = {
  id?: number
  symbol: string
  dataDate: string
  dataTime?: string
  settlementPrice?: number
  volume?: number
  volumeZscore?: number
  openInterest?: number
  oiChange?: number
  oiZscore?: number
  source?: string
  note?: string
  createdBy?: string
  inputMethod?: 'MANUAL' | 'OCR' | 'CME_API'
  imageReference?: string
}

function mapRow(row: any): CmeMarketData {
  return {
    id: row.id,
    symbol: row.symbol,
    dataDate: row.data_date,
    dataTime: row.data_time ?? undefined,
    settlementPrice: row.settlement_price ?? undefined,
    volume: row.volume ?? undefined,
    volumeZscore: row.volume_zscore ?? undefined,
    openInterest: row.open_interest ?? undefined,
    oiChange: row.oi_change ?? undefined,
    oiZscore: row.oi_zscore ?? undefined,
    source: row.source ?? undefined,
    note: row.note ?? undefined,
    createdBy: row.created_by ?? undefined,
    inputMethod: row.input_method ?? 'MANUAL',
    imageReference: row.image_reference ?? undefined,
  }
}

export function createCmeMarketData(
  data: CmeMarketData,
): CmeMarketData {
  const stmt = db.prepare(`
    INSERT INTO cme_market_data (
      symbol,
      data_date,
      data_time,
      settlement_price,
      volume,
      volume_zscore,
      open_interest,
      oi_change,
      oi_zscore,
      source,
      note,
      created_by,
      input_method,
      image_reference
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    data.symbol,
    data.dataDate,
    data.dataTime ?? null,
    data.settlementPrice ?? null,
    data.volume ?? null,
    data.volumeZscore ?? null,
    data.openInterest ?? null,
    data.oiChange ?? null,
    data.oiZscore ?? null,
    data.source ?? 'CME',
    data.note ?? null,
    data.createdBy ?? null,
    data.inputMethod ?? 'MANUAL',
    data.imageReference ?? null,
  )

  const id = Number(result.lastInsertRowid)

  return getCmeMarketDataById(id)!
}

export function getCmeMarketDataById(
  id: number,
): CmeMarketData | null {
  const row = db
    .prepare(`
      SELECT *
      FROM cme_market_data
      WHERE id = ?
    `)
    .get(id) as any

  return row ? mapRow(row) : null
}

export function getLatestCmeMarketData(
  symbol = 'GC',
): CmeMarketData | null {
  const row = db
    .prepare(`
      SELECT *
      FROM cme_market_data
      WHERE symbol = ?
      ORDER BY data_date DESC, data_time DESC, id DESC
      LIMIT 1
    `)
    .get(symbol) as any

  return row ? mapRow(row) : null
}

export function getCmeMarketDataHistory(
  symbol = 'GC',
  limit = 30,
): CmeMarketData[] {
  const rows = db
    .prepare(`
      SELECT *
      FROM cme_market_data
      WHERE symbol = ?
      ORDER BY data_date DESC, data_time DESC, id DESC
      LIMIT ?
    `)
    .all(symbol, limit) as any[]

  return rows.map(mapRow)
}
