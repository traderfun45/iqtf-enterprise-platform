import type { MarketProvider } from './types.js'
import { MockMarketProvider } from './mock.js'
import { TwelveDataMarketProvider } from './twelveData.js'

const providerName = process.env.MARKET_PROVIDER ?? 'mock'
const apiKey = process.env.TWELVEDATA_API_KEY ?? ''

function createMarketProvider(): MarketProvider {
  if (providerName === 'twelvedata') {
    if (!apiKey) {
      throw new Error('TWELVEDATA_API_KEY is required when MARKET_PROVIDER=twelvedata')
    }

    return new TwelveDataMarketProvider(apiKey)
  }

  return new MockMarketProvider()
}

const marketProvider = createMarketProvider()

export function getMarketProvider(): MarketProvider {
  return marketProvider
}
