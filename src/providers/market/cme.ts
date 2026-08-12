import type { MarketProvider, MarketQuote } from './types.js'

export class CmeMarketProvider implements MarketProvider {
  async getQuote(symbol: string): Promise<MarketQuote> {
    throw new Error(
      `CME market data provider is not configured for symbol=${symbol.toUpperCase()}`
    )
  }
}
