import type { MarketProvider } from './types.js'
import { MockMarketProvider } from './mock.js'
import { TwelveDataMarketProvider } from './twelveData.js'

const defaultProviderName = process.env.MARKET_PROVIDER ?? 'mock'
const apiKey = process.env.TWELVEDATA_API_KEY ?? ''

function createMarketProvider(providerName: string): MarketProvider {
  if (providerName === 'twelvedata') {
    if (!apiKey) {
      throw new Error(
        'TWELVEDATA_API_KEY is required when provider=twelvedata'
      )
    }

    return new TwelveDataMarketProvider(apiKey)
  }

  if (providerName === 'mock') {
    return new MockMarketProvider()
  }

  throw new Error(`Unsupported market provider: ${providerName}`)
}

export function getMarketProvider(
  providerName: string = defaultProviderName
): MarketProvider {
  return createMarketProvider(providerName)
}
