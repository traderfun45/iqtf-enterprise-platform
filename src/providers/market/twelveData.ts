import type { MarketProvider, MarketQuote } from './types.js'

export class TwelveDataMarketProvider implements MarketProvider {
  constructor(private readonly apiKey: string) {}

  async getQuote(symbol: string): Promise<MarketQuote> {
    const response = await fetch(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(this.apiKey)}`
    )

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

    return {
      symbol: symbol.toUpperCase(),
      price: Number(data.price),
      source: 'twelvedata',
      timestamp: new Date().toISOString()
    }
  }
}
