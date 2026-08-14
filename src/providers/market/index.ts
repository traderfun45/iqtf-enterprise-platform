import type { MarketProvider } from './types.js'
import { MockMarketProvider } from './mock.js'
import { TwelveDataMarketProvider } from './twelveData.js'
import { CmeMarketProvider } from './cme.js'

const defaultProviderName = process.env.MARKET_PROVIDER ?? 'mock'
const apiKey = process.env.TWELVEDATA_API_KEY ?? ''

const providers = new Map<string, MarketProvider>()

function createMarketProvider(providerName: string): MarketProvider {
  if (providerName === 'twelvedata') {
    if (!apiKey) {
      throw new Error(
        'TWELVEDATA_API_KEY is required when provider=twelvedata'
      )
    }

    return new TwelveDataMarketProvider(apiKey)
  }

  if (providerName === 'cme') {
    return new CmeMarketProvider()
  }

  if (providerName === 'mock') {
    return new MockMarketProvider()
  }

  throw new Error(`Unsupported market provider: ${providerName}`)
}

export function getMarketProvider(
  providerName: string = defaultProviderName
): MarketProvider {
  const existing = providers.get(providerName)

  if (existing) {
    return existing
  }

  const provider = createMarketProvider(providerName)

  providers.set(providerName, provider)

  return provider
}
