import { db } from './database.js'

export type TradeDirection = 'LONG' | 'SHORT'
export type TradePlanStatus = 'ACTIVE' | 'CLOSED' | 'CANCELLED'

export type TradePlan = {
  id?: number
  symbol: string
  direction: TradeDirection
  entryPrice: number
  stopLoss: number
  tp1: number
  tp2: number
  tp3: number
  status?: TradePlanStatus
  note?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

function mapRow(row: any): TradePlan {
  return {
    id: row.id,
    symbol: row.symbol,
    direction: row.direction,
    entryPrice: row.entry_price,
    stopLoss: row.stop_loss,
    tp1: row.tp1,
    tp2: row.tp2,
    tp3: row.tp3,
    status: row.status,
    note: row.note ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function validatePlan(data: TradePlan) {
  const prices = [
    data.entryPrice,
    data.stopLoss,
    data.tp1,
    data.tp2,
    data.tp3,
  ]

  if (!prices.every(Number.isFinite)) {
    throw new Error('All trade prices must be valid numbers')
  }

  if (data.entryPrice <= 0 || data.stopLoss <= 0 ||
      data.tp1 <= 0 || data.tp2 <= 0 || data.tp3 <= 0) {
    throw new Error('Trade prices must be greater than zero')
  }

  if (data.direction === 'LONG') {
    if (!(data.stopLoss < data.entryPrice &&
          data.entryPrice < data.tp1 &&
          data.tp1 < data.tp2 &&
          data.tp2 < data.tp3)) {
      throw new Error(
        'LONG validation: SL < Entry < TP1 < TP2 < TP3',
      )
    }
  }

  if (data.direction === 'SHORT') {
    if (!(data.tp3 < data.tp2 &&
          data.tp2 < data.tp1 &&
          data.tp1 < data.entryPrice &&
          data.entryPrice < data.stopLoss)) {
      throw new Error(
        'SHORT validation: TP3 < TP2 < TP1 < Entry < SL',
      )
    }
  }
}

export function createTradePlan(data: TradePlan): TradePlan {
  validatePlan(data)

  const stmt = db.prepare(`
    INSERT INTO trade_plans (
      symbol,
      direction,
      entry_price,
      stop_loss,
      tp1,
      tp2,
      tp3,
      status,
      note,
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    data.symbol,
    data.direction,
    data.entryPrice,
    data.stopLoss,
    data.tp1,
    data.tp2,
    data.tp3,
    data.status ?? 'ACTIVE',
    data.note ?? null,
    data.createdBy ?? null,
  )

  return getTradePlanById(Number(result.lastInsertRowid))!
}

export function getTradePlanById(id: number): TradePlan | null {
  const row = db.prepare(`
    SELECT *
    FROM trade_plans
    WHERE id = ?
  `).get(id) as any

  return row ? mapRow(row) : null
}

export function getLatestTradePlan(symbol = 'GC'): TradePlan | null {
  const row = db.prepare(`
    SELECT *
    FROM trade_plans
    WHERE symbol = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).get(symbol) as any

  return row ? mapRow(row) : null
}

export function getTradePlanHistory(
  symbol = 'GC',
  limit = 30,
): TradePlan[] {
  const rows = db.prepare(`
    SELECT *
    FROM trade_plans
    WHERE symbol = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(symbol, limit) as any[]

  return rows.map(mapRow)
}

export function updateTradePlan(
  id: number,
  data: Partial<TradePlan>,
): TradePlan {
  const current = getTradePlanById(id)

  if (!current) {
    throw new Error('Trade plan not found')
  }

  const next: TradePlan = {
    ...current,
    ...data,
    id,
  }

  validatePlan(next)

  db.prepare(`
    UPDATE trade_plans
    SET
      symbol = ?,
      direction = ?,
      entry_price = ?,
      stop_loss = ?,
      tp1 = ?,
      tp2 = ?,
      tp3 = ?,
      status = ?,
      note = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    next.symbol,
    next.direction,
    next.entryPrice,
    next.stopLoss,
    next.tp1,
    next.tp2,
    next.tp3,
    next.status ?? 'ACTIVE',
    next.note ?? null,
    id,
  )

  return getTradePlanById(id)!
}

export function deleteTradePlan(id: number): boolean {
  const result = db.prepare(`
    DELETE FROM trade_plans
    WHERE id = ?
  `).run(id)

  return Number(result.changes) > 0
}
