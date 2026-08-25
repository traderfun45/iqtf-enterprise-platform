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

export type StructureSignal = {
  direction: 'bullish' | 'bearish' | 'neutral'
  score: number
  higherHigh: boolean
  higherLow: boolean
  lowerHigh: boolean
  lowerLow: boolean
  bias: 'bullish' | 'bearish' | 'neutral'
}

export type VolatilityRegime = {
  regime: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH'
  score: number
  atrPercent: number
}

export type MTFSignal = {
  shortTerm: TrendSignal
  mediumTerm: TrendSignal
  alignment: 'bullish' | 'bearish' | 'mixed' | 'neutral'
  score: number
}

export type MarketIntelligence = {
  symbol: string
  trend: TrendSignal
  volatility: VolatilitySignal
  volatilityRegime: VolatilityRegime
  momentum: MomentumSignal
  structure: StructureSignal
  mtf: MTFSignal
  score: number
  signal: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  riskState: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH'
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

  const score = clamp(changePercent / 1, -1, 1)

  let direction: TrendSignal['direction'] = 'neutral'

  if (score > 0.05) {
    direction = 'bullish'
  } else if (score < -0.05) {
    direction = 'bearish'
  }

  return {
    direction,
    score
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

  const window = ordered.slice(
    Math.max(0, ordered.length - Math.min(4, ordered.length))
  )

  const first = window[0]
  const latest = window[window.length - 1]

  const value =
    first.close !== 0
      ? ((latest.close - first.close) / first.close) * 100
      : 0

  return {
    value,
    score: clamp(value / 0.30, -1, 1)
  }
}

export function calculateStructure(
  candles: MarketCandle[]
): StructureSignal {
  if (candles.length < 4) {
    return {
      direction: 'neutral',
      score: 0,
      higherHigh: false,
      higherLow: false,
      lowerHigh: false,
      lowerLow: false,
      bias: 'neutral'
    }
  }

  const ordered = chronologicalCandles(candles)

  const midpoint = Math.max(
    2,
    Math.floor(ordered.length / 2)
  )

  const firstHalf = ordered.slice(0, midpoint)
  const secondHalf = ordered.slice(midpoint)

  const previousHigh = Math.max(
    ...firstHalf.map((candle) => candle.high)
  )

  const latestHigh = Math.max(
    ...secondHalf.map((candle) => candle.high)
  )

  const previousLow = Math.min(
    ...firstHalf.map((candle) => candle.low)
  )

  const latestLow = Math.min(
    ...secondHalf.map((candle) => candle.low)
  )

  const higherHigh = latestHigh > previousHigh
  const higherLow = latestLow > previousLow

  const lowerHigh = latestHigh < previousHigh
  const lowerLow = latestLow < previousLow

  let score = 0

  if (higherHigh) score += 0.5
  if (higherLow) score += 0.5

  if (lowerHigh) score -= 0.5
  if (lowerLow) score -= 0.5

  score = clamp(score, -1, 1)

  let direction: StructureSignal['direction'] = 'neutral'

  if (score > 0.05) {
    direction = 'bullish'
  } else if (score < -0.05) {
    direction = 'bearish'
  }

  return {
    direction,
    score,
    higherHigh,
    higherLow,
    lowerHigh,
    lowerLow,
    bias: direction
  }
}

export function calculateVolatilityRegime(
  volatility: VolatilitySignal
): VolatilityRegime {
  const atrPercent = volatility.atrPercent

  if (atrPercent < 0.15) {
    return {
      regime: 'LOW',
      score: 0,
      atrPercent
    }
  }

  if (atrPercent < 0.30) {
    return {
      regime: 'NORMAL',
      score: 0,
      atrPercent
    }
  }

  if (atrPercent < 0.50) {
    return {
      regime: 'ELEVATED',
      score: -0.2,
      atrPercent
    }
  }

  return {
    regime: 'HIGH',
    score: -0.4,
    atrPercent
  }
}

export function calculateMTF(
  candles: MarketCandle[]
): MTFSignal {
  const ordered = chronologicalCandles(candles)

  if (ordered.length < 6) {
    const neutral: TrendSignal = {
      direction: 'neutral',
      score: 0
    }

    return {
      shortTerm: neutral,
      mediumTerm: neutral,
      alignment: 'neutral',
      score: 0
    }
  }

  const shortWindow = ordered.slice(
    Math.max(0, ordered.length - 6)
  )

  const mediumWindow = ordered.slice(
    Math.max(0, ordered.length - 18)
  )

  const shortTerm = calculateTrend(shortWindow)
  const mediumTerm = calculateTrend(mediumWindow)

  let alignment: MTFSignal['alignment'] = 'mixed'

  if (
    shortTerm.direction === 'neutral' &&
    mediumTerm.direction === 'neutral'
  ) {
    alignment = 'neutral'
  } else if (
    shortTerm.direction === 'bullish' &&
    mediumTerm.direction === 'bullish'
  ) {
    alignment = 'bullish'
  } else if (
    shortTerm.direction === 'bearish' &&
    mediumTerm.direction === 'bearish'
  ) {
    alignment = 'bearish'
  }

  const score = clamp(
    shortTerm.score * 0.45 +
      mediumTerm.score * 0.55,
    -1,
    1
  )

  return {
    shortTerm,
    mediumTerm,
    alignment,
    score
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

  const symbol =
    ordered[ordered.length - 1].symbol

  const trend =
    calculateTrend(ordered)

  const volatility =
    calculateVolatility(ordered)

  const volatilityRegime =
    calculateVolatilityRegime(volatility)

  const momentum =
    calculateMomentum(ordered)

  const structure =
    calculateStructure(ordered)

  const mtf =
    calculateMTF(ordered)

  const score = clamp(
    trend.score * 0.30 +
      momentum.score * 0.20 +
      structure.score * 0.25 +
      mtf.score * 0.20 +
      volatilityRegime.score * 0.05,
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

  const directionalAgreement =
    (
      Math.abs(trend.score) +
      Math.abs(structure.score) +
      Math.abs(mtf.score)
    ) / 3

  const scoreStrength = Math.abs(score)

  const volatilityPenalty =
    volatilityRegime.regime === 'HIGH'
      ? 0.15
      : volatilityRegime.regime === 'ELEVATED'
        ? 0.05
        : 0

  const confidence = Math.round(
    clamp(
      (
        scoreStrength * 0.60 +
        directionalAgreement * 0.40 -
        volatilityPenalty
      ) * 100,
      0,
      100
    )
  )

  const riskState: MarketIntelligence['riskState'] =
    volatilityRegime.regime

  return {
    symbol,
    trend,
    volatility,
    volatilityRegime,
    momentum,
    structure,
    mtf,
    score,
    signal,
    confidence,
    riskState,
    timestamp: new Date().toISOString()
  }
}
