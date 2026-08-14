import type { MarketProvider, MarketQuote } from '../../providers/market/types.js'

type CacheEntry = {
  expiresAt: number
  staleUntil: number
  value: MarketQuote
}

const CACHE_TTL_MS = 10_000
const STALE_MAX_MS = 60_000

const cache = new Map<string, CacheEntry>()
const pending = new Map<string, Promise<MarketQuote>>()

function refreshQuote(
  key: string,
  symbol: string,
  provider: MarketProvider
): Promise<MarketQuote> {
  const existingRequest = pending.get(key)

  if (existingRequest) {
    return existingRequest
  }

  const request = provider
    .getQuote(symbol)
    .then((value) => {
      const now = Date.now()

      cache.set(key, {
        value,
        expiresAt: now + CACHE_TTL_MS,
        staleUntil: now + STALE_MAX_MS,
      })

      return value
    })
    .finally(() => {
      pending.delete(key)
    })

  pending.set(key, request)

  return request
}

export async function getCachedMarketQuote(
  providerName: string,
  symbol: string,
  provider: MarketProvider
): Promise<MarketQuote> {
  const key = `${providerName}:${symbol.toUpperCase()}`
  const now = Date.now()
  const cached = cache.get(key)

  // Fresh cache: return immediately.
  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  // Stale cache: return immediately and refresh in background.
  if (cached && cached.staleUntil > now) {
    void refreshQuote(key, symbol, provider).catch(() => {
      // Keep the last known quote if background refresh fails.
    })

    return cached.value
  }

  // No usable cache: wait for the provider.
  return refreshQuote(key, symbol, provider)
}

export function clearMarketQuoteCache() {
  cache.clear()
  pending.clear()
}
