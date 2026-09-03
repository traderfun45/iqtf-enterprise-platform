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

function intervalToYahoo(interval: string): {
  interval: string
  period1: Date
} {
  const normalized = interval.toLowerCase()

  const supported = [
    '1m',
    '2m',
    '5m',
    '15m',
    '30m',
    '60m',
    '90m',
    '1h',
    '1d',
    '5d',
    '1wk',
    '1mo',
    '3mo',
  ]

  if (!supported.includes(normalized)) {
    throw new Error(`Unsupported Yahoo Finance interval: ${interval}`)
  }

  const period1 = new Date()

  if (normalized === '1h' || normalized === '60m') {
    period1.setDate(period1.getDate() - 30)
  } else if (normalized === '1d') {
    period1.setFullYear(period1.getFullYear() - 2)
  } else {
    period1.setDate(period1.getDate() - 7)
  }

  return {
    interval: normalized,
    period1,
  }
}

async function yahooChart(
  interval: string,
  period1: Date,
  period2: Date,
): Promise<any> {
  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/GC=F' +
    `?period1=${Math.floor(period1.getTime() / 1000)}` +
    `&period2=${Math.floor(period2.getTime() / 1000)}` +
    `&interval=${encodeURIComponent(interval)}` +
    '&events=history'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Yahoo Finance HTTP error: ${response.status}`)
    }

    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

export class CmeMarketProvider {
  async getQuote(symbol: string): Promise<MarketQuote> {
    const normalized = symbol.toUpperCase()

    if (normalized !== 'GC') {
      throw new Error(
        `Yahoo Finance GC provider currently supports GC only, received=${normalized}`,
      )
    }

    const period2 = new Date()
    const period1 = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const data = await yahooChart('5m', period1, period2)
    const result = data?.chart?.result?.[0]

    const price = result?.meta?.regularMarketPrice

    if (typeof price === 'number' && Number.isFinite(price)) {
      return {
        symbol: 'GC',
        price,
        source: 'yahoo',
        timestamp: new Date().toISOString(),
      }
    }

    const closes = result?.indicators?.quote?.[0]?.close ?? []

    for (let i = closes.length - 1; i >= 0; i--) {
      if (typeof closes[i] === 'number' && Number.isFinite(closes[i])) {
        return {
          symbol: 'GC',
          price: closes[i],
          source: 'yahoo',
          timestamp: new Date().toISOString(),
        }
      }
    }

    throw new Error('Yahoo Finance returned an invalid GC=F price')
  }

  async getHistory(
    symbol: string,
    params: {
      interval?: string
      outputsize?: number
      startDate?: string
      endDate?: string
    } = {},
  ): Promise<MarketCandle[]> {
    const normalized = symbol.toUpperCase()

    if (normalized !== 'GC') {
      throw new Error(
        `Yahoo Finance GC provider currently supports GC only, received=${normalized}`,
      )
    }

    const interval = params.interval ?? '1h'
    const outputsize = Math.min(
      Math.max(params.outputsize ?? 100, 1),
      5000,
    )

    const range = intervalToYahoo(interval)

    const period1 = params.startDate
      ? new Date(params.startDate)
      : range.period1

    const period2 = params.endDate
      ? new Date(params.endDate)
      : new Date()

    if (
      !Number.isFinite(period1.getTime()) ||
      !Number.isFinite(period2.getTime())
    ) {
      throw new Error('Invalid startDate or endDate')
    }

    const data = await yahooChart(
      range.interval,
      period1,
      period2,
    )

    const result = data?.chart?.result?.[0]

    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      throw new Error('Yahoo Finance returned invalid GC=F history')
    }

    const timestamps = result.timestamp
    const quote = result.indicators.quote[0]

    const candles: MarketCandle[] = []

    for (let i = 0; i < timestamps.length; i++) {
      const open = quote.open?.[i]
      const high = quote.high?.[i]
      const low = quote.low?.[i]
      const close = quote.close?.[i]
      const volume = quote.volume?.[i]

      if (
        typeof open !== 'number' ||
        typeof high !== 'number' ||
        typeof low !== 'number' ||
        typeof close !== 'number'
      ) {
        continue
      }

      candles.push({
        symbol: 'GC',
        interval,
        timestamp: new Date(timestamps[i] * 1000).toISOString(),
        open,
        high,
        low,
        close,
        ...(typeof volume === 'number'
          ? { volume }
          : {}),
      })
    }

    return candles.slice(-outputsize)
  }
}
