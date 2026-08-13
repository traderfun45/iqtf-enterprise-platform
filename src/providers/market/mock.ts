import type { MarketProvider } from './types.js'

export class MockMarketProvider implements MarketProvider {
  async getQuote(symbol: string) {
    return {
      symbol: symbol.toUpperCase(),
      price: 0,
      source: 'mock',
      timestamp: new Date().toISOString()
    }
  }
}
