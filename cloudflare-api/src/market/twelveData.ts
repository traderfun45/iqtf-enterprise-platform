export interface MarketQuote {
  symbol: string
  price: number
  source: string
  timestamp: string
}

export interface MarketCandle {
  symbol: string
  interval: string
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface MarketHistoryParams {
  interval?: string
  outputsize?: number
  startDate?: string
  endDate?: string
}

const quoteCache = new Map<string, { data: MarketQuote; expiresAt: number }>()
const historyCache = new Map<string, { data: MarketCandle[]; expiresAt: number }>()

const QUOTE_CACHE_TTL = 20_000
const HISTORY_CACHE_TTL = 60_000

function mapSymbol(symbol: string): string {
  const normalized = symbol.toUpperCase().replace(/\s+/g, '')

  switch (normalized) {
    case 'XAUUSD':
      return 'XAU/USD'
    case 'EURUSD':
      return 'EUR/USD'
    default:
      return normalized
  }
}

export class TwelveDataMarketProvider {
  constructor(
    private readonly apiKey: string,
    private readonly cache?: Cache,
  ) {}

  async getQuote(symbol: string): Promise<MarketQuote> {
    const providerSymbol = mapSymbol(symbol)

    const cached = quoteCache.get(providerSymbol)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    const cacheKey = new Request(
      `https://iqtf-cache.local/quote/${encodeURIComponent(providerSymbol)}`,
    )

    if (this.cache) {
      const shared = await this.cache.match(cacheKey)
      if (shared) {
        const data = (await shared.json()) as MarketQuote
        quoteCache.set(providerSymbol, {
          data,
          expiresAt: Date.now() + QUOTE_CACHE_TTL,
        })
        return data
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
      const url =
        `https://api.twelvedata.com/price` +
        `?symbol=${encodeURIComponent(providerSymbol)}` +
        `&apikey=${encodeURIComponent(this.apiKey)}`

      const response = await fetch(url, {
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Twelve Data HTTP error: ${response.status}`)
      }

      const data = (await response.json()) as {
        price?: string
        code?: number
        message?: string
      }

      if (!data.price) {
        throw new Error(data.message ?? 'Invalid Twelve Data response')
      }

      const price = Number(data.price)

      if (!Number.isFinite(price)) {
        throw new Error('Invalid price returned by Twelve Data')
      }

      const result = {
        symbol: symbol.toUpperCase(),
        price,
        source: 'twelvedata',
        timestamp: new Date().toISOString(),
      }

      quoteCache.set(providerSymbol, {
        data: result,
        expiresAt: Date.now() + QUOTE_CACHE_TTL,
      })

      if (this.cache) {
        const response = new Response(JSON.stringify(result), {
          headers: {
            'content-type': 'application/json',
            'cache-control': 'public, max-age=20',
          },
        })
        await this.cache.put(cacheKey, response)
      }

      return result
    } finally {
      clearTimeout(timeout)
    }
  }

  async getHistory(
    symbol: string,
    params: MarketHistoryParams = {},
  ): Promise<MarketCandle[]> {
    const providerSymbol = mapSymbol(symbol)

    const interval = params.interval ?? '1h'

    const providerInterval = interval === '5m' ? '5min' : interval === '15m' ? '15min' : interval === '1d' ? '1day' : interval
    const outputsize = Math.min(
      Math.max(params.outputsize ?? 100, 1),
      5000,
    )

    const cacheKey = `${providerSymbol}:${interval}:${outputsize}:${params.startDate ?? ''}:${params.endDate ?? ''}`
    const cached = historyCache.get(cacheKey)

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    const query = new URLSearchParams({
      symbol: providerSymbol,
      interval: providerInterval,
      outputsize: String(outputsize),
      apikey: this.apiKey,
    })

    if (params.startDate) {
      query.set('start_date', params.startDate)
    }

    if (params.endDate) {
      query.set('end_date', params.endDate)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const url =
        `https://api.twelvedata.com/time_series?${query.toString()}`

      const response = await fetch(url, {
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Twelve Data HTTP error: ${response.status}`)
      }

      const data = (await response.json()) as {
        values?: Array<{
          datetime?: string
          open?: string
          high?: string
          low?: string
          close?: string
          volume?: string
        }>
        code?: number
        message?: string
      }

      if (!data.values || !Array.isArray(data.values)) {
        throw new Error(
          data.message ?? 'Invalid Twelve Data historical response',
        )
      }

      const result = data.values
        .map((item) => {
          const open = Number(item.open)
          const high = Number(item.high)
          const low = Number(item.low)
          const close = Number(item.close)

          if (
            !item.datetime ||
            !Number.isFinite(open) ||
            !Number.isFinite(high) ||
            !Number.isFinite(low) ||
            !Number.isFinite(close)
          ) {
            return null
          }

          const volume =
            item.volume !== undefined
              ? Number(item.volume)
              : undefined

          return {
            symbol: symbol.toUpperCase(),
            interval,
            timestamp: item.datetime,
            open,
            high,
            low,
            close,
            ...(Number.isFinite(volume) ? { volume } : {}),
          }
        })
        .filter(
          (item): item is MarketCandle => item !== null,
        )

      historyCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + HISTORY_CACHE_TTL,
      })

      return result
    } finally {
      clearTimeout(timeout)
    }
  }
}
