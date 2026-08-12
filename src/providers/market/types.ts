export interface MarketQuote {
  symbol: string
  price: number
  source: string
  timestamp: string
}

export interface MarketCandle {
  symbol: string
  interval: string
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface MarketHistoryParams {
  interval?: string
  outputsize?: number
  startDate?: string
  endDate?: string
}

export interface MarketProvider {
  getQuote(symbol: string): Promise<MarketQuote>

  getHistory?(
    symbol: string,
    params?: MarketHistoryParams
  ): Promise<MarketCandle[]>
}
