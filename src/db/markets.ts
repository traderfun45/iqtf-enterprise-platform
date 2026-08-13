import { db } from './database.js'

export type Market = {
  id: number
  symbol: string
  name: string | null
  provider: string | null
  created_at: string
  updated_at: string
}

export function listMarkets(): Market[] {
  return db
    .prepare(`
      SELECT
        id,
        symbol,
        name,
        provider,
        created_at,
        updated_at
      FROM markets
      ORDER BY symbol ASC
    `)
    .all() as Market[]
}

export function getMarketBySymbol(symbol: string): Market | undefined {
  return db
    .prepare(`
      SELECT
        id,
        symbol,
        name,
        provider,
        created_at,
        updated_at
      FROM markets
      WHERE symbol = ?
    `)
    .get(symbol) as Market | undefined
}

export function createMarket(
  symbol: string,
  name: string | null,
  provider: string | null
): Market {
  const normalizedSymbol = symbol.trim().toUpperCase()

  db.prepare(`
    INSERT INTO markets (
      symbol,
      name,
      provider
    )
    VALUES (?, ?, ?)
  `).run(
    normalizedSymbol,
    name,
    provider
  )

  return getMarketBySymbol(normalizedSymbol)!
}
