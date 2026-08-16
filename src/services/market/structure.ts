import type { MarketCandle } from '../../providers/market/types.js'

export type StructureDirection =
  | 'bullish'
  | 'bearish'
  | 'neutral'

export type StructureStrength =
  | 'weak'
  | 'moderate'
  | 'strong'

export type MarketStructure = {
  direction: StructureDirection
  score: number
  higherHighs: number
  higherLows: number
  lowerHighs: number
  lowerLows: number
  pattern: string
  strength: StructureStrength
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
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

/**
 * Detect market structure using candle-to-candle swing comparisons.
 *
 * A small threshold is used so insignificant price noise does not
 * dominate the structure classification.
 */
export function calculateMarketStructure(
  candles: MarketCandle[]
): MarketStructure {
  if (candles.length < 4) {
    return {
      direction: 'neutral',
      score: 0,
      higherHighs: 0,
      higherLows: 0,
      lowerHighs: 0,
      lowerLows: 0,
      pattern: 'Insufficient structure data',
      strength: 'weak',
    }
  }

  const ordered = chronologicalCandles(candles)

  const lookback = Math.min(20, ordered.length)

  const recent = ordered.slice(-lookback)

  const first = recent[0]
  const latest = recent[recent.length - 1]

  const range = Math.max(
    ...recent.map((candle) => candle.high)
  ) - Math.min(
    ...recent.map((candle) => candle.low)
  )

  const threshold =
    range > 0
      ? range * 0.02
      : Math.max(Math.abs(latest.close) * 0.0001, 0.000001)

  let higherHighs = 0
  let higherLows = 0
  let lowerHighs = 0
  let lowerLows = 0

  for (let i = 1; i < recent.length; i += 1) {
    const previous = recent[i - 1]
    const current = recent[i]

    if (current.high > previous.high + threshold) {
      higherHighs += 1
    } else if (current.high < previous.high - threshold) {
      lowerHighs += 1
    }

    if (current.low > previous.low + threshold) {
      higherLows += 1
    } else if (current.low < previous.low - threshold) {
      lowerLows += 1
    }
  }

  const bullishEvidence = higherHighs + higherLows
  const bearishEvidence = lowerHighs + lowerLows
  const totalEvidence =
    bullishEvidence + bearishEvidence

  let score = 0

  if (totalEvidence > 0) {
    score =
      (bullishEvidence - bearishEvidence) /
      totalEvidence
  }

  score = clamp(score, -1, 1)

  let direction: StructureDirection = 'neutral'

  if (
    higherHighs > 0 &&
    higherLows > 0 &&
    score >= 0.2
  ) {
    direction = 'bullish'
  } else if (
    lowerHighs > 0 &&
    lowerLows > 0 &&
    score <= -0.2
  ) {
    direction = 'bearish'
  }

  let pattern = 'Mixed structure'

  if (direction === 'bullish') {
    pattern = 'Higher Highs + Higher Lows'
  } else if (direction === 'bearish') {
    pattern = 'Lower Highs + Lower Lows'
  } else if (
    higherHighs > lowerHighs &&
    higherLows > lowerLows
  ) {
    pattern = 'Bullish pressure without full confirmation'
  } else if (
    lowerHighs > higherHighs &&
    lowerLows > higherLows
  ) {
    pattern = 'Bearish pressure without full confirmation'
  }

  let strength: StructureStrength = 'weak'

  if (Math.abs(score) >= 0.6) {
    strength = 'strong'
  } else if (Math.abs(score) >= 0.3) {
    strength = 'moderate'
  }

  return {
    direction,
    score,
    higherHighs,
    higherLows,
    lowerHighs,
    lowerLows,
    pattern,
    strength,
  }
}
