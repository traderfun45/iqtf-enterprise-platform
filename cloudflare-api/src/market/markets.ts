export interface Market {
  id: number
  symbol: string
  name: string | null
  provider: string | null
  created_at: string
  updated_at: string
}

export async function listMarkets(db: D1Database): Promise<Market[]> {
  const result = await db
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
    .all<Market>()

  return result.results ?? []
}

export async function getMarketBySymbol(
  db: D1Database,
  symbol: string,
): Promise<Market | undefined> {
  const result = await db
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
      LIMIT 1
    `)
    .bind(symbol.trim().toUpperCase())
    .first<Market>()

  return result ?? undefined
}

export async function createMarket(
  db: D1Database,
  symbol: string,
  name: string | null,
  provider: string | null,
): Promise<Market> {
  const normalizedSymbol = symbol.trim().toUpperCase()

  await db
    .prepare(`
      INSERT INTO markets (
        symbol,
        name,
        provider
      )
      VALUES (?, ?, ?)
    `)
    .bind(
      normalizedSymbol,
      name,
      provider,
    )
    .run()

  const market = await getMarketBySymbol(
    db,
    normalizedSymbol,
  )

  if (!market) {
    throw new Error('Market was created but could not be retrieved')
  }

  return market
}
