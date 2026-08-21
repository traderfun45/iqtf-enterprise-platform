import { db } from './database.js'

export type CotMarketData = {
  id?: number
  symbol: string
  reportDate: string

  openInterest?: number

  producerLong?: number
  producerShort?: number

  swapDealerLong?: number
  swapDealerShort?: number

  managedMoneyLong?: number
  managedMoneyShort?: number

  otherReportablesLong?: number
  otherReportablesShort?: number

  source?: string
  note?: string
}

export function createCotMarketData(
  data: CotMarketData,
): CotMarketData {
  const result = db.prepare(`
    INSERT INTO cot_market_data (
      symbol,
      report_date,
      open_interest,
      producer_long,
      producer_short,
      swap_dealer_long,
      swap_dealer_short,
      managed_money_long,
      managed_money_short,
      other_reportables_long,
      other_reportables_short,
      source,
      note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.symbol,
    data.reportDate,
    data.openInterest ?? null,
    data.producerLong ?? null,
    data.producerShort ?? null,
    data.swapDealerLong ?? null,
    data.swapDealerShort ?? null,
    data.managedMoneyLong ?? null,
    data.managedMoneyShort ?? null,
    data.otherReportablesLong ?? null,
    data.otherReportablesShort ?? null,
    data.source ?? 'CFTC',
    data.note ?? null,
  )

  return {
    ...data,
    id: Number(result.lastInsertRowid),
  }
}

export function getLatestCotMarketData(
  symbol = 'GC',
): CotMarketData | null {
  const row = db.prepare(`
    SELECT
      id,
      symbol,
      report_date,
      open_interest,
      producer_long,
      producer_short,
      swap_dealer_long,
      swap_dealer_short,
      managed_money_long,
      managed_money_short,
      other_reportables_long,
      other_reportables_short,
      source,
      note
    FROM cot_market_data
    WHERE symbol = ?
    ORDER BY report_date DESC, id DESC
    LIMIT 1
  `).get(symbol) as any

  if (!row) return null

  return {
    id: row.id,
    symbol: row.symbol,
    reportDate: row.report_date,
    openInterest: row.open_interest,
    producerLong: row.producer_long,
    producerShort: row.producer_short,
    swapDealerLong: row.swap_dealer_long,
    swapDealerShort: row.swap_dealer_short,
    managedMoneyLong: row.managed_money_long,
    managedMoneyShort: row.managed_money_short,
    otherReportablesLong: row.other_reportables_long,
    otherReportablesShort: row.other_reportables_short,
    source: row.source,
    note: row.note,
  }
}

export function getCotMarketDataHistory(
  symbol = 'GC',
  limit = 30,
): CotMarketData[] {
  const rows = db.prepare(`
    SELECT
      id,
      symbol,
      report_date,
      open_interest,
      producer_long,
      producer_short,
      swap_dealer_long,
      swap_dealer_short,
      managed_money_long,
      managed_money_short,
      other_reportables_long,
      other_reportables_short,
      source,
      note
    FROM cot_market_data
    WHERE symbol = ?
    ORDER BY report_date DESC, id DESC
    LIMIT ?
  `).all(symbol, limit) as any[]

  return rows.map((row) => ({
    id: row.id,
    symbol: row.symbol,
    reportDate: row.report_date,
    openInterest: row.open_interest,
    producerLong: row.producer_long,
    producerShort: row.producer_short,
    swapDealerLong: row.swap_dealer_long,
    swapDealerShort: row.swap_dealer_short,
    managedMoneyLong: row.managed_money_long,
    managedMoneyShort: row.managed_money_short,
    otherReportablesLong: row.other_reportables_long,
    otherReportablesShort: row.other_reportables_short,
    source: row.source,
    note: row.note,
  }))
}
