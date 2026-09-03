export type MarketSignal = 'bullish' | 'bearish' | 'neutral'

export type RiskState = 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH'

export interface Candle {
  symbol: string
  interval: string
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function calculateTrend(candles: Candle[]) {
  const first = candles[0]
  const latest = candles[candles.length - 1]

  const changePercent =
    first && first.close !== 0
      ? ((latest.close - first.close) / first.close) * 100
      : 0

  const score = clamp(changePercent / 1, -1, 1)

  let direction: MarketSignal = 'neutral'

  if (score > 0.05) direction = 'bullish'
  else if (score < -0.05) direction = 'bearish'

  return {
    direction,
    score,
    changePercent,
  }
}

function calculateVolatility(candles: Candle[]) {
  if (candles.length < 2) {
    return {
      atr: 0,
      atrPercent: 0,
    }
  }

  const trueRanges: number[] = []

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i]
    const previous = candles[i - 1]

    const trueRange = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close),
    )

    trueRanges.push(trueRange)
  }

  const atr =
    trueRanges.length > 0
      ? trueRanges.reduce((sum, value) => sum + value, 0) /
        trueRanges.length
      : 0

  const latestClose = candles[candles.length - 1]?.close ?? 0

  const atrPercent =
    latestClose !== 0
      ? (atr / latestClose) * 100
      : 0

  return {
    atr,
    atrPercent,
  }
}

function calculateMomentum(candles: Candle[]) {
  const window = candles.slice(-4)

  if (window.length < 2) {
    return {
      value: 0,
      score: 0,
    }
  }

  const first = window[0].close
  const latest = window[window.length - 1].close

  const value =
    first !== 0
      ? ((latest - first) / first) * 100
      : 0

  const score = clamp(value / 0.30, -1, 1)

  return {
    value,
    score,
  }
}

function calculateStructure(candles: Candle[]) {
  if (candles.length < 2) {
    return {
      direction: 'neutral' as MarketSignal,
      score: 0,
      higherHigh: false,
      higherLow: false,
      lowerHigh: false,
      lowerLow: false,
      bias: 'neutral' as MarketSignal,
    }
  }

  const midpoint = Math.floor(candles.length / 2)

  const firstHalf = candles.slice(0, midpoint)
  const secondHalf = candles.slice(midpoint)

  const firstHigh = Math.max(...firstHalf.map((c) => c.high))
  const secondHigh = Math.max(...secondHalf.map((c) => c.high))

  const firstLow = Math.min(...firstHalf.map((c) => c.low))
  const secondLow = Math.min(...secondHalf.map((c) => c.low))

  const higherHigh = secondHigh > firstHigh
  const higherLow = secondLow > firstLow
  const lowerHigh = secondHigh < firstHigh
  const lowerLow = secondLow < firstLow

  let score = 0

  if (higherHigh) score += 0.5
  if (higherLow) score += 0.5
  if (lowerHigh) score -= 0.5
  if (lowerLow) score -= 0.5

  score = clamp(score, -1, 1)

  let direction: MarketSignal = 'neutral'

  if (score > 0.05) direction = 'bullish'
  else if (score < -0.05) direction = 'bearish'

  return {
    direction,
    score,
    higherHigh,
    higherLow,
    lowerHigh,
    lowerLow,
    bias: direction,
  }
}

function calculateVolatilityRegime(volatility: {
  atrPercent: number
}) {
  let regime: RiskState = 'LOW'
  let score = 0

  if (volatility.atrPercent < 0.15) {
    regime = 'LOW'
    score = 0
  } else if (volatility.atrPercent < 0.30) {
    regime = 'NORMAL'
    score = 0
  } else if (volatility.atrPercent < 0.50) {
    regime = 'ELEVATED'
    score = -0.2
  } else {
    regime = 'HIGH'
    score = -0.4
  }

  return {
    regime,
    score,
    atrPercent: volatility.atrPercent,
  }
}

function calculateMTF(candles: Candle[]) {
  if (candles.length < 6) {
    return {
      shortTerm: 'neutral' as MarketSignal,
      mediumTerm: 'neutral' as MarketSignal,
      alignment: 'neutral' as MarketSignal,
      score: 0,
    }
  }

  const shortTrend = calculateTrend(candles.slice(-6))

  const mediumTrend = calculateTrend(
    candles.slice(-18),
  )

  let alignment: MarketSignal = 'neutral'

  if (
    shortTrend.direction === 'bullish' &&
    mediumTrend.direction === 'bullish'
  ) {
    alignment = 'bullish'
  } else if (
    shortTrend.direction === 'bearish' &&
    mediumTrend.direction === 'bearish'
  ) {
    alignment = 'bearish'
  }

  const score =
    shortTrend.score * 0.45 +
    mediumTrend.score * 0.55

  return {
    shortTerm: shortTrend.direction,
    mediumTerm: mediumTrend.direction,
    alignment,
    score: clamp(score, -1, 1),
  }
}

export function calculateMarketIntelligence(
  candles: Candle[],
) {
  const ordered = [...candles].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime(),
  )

  if (ordered.length < 2) {
    throw new Error(
      'At least 2 candles are required for market intelligence',
    )
  }

  const trend = calculateTrend(ordered)

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
    1,
  )

  let signal: MarketSignal = 'neutral'

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
      100,
    ),
  )

  const riskState =
    volatilityRegime.regime

  return {
    symbol: ordered[ordered.length - 1].symbol,
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
    timestamp: new Date().toISOString(),
  }
}
