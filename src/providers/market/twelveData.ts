import type { MarketProvider, MarketQuote } from './types.js'

function mapSymbol(symbol: string): string {
  const normalized = symbol.toUpperCase().replace(/\s+/g, '')

  if (normalized === 'XAUUSD') {
    return 'XAU/USD'
  }

  return normalized
}

export class TwelveDataMarketProvider implements MarketProvider {
  constructor(private readonly apiKey: string) {}

  async getQuote(symbol: string): Promise<MarketQuote> {
    const providerSymbol = mapSymbol(symbol)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(
        `https://api.twelvedata.com/price?symbol=${encodeURIComponent(providerSymbol)}&apikey=${encodeURIComponent(this.apiKey)}`,
        {
          signal: controller.signal
        }
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

      const price = Number(data.price)

      if (!Number.isFinite(price)) {
        throw new Error('Invalid price returned by Twelve Data')
      }

      return {
        symbol: symbol.toUpperCase(),
        price,
        source: 'twelvedata',
        timestamp: new Date().toISOString()
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
