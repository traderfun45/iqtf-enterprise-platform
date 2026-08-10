import type { MarketProvider } from './types.js'
import { MockMarketProvider } from './mock.js'

const marketProvider: MarketProvider = new MockMarketProvider()

export function getMarketProvider(): MarketProvider {
  return marketProvider
}
