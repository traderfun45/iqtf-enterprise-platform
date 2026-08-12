import YahooFinance from 'yahoo-finance2'
import type { MarketProvider, MarketQuote } from './types.js'

const yahooFinance = new YahooFinance()

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
      timestamp: new Date().toISOString(),
    }
  }
}
