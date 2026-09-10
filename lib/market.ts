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

  volatilityRegime: {
    regime: "LOW" | "NORMAL" | "ELEVATED" | "HIGH"
    score: number
    atrPercent: number
  }

  momentum: {
    value: number
    score: number
  }

  structure: {
    direction: "bullish" | "bearish" | "neutral"
    score: number
    higherHigh: boolean
    higherLow: boolean
    lowerHigh: boolean
    lowerLow: boolean
    bias: "bullish" | "bearish" | "neutral"
  }

  mtf: {
    shortTerm: {
      direction: "bullish" | "bearish" | "neutral"
      score: number
    }

    mediumTerm: {
      direction: "bullish" | "bearish" | "neutral"
      score: number
    }

    alignment: "bullish" | "bearish" | "mixed" | "neutral"
    score: number
  }

  score: number
  signal: "bullish" | "bearish" | "neutral"
  timestamp: string
  interval: string
  candleCount: number
  candles: Array<{
    symbol: string
    interval: string
    timestamp: string
    open: number
    high: number
    low: number
    close: number
    volume?: number
  }>
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  return apiGet<MarketSnapshot>(
    "/api/market/snapshot",
    15000
  )
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

  const path = `/api/market/intelligence?${params.toString()}`
  let lastError: unknown

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await apiGet<Intelligence>(path, 15000)
    } catch (error) {
      lastError = error

      const message =
        error instanceof Error ? error.message : String(error)

      const retryable =
        /^(502|503|504)\b/.test(message) ||
        message.toLowerCase().includes("timeout")

      if (!retryable || attempt === 3) {
        throw error
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 500 * attempt)
      )
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Market intelligence unavailable")
}
export type CmeAnalysis = {
  success: boolean
  symbol: string

  data: {
    id: number
    symbol: string
    dataDate: string
    dataTime: string
    settlementPrice: number
    volume?: number
    volumeZscore?: number
    openInterest?: number
    oiChange?: number
    oiZscore?: number
    source: string
    inputMethod: string
  }

  intelligence: {
    priceChange: number
    priceChangePercent: number
    volumeChange: number
    volumeChangePercent: number
    openInterestChange: number
    openInterestChangePercent: number
    volumeZscore: number
    oiZscore: number
    positioning: string
    volumeConfirmation: string
    oiConfirmation: string
    confirmationScore: number
  }

  vol2vol: {
    signal: string
    confidence: string
    score: number
    priceDirection: string
    volumeDirection: string
    oiDirection: string
    positioning: string
    reasons: string[]
  }

  tradeSetup: {
    available: boolean
    decision:
      | "LONG"
      | "LONG_WATCH"
      | "NO_TRADE"
      | "SHORT_WATCH"
      | "SHORT"
    entry: number | null
    stopLoss: number | null
    takeProfit1: number | null
    takeProfit2: number | null
    takeProfit3: number | null
    riskAmount: number | null
    rewardToTp1: number | null
    rewardToTp2: number | null
    rewardToTp3: number | null
    riskRewardTp1: number | null
    riskRewardTp2: number | null
    riskRewardTp3: number | null
    reason?: string
  }

  iqtfDecision: {
    compositeScore: number
    decision:
      | "LONG"
      | "LONG_WATCH"
      | "NO_TRADE"
      | "SHORT_WATCH"
      | "SHORT"
    confidence: number
    riskState: "LOW" | "NORMAL" | "ELEVATED" | "HIGH"
    signalConflict?: boolean
    tradePermission?: "ALLOWED" | "BLOCKED"
    tradePermissionReason?: string
    components: {
      market: number
      cme: number
      vol2vol: number
    }
    reasons: string[]
    warnings: string[]
  }

  vol2volState: {
    previousState: string
    state: string
    signal: string
    confidence: string
    action: string
  }

  previousState: string

  savedState: {
    symbol: string
    state: string
    signal: string
    confidence: string
    action: string
    updatedAt?: string
  }

  historyStats: {
    records: number
    volumeChangeSamples: number
    oiChangeSamples: number
  }
}

export async function getCmeAnalysis(
  symbol = "GC"
): Promise<CmeAnalysis> {
  return apiGet<CmeAnalysis>(
    `/api/cme/analysis?symbol=${encodeURIComponent(symbol)}`,
    10000
  )
}

