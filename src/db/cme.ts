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

  // สำคัญ:
  // หลังเพิ่มข้อมูลใหม่ ให้คำนวณข้อมูล CME ใหม่ทั้งชุด
  // เพื่อรองรับการ insert ข้อมูลย้อนหลัง
  recalculateCmeDerivedData(data.symbol)

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

/**
 * Recalculate derived CME fields.
 *
 * IMPORTANT:
 * History is processed ASCENDING by date.
 * This means:
 *
 * 24/8 -> 25/8 -> 26/8 -> 27/8 -> 28/8
 *
 * Therefore:
 *
 * oiChange(25/8) = OI(25/8) - OI(24/8)
 * oiChange(26/8) = OI(26/8) - OI(25/8)
 *
 * and NOT based on insertion order.
 */
export function recalculateCmeDerivedData(
  symbol = 'GC',
): void {
  const rows = db
    .prepare(`
      SELECT *
      FROM cme_market_data
      WHERE symbol = ?
      ORDER BY data_date ASC, data_time ASC, id ASC
    `)
    .all(symbol) as any[]

  if (rows.length === 0) {
    return
  }

  let previousVolume: number | undefined
  let previousOI: number | undefined

  const update = db.prepare(`
    UPDATE cme_market_data
    SET
      oi_change = ?,
      volume_zscore = ?,
      oi_zscore = ?
    WHERE id = ?
  `)

  const volumeChanges: number[] = []
  const oiChanges: number[] = []

  for (const row of rows) {
    let volumeChange: number | null = null
    let oiChange: number | null = null

    if (
      row.volume != null &&
      previousVolume != null
    ) {
      volumeChange = Number(row.volume) - previousVolume
      volumeChanges.push(volumeChange)
    }

    if (
      row.open_interest != null &&
      previousOI != null
    ) {
      oiChange = Number(row.open_interest) - previousOI
      oiChanges.push(oiChange)
    }

    /*
     * Z-score uses historical changes available BEFORE
     * the current record.
     *
     * With insufficient history => 0.
     */
    const volumeZscore =
      volumeChange != null
        ? calculateZScore(volumeChange, volumeChanges.slice(0, -1))
        : 0

    const oiZscore =
      oiChange != null
        ? calculateZScore(oiChange, oiChanges.slice(0, -1))
        : 0

    update.run(
      oiChange,
      volumeZscore,
      oiZscore,
      row.id,
    )

    if (row.volume != null) {
      previousVolume = Number(row.volume)
    }

    if (row.open_interest != null) {
      previousOI = Number(row.open_interest)
    }
  }
}

function calculateZScore(
  value: number,
  history: number[],
): number {
  if (history.length < 2) {
    return 0
  }

  const mean =
    history.reduce((sum, x) => sum + x, 0) /
    history.length

  const variance =
    history.reduce(
      (sum, x) => sum + Math.pow(x - mean, 2),
      0,
    ) / history.length

  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) {
    return 0
  }

  return (value - mean) / stdDev
}
