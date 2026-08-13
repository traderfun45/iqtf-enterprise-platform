import YahooFinance from 'yahoo-finance2'
import type {
  MarketProvider,
  MarketQuote,
  MarketCandle,
  MarketHistoryParams
} from './types.js'

const yahooFinance = new YahooFinance()

function intervalToPeriod(interval: string): {
  interval: '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo'
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
    '3mo'
  ] as const

  if (!supported.includes(normalized as typeof supported[number])) {
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
    interval: normalized as typeof supported[number],
    period1
  }
}

export class CmeMarketProvider implements MarketProvider {
  async getQuote(symbol: string): Promise<MarketQuote> {
    const normalizedSymbol = symbol.toUpperCase()

    if (normalizedSymbol !== 'GC') {
      throw new Error(
        `Yahoo Finance GC provider currently supports GC only, received=${normalizedSymbol}`
      )
    }

    const quote = await yahooFinance.quote('GC=F')

    const price = quote.regularMarketPrice

    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new Error('Yahoo Finance returned an invalid GC=F price')
    }

    return {
      symbol: 'GC',
      price,
      source: 'yahoo',
      timestamp: new Date().toISOString()
    }
  }

  async getHistory(
    symbol: string,
    params: MarketHistoryParams = {}
  ): Promise<MarketCandle[]> {
    const normalizedSymbol = symbol.toUpperCase()

    if (normalizedSymbol !== 'GC') {
      throw new Error(
        `Yahoo Finance GC provider currently supports GC only, received=${normalizedSymbol}`
      )
    }

    const interval = params.interval ?? '1h'
    const outputsize = Math.min(
      Math.max(params.outputsize ?? 100, 1),
      5000
    )

    const range = intervalToPeriod(interval)

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

    const chart = await yahooFinance.chart('GC=F', {
      period1,
      period2,
      interval: range.interval
    })

    const quotes = chart.quotes
  .filter(
    (item): item is typeof item & {
      date: Date
      open: number
      high: number
      low: number
      close: number
    } =>
      item.date instanceof Date &&
      typeof item.open === 'number' &&
      typeof item.high === 'number' &&
      typeof item.low === 'number' &&
      typeof item.close === 'number'
  )
  .slice(-outputsize)

    return quotes.map((item) => ({
      symbol: 'GC',
      interval,
      timestamp: item.date.toISOString(),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      ...(typeof item.volume === 'number'
        ? { volume: item.volume }
        : {})
    }))
  }
}