export type InstitutionalAnalysis = {
  success: boolean
  symbol: string

  cme: CmeAnalysis["intelligence"]

  vol2vol: CmeAnalysis["vol2vol"]

  cot: {
    intelligence: {
      managedMoneyNet: number
      producerNet: number
      swapDealerNet: number
      otherReportablesNet: number

      managedMoneyNetChange: number
      producerNetChange: number
      swapDealerNetChange: number
      otherReportablesNetChange: number

      positioning: string
      confidence: string
      score: number
      reasons: string[]
    }

    latest: {
      id: number
      symbol: string
      reportDate: string
      openInterest: number
      producerLong: number
      producerShort: number
      swapDealerLong: number
      swapDealerShort: number
      managedMoneyLong: number
      managedMoneyShort: number
      otherReportablesLong: number
      otherReportablesShort: number
      source: string
      note?: string
    }

    previous?: {
      id: number
      symbol: string
      reportDate: string
      openInterest: number
      producerLong: number
      producerShort: number
      swapDealerLong: number
      swapDealerShort: number
      managedMoneyLong: number
      managedMoneyShort: number
      otherReportablesLong: number
      otherReportablesShort: number
      source: string
      note?: string
    }
  }

  iqtfDecision: {
    compositeScore: number
    decision:
      | "LONG"
      | "LONG_WATCH"
      | "NO_TRADE"
      | "SHORT_WATCH"
      | "SHORT"
    confidence: number
    riskState: "LOW" | "NORMAL" | "ELEVATED" | "HIGH"
    signalConflict?: boolean
    tradePermission?: "ALLOWED" | "BLOCKED"
    tradePermissionReason?: string
    components: {
      market: number
      cme: number
      vol2vol: number
      cot: number
    }
    reasons: string[]
    warnings: string[]
  }

  tradeSetup: {
    available: boolean
    decision:
      | "LONG"
      | "LONG_WATCH"
      | "NO_TRADE"
      | "SHORT_WATCH"
      | "SHORT"
    entry: number | null
    stopLoss: number | null
    takeProfit1: number | null
    takeProfit2: number | null
    takeProfit3: number | null
    riskAmount: number | null
    rewardToTp1: number | null
    rewardToTp2: number | null
    rewardToTp3: number | null
    riskRewardTp1: number | null
    riskRewardTp2: number | null
    riskRewardTp3: number | null
    reason?: string
  }

  summary: {
    decision:
      | "LONG"
      | "LONG_WATCH"
      | "NO_TRADE"
      | "SHORT_WATCH"
      | "SHORT"
    confidence: number
    riskState: "LOW" | "NORMAL" | "ELEVATED" | "HIGH"
    compositeScore: number
    marketAlignment: "BULLISH" | "BEARISH" | "NEUTRAL"
    institutionalAlignment: "BULLISH" | "BEARISH" | "NEUTRAL"
    institutionalScore: number
    signalConflict: boolean
    components: {
      market: number
      cme: number
      vol2vol: number
      cot: number
    }
    reasons: string[]
    warnings: string[]
  }

  historyStats: {
    cmeRecords: number
    cotRecords: number
    volumeChangeSamples: number
    oiChangeSamples: number
  }
}

export async function getInstitutionalAnalysis(
  symbol = "GC"
): Promise<InstitutionalAnalysis> {
  return apiGet<InstitutionalAnalysis>(
    `/api/institutional/analysis?symbol=${encodeURIComponent(symbol)}`,
    10000
  )
}
type MarketQuoteResponse = {
  success: boolean
  market: {
    id: number
    symbol: string
    name: string
    provider: string
    created_at: string
    updated_at: string
  }
  quote: Quote
}

export async function getMarketQuote(
  symbol = "XAUUSD"
): Promise<Quote> {
  const response = await apiGet<MarketQuoteResponse>(
    `/api/market/quote?symbol=${encodeURIComponent(symbol)}`,
    10000
  )

  return response.quote
}

export type ExpectedMoveTimeframe = "1H" | "4H" | "D"

export type ExpectedMoveLevels = {
  minus3: number
  minus2: number
  minus1: number
  atm: number
  plus1: number
  plus2: number
  plus3: number
}

export type ExpectedMoveData = {
  symbol: string
  timeframe: ExpectedMoveTimeframe
  price: number
  hv14: number
  hv14Percent: number
  expectedMove: number
  expectedMovePercent: number
  timeFractionYears: number
  levels: ExpectedMoveLevels
  sampleSize: number
  timestamp: string
}

export type ExpectedMoveXauUsd = {
  success: boolean
  symbol: "XAUUSD"
  anchor: {
    symbol: "XAUUSD"
    price: number
    source: string
  }
  volatilitySource: {
    symbol: "GC"
    price: number
    source: string
  }
  basis: {
    spotSymbol: "XAUUSD"
    futuresSymbol: "GC"
    spotPrice: number
    futuresPrice: number
    basis: number
    basisPercent: number
    timestamp: string
  }
  data: {
    "5m": ExpectedMoveData
    "15m": ExpectedMoveData
    "1H": ExpectedMoveData
    "4H": ExpectedMoveData
    D: ExpectedMoveData
  }
  timestamp: string
}

export async function getExpectedMoveXauUsd(
  symbol = "XAUUSD"
): Promise<ExpectedMoveXauUsd> {
  return apiGet<ExpectedMoveXauUsd>(
    `/api/market/expected-move-xauusd?symbol=${encodeURIComponent(symbol)}`,
    15000
  )
}
