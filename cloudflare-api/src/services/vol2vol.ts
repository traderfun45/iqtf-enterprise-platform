export type Vol2VolSignal =
  | 'LONG_ENTRY'
  | 'SHORT_ENTRY'
  | 'LONG_HOLD'
  | 'SHORT_HOLD'
  | 'LONG_EXIT'
  | 'SHORT_EXIT'
  | 'NO_TRADE'

export type Vol2VolConfidence =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'

export type Vol2VolResult = {
  signal: Vol2VolSignal
  confidence: Vol2VolConfidence
  score: number

  priceDirection: 'UP' | 'DOWN' | 'FLAT'
  volumeDirection: 'UP' | 'DOWN' | 'FLAT'
  oiDirection: 'UP' | 'DOWN' | 'FLAT'

  positioning:
    | 'LONG_BUILDUP'
    | 'SHORT_BUILDUP'
    | 'SHORT_COVERING'
    | 'LONG_LIQUIDATION'
    | 'NEUTRAL'

  reasons: string[]
}

function direction(
  value: number,
): 'UP' | 'DOWN' | 'FLAT' {
  if (value > 0) return 'UP'
  if (value < 0) return 'DOWN'
  return 'FLAT'
}

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.max(
    min,
    Math.min(max, value),
  )
}

export function analyzeVol2Vol(params: {
  priceChange: number
  volumeChange: number
  openInterestChange: number

  volumeZscore: number
  oiZscore: number

  positioning:
    | 'LONG_BUILDUP'
    | 'SHORT_BUILDUP'
    | 'SHORT_COVERING'
    | 'LONG_LIQUIDATION'
    | 'NEUTRAL'
}): Vol2VolResult {
  const {
    priceChange,
    volumeChange,
    openInterestChange,
    volumeZscore,
    oiZscore,
    positioning,
  } = params

  const priceDirection =
    direction(priceChange)

  const volumeDirection =
    direction(volumeChange)

  const oiDirection =
    direction(openInterestChange)

  let score = 0

  /*
   * PRICE
   * Direction is the primary signal.
   */
  if (priceChange > 0) {
    score += 30
  } else if (priceChange < 0) {
    score -= 30
  }

  /*
   * VOLUME
   * Z-score confirms participation.
   */
  if (volumeZscore >= 2) {
    score += priceChange > 0 ? 30 : -30
  } else if (volumeZscore >= 1) {
    score += priceChange > 0 ? 20 : -20
  } else if (volumeZscore <= -1) {
    score += priceChange > 0 ? -15 : 15
  }

  /*
   * OPEN INTEREST
   * Positive OI supports new positions.
   */
  if (oiZscore >= 2) {
    score += priceChange > 0 ? 30 : -30
  } else if (oiZscore >= 1) {
    score += priceChange > 0 ? 20 : -20
  } else if (oiZscore <= -1) {
    score += priceChange > 0 ? -20 : 20
  }

  /*
   * Positioning confirmation.
   */
  if (positioning === 'LONG_BUILDUP') {
    score += 15
  }

  if (positioning === 'SHORT_BUILDUP') {
    score -= 15
  }

  if (positioning === 'SHORT_COVERING') {
    score += 5
  }

  if (positioning === 'LONG_LIQUIDATION') {
    score -= 5
  }

  score = clamp(score, -100, 100)

  const reasons: string[] = []

  if (priceDirection === 'UP') {
    reasons.push('Price is rising')
  }

  if (priceDirection === 'DOWN') {
    reasons.push('Price is falling')
  }

  if (volumeZscore >= 2) {
    reasons.push('Volume expansion is strong')
  } else if (volumeZscore >= 1) {
    reasons.push('Volume confirms participation')
  }

  if (oiZscore >= 2) {
    reasons.push('Open Interest expansion is strong')
  } else if (oiZscore >= 1) {
    reasons.push('Open Interest confirms positioning')
  }

  if (positioning !== 'NEUTRAL') {
    reasons.push(
      `Positioning: ${positioning}`,
    )
  }

  let signal: Vol2VolSignal = 'NO_TRADE'

  if (score >= 70) {
    signal = 'LONG_ENTRY'
  } else if (score <= -70) {
    signal = 'SHORT_ENTRY'
  } else if (score >= 35) {
    signal = 'LONG_HOLD'
  } else if (score <= -35) {
    signal = 'SHORT_HOLD'
  }

  if (
    positioning === 'SHORT_COVERING' &&
    score < 50
  ) {
    signal = 'LONG_EXIT'
  }

  if (
    positioning === 'LONG_LIQUIDATION' &&
    score > -50
  ) {
    signal = 'SHORT_EXIT'
  }

  const confidence =
    Math.abs(score) >= 70
      ? 'HIGH'
      : Math.abs(score) >= 45
        ? 'MEDIUM'
        : 'LOW'

  return {
    signal,
    confidence,
    score,

    priceDirection,
    volumeDirection,
    oiDirection,

    positioning,

    reasons,
  }
}
