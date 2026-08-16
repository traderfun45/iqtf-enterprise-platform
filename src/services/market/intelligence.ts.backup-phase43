import type { MarketCandle } from '../../providers/market/types.js'

export type TrendSignal = {
  direction: 'bullish' | 'bearish' | 'neutral'
  score: number
}

export type VolatilitySignal = {
  atr: number
  atrPercent: number
}

export type MomentumSignal = {
  value: number
  score: number
}

export type MarketIntelligence = {
  symbol: string
  trend: TrendSignal
  volatility: VolatilitySignal
  momentum: MomentumSignal
  score: number
  signal: 'bullish' | 'bearish' | 'neutral'
  timestamp: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function chronologicalCandles(
  candles: MarketCandle[]
): MarketCandle[] {
  return [...candles].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime()
  )
}

export function calculateTrend(
  candles: MarketCandle[]
): TrendSignal {
  if (candles.length < 2) {
    return {
      direction: 'neutral',
      score: 0
    }
  }

  const ordered = chronologicalCandles(candles)

  const first = ordered[0]
  const latest = ordered[ordered.length - 1]

  const changePercent =
    first.close !== 0
      ? ((latest.close - first.close) / first.close) * 100
      : 0

  if (changePercent > 0) {
    return {
      direction: 'bullish',
      score: clamp(changePercent / 1, 0, 1)
    }
  }

  if (changePercent < 0) {
    return {
      direction: 'bearish',
      score: clamp(changePercent / 1, -1, 0)
    }
  }

  return {
    direction: 'neutral',
    score: 0
  }
}

export function calculateVolatility(
  candles: MarketCandle[]
): VolatilitySignal {
  if (candles.length < 2) {
    return {
      atr: 0,
      atrPercent: 0
    }
  }

  const ordered = chronologicalCandles(candles)

  const trueRanges: number[] = []

  for (let i = 0; i < ordered.length; i += 1) {
    const candle = ordered[i]

    const previousClose =
      i > 0 ? ordered[i - 1].close : candle.close

    const trueRange = Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    )

    if (Number.isFinite(trueRange)) {
      trueRanges.push(trueRange)
    }
  }

  if (trueRanges.length === 0) {
    return {
      atr: 0,
      atrPercent: 0
    }
  }

  const atr =
    trueRanges.reduce(
      (sum, range) => sum + range,
      0
    ) / trueRanges.length

  const latestClose =
    ordered[ordered.length - 1].close

  const atrPercent =
    latestClose !== 0
      ? (atr / latestClose) * 100
      : 0

  return {
    atr,
    atrPercent
  }
}

export function calculateMomentum(
  candles: MarketCandle[]
): MomentumSignal {
  if (candles.length < 2) {
    return {
      value: 0,
      score: 0
    }
  }

  const ordered = chronologicalCandles(candles)

  const latest =
    ordered[ordered.length - 1].close

  const previous =
    ordered[ordered.length - 2].close

  const value =
    previous !== 0
      ? ((latest - previous) / previous) * 100
      : 0

  return {
    value,
    score: clamp(value / 0.1, -1, 1)
  }
}

export function calculateMarketIntelligence(
  candles: MarketCandle[]
): MarketIntelligence {
  if (candles.length === 0) {
    throw new Error(
      'At least one market candle is required'
    )
  }

  const ordered = chronologicalCandles(candles)

  const symbol = ordered[ordered.length - 1].symbol

  const trend = calculateTrend(ordered)
  const volatility = calculateVolatility(ordered)
  const momentum = calculateMomentum(ordered)

  const score = clamp(
    trend.score * 0.5 +
      momentum.score * 0.5,
    -1,
    1
  )

  let signal: MarketIntelligence['signal'] =
    'neutral'

  if (score > 0.2) {
    signal = 'bullish'
  } else if (score < -0.2) {
    signal = 'bearish'
  }

  return {
    symbol,
    trend,
    volatility,
    momentum,
    score,
    signal,
    timestamp: new Date().toISOString()
  }
}
