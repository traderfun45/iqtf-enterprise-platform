import type { MarketIntelligence } from './intelligence.js'

export type CachedMarketIntelligence = {
  intelligence: MarketIntelligence
  currentPrice: number
  candleCount: number
}

type CacheEntry = {
  value: CachedMarketIntelligence
  expiresAt: number
}

const CACHE_TTL_MS = 30_000

const cache = new Map<string, CacheEntry>()
const pending = new Map<string, Promise<CachedMarketIntelligence>>()

export async function getCachedMarketIntelligence(
  key: string,
  loader: () => Promise<CachedMarketIntelligence>
): Promise<CachedMarketIntelligence> {
  const now = Date.now()

  const cached = cache.get(key)

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const existing = pending.get(key)

  if (existing) {
    return existing
  }

  const request = loader()
    .then((value) => {
      cache.set(key, {
        value,
        expiresAt: Date.now() + CACHE_TTL_MS
      })

      return value
    })
    .finally(() => {
      pending.delete(key)
    })

  pending.set(key, request)

  return request
}

export function clearMarketIntelligenceCache() {
  cache.clear()
  pending.clear()
}
