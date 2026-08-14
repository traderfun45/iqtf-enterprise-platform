import { apiGet } from "./api"

export type Quote = {
  symbol: string
  price: number
  source: string
  timestamp: string
  status?: string
}

export type MarketSnapshot = {
  data: Quote[]
  timestamp: string
}

export type Intelligence = {
  symbol: string
  trend: {
    direction: "bullish" | "bearish" | "neutral"
    score: number
  }
  volatility: {
    atr: number
    atrPercent: number
  }
  momentum: {
    value: number
    score: number
  }
  score: number
  signal: "bullish" | "bearish" | "neutral"
  timestamp: string
  interval: string
  candleCount: number
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  return apiGet<MarketSnapshot>("/api/market/snapshot")
}

export async function getMarketIntelligence(
  symbol = "XAUUSD",
  interval = "1h",
  outputsize = 50
): Promise<Intelligence> {
  const params = new URLSearchParams({
    symbol,
    interval,
    outputsize: String(outputsize),
  })

  return apiGet<Intelligence>(
    `/api/market/intelligence?${params.toString()}`
  )
}
