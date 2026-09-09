import type { MarketCandle } from '../../market/twelveData.js'

export type ExpectedMoveTimeframe = '1H' | '4H' | 'D'

export type ExpectedMoveLevels = {
  minus3: number
  minus2: number
  minus1: number
  atm: number
  plus1: number
  plus2: number
  plus3: number
}

export type ExpectedMoveResult = {
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

function chronologicalCandles(candles: MarketCandle[]): MarketCandle[] {
  return [...candles].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime(),
  )
}

function aggregate4H(candles: MarketCandle[]): MarketCandle[] {
  const ordered = chronologicalCandles(candles)
  const buckets = new Map<string, MarketCandle>()

  for (const candle of ordered) {
    const date = new Date(candle.timestamp)

    const bucketHour = Math.floor(date.getUTCHours() / 4) * 4

    const bucket = new Date(date)
    bucket.setUTCHours(bucketHour, 0, 0, 0)

    const key = bucket.toISOString()

    const existing = buckets.get(key)

    if (!existing) {
      buckets.set(key, {
        ...candle,
        interval: '4h',
        timestamp: key,
      })
      continue
    }

    existing.high = Math.max(existing.high, candle.high)
    existing.low = Math.min(existing.low, candle.low)
    existing.close = candle.close

    if (
      typeof existing.volume === 'number' &&
      typeof candle.volume === 'number'
    ) {
      existing.volume += candle.volume
    } else if (typeof candle.volume === 'number') {
      existing.volume = candle.volume
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime(),
  )
}

function logReturns(candles: MarketCandle[]): number[] {
  const ordered = chronologicalCandles(candles)
  const returns: number[] = []

  for (let i = 1; i < ordered.length; i += 1) {
    const previous = ordered[i - 1].close
    const current = ordered[i].close

    if (
      previous > 0 &&
      current > 0 &&
      Number.isFinite(previous) &&
      Number.isFinite(current)
    ) {
      returns.push(Math.log(current / previous))
    }
  }

  return returns
}

function sampleStandardDeviation(values: number[]): number {
  if (values.length < 2) {
    return 0
  }

  const mean =
    values.reduce((sum, value) => sum + value, 0) / values.length

  const variance =
    values.reduce(
      (sum, value) => sum + Math.pow(value - mean, 2),
      0,
    ) /
    (values.length - 1)

  return Math.sqrt(Math.max(variance, 0))
}

/*
 * Annualization based on calendar-time approximation.
 *
 * 1H = 24 observations/day
 * 4H = 6 observations/day
 * D  = 1 observation/day
 *
 * This is intentionally isolated here so the convention
 * can later be changed to a CME-session calendar.
 */
function annualizationFactor(
  timeframe: ExpectedMoveTimeframe,
): number {
  if (timeframe === '1H') {
    return Math.sqrt(24 * 365)
  }

  if (timeframe === '4H') {
    return Math.sqrt(6 * 365)
  }

  return Math.sqrt(365)
}

function normalizeTimeframe(
  timeframe: string,
): ExpectedMoveTimeframe {
  const normalized = timeframe.toUpperCase()

  if (
    normalized !== '1H' &&
    normalized !== '4H' &&
    normalized !== 'D'
  ) {
    throw new Error(`Unsupported Expected Move timeframe: ${timeframe}`)
  }

  return normalized
}

export function calculateExpectedMove(
  candles: MarketCandle[],
  timeframe: ExpectedMoveTimeframe,
  timeFractionYears?: number,
  currentPrice?: number,
): ExpectedMoveResult {
  if (candles.length < 15) {
    throw new Error(
      `Expected Move requires at least 15 candles, received=${candles.length}`,
    )
  }

  const normalizedTimeframe = normalizeTimeframe(timeframe)

  const sourceCandles =
    normalizedTimeframe === '4H'
      ? aggregate4H(candles)
      : chronologicalCandles(candles)

  if (sourceCandles.length < 15) {
    throw new Error(
      `Expected Move ${normalizedTimeframe} requires at least 15 candles after aggregation`,
    )
  }

  const returns = logReturns(sourceCandles)

  const hvReturns = returns.slice(-14)

  if (hvReturns.length < 14) {
    throw new Error(
      `Expected Move HV14 requires at least 14 log returns, received=${hvReturns.length}`,
    )
  }

  const standardDeviation = sampleStandardDeviation(hvReturns)

  const hv14 =
    standardDeviation * annualizationFactor(normalizedTimeframe)

  const latest =
    sourceCandles[sourceCandles.length - 1]

  const price =
    typeof currentPrice === 'number' &&
    Number.isFinite(currentPrice) &&
    currentPrice > 0
      ? currentPrice
      : latest.close

  /*
   * Default = one observation period.
   *
   * The API can override this with an exact remaining
   * session / DTE fraction when that information is available.
   */
  const defaultTimeFraction =
    normalizedTimeframe === '1H'
      ? 1 / (24 * 365)
      : normalizedTimeframe === '4H'
        ? 4 / (24 * 365)
        : 1 / 365

  const timeFraction =
    typeof timeFractionYears === 'number' &&
    Number.isFinite(timeFractionYears) &&
    timeFractionYears > 0
      ? timeFractionYears
      : defaultTimeFraction

  const expectedMove =
    price * hv14 * Math.sqrt(timeFraction)

  const levels: ExpectedMoveLevels = {
    minus3: price - expectedMove * 3,
    minus2: price - expectedMove * 2,
    minus1: price - expectedMove,
    atm: price,
    plus1: price + expectedMove,
    plus2: price + expectedMove * 2,
    plus3: price + expectedMove * 3,
  }

  return {
    symbol: latest.symbol,
    timeframe: normalizedTimeframe,
    price,
    hv14,
    hv14Percent: hv14 * 100,
    expectedMove,
    expectedMovePercent:
      price !== 0 ? (expectedMove / price) * 100 : 0,
    timeFractionYears: timeFraction,
    levels,
    sampleSize: hvReturns.length,
    timestamp: new Date().toISOString(),
  }
}

export { aggregate4H }
