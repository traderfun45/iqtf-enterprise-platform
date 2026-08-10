export interface MarketQuote {
  symbol: string
  price: number
  source: string
  timestamp: string
}

export interface MarketProvider {
  getQuote(symbol: string): Promise<MarketQuote>
}
