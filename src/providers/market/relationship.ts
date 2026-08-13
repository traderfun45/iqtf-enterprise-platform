import type { MarketQuote } from './types.js'

export type MarketRelationship = {
  base: MarketQuote
  quote: MarketQuote
  priceDifference: number
  percentDifference: number
  ratio: number
  timestamp: string
}

export function calculateMarketRelationship(
  base: MarketQuote,
  quote: MarketQuote
): MarketRelationship {
  if (!Number.isFinite(base.price) || !Number.isFinite(quote.price)) {
    throw new Error('Invalid market price')
  }

  if (quote.price === 0) {
    throw new Error('Quote price cannot be zero')
  }

  const priceDifference = base.price - quote.price

  const percentDifference =
    (priceDifference / quote.price) * 100

  const ratio = base.price / quote.price

  return {
    base,
    quote,
    priceDifference,
    percentDifference,
    ratio,
    timestamp: new Date().toISOString()
  }
}
