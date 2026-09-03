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
  constructor(private readonly apiKey: string) {}

  async getQuote(symbol: string): Promise<MarketQuote> {
    const providerSymbol = mapSymbol(symbol)

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

      return {
        symbol: symbol.toUpperCase(),
        price,
        source: 'twelvedata',
        timestamp: new Date().toISOString(),
      }
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

    const outputsize = Math.min(
      Math.max(params.outputsize ?? 100, 1),
      5000,
    )

    const query = new URLSearchParams({
      symbol: providerSymbol,
      interval,
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

      return data.values
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
    } finally {
      clearTimeout(timeout)
    }
  }
}
