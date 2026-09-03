import { TwelveDataMarketProvider } from './twelveData.js'
import { CmeMarketProvider } from './cme.js'

export interface MarketProvider {
  getQuote(symbol: string): Promise<{
    symbol: string
    price: number
    source: string
    timestamp: string
  }>

  getHistory?(
    symbol: string,
    params?: {
      interval?: string
      outputsize?: number
      startDate?: string
      endDate?: string
    },
  ): Promise<Array<{
    symbol: string
    interval: string
    timestamp: string
    open: number
    high: number
    low: number
    close: number
    volume?: number
  }>>
}

export function getMarketProvider(
  providerName: string | null | undefined,
  env: {
    TWELVEDATA_API_KEY?: string
  },
): MarketProvider {
  const provider = (providerName ?? 'mock').toLowerCase()

  if (provider === 'cme') {
    return new CmeMarketProvider()
  }

  if (provider === 'twelvedata') {
    if (!env.TWELVEDATA_API_KEY) {
      throw new Error('TWELVEDATA_API_KEY is not configured')
    }

    return new TwelveDataMarketProvider(env.TWELVEDATA_API_KEY)
  }

  throw new Error(`Unsupported market provider: ${provider}`)
}
