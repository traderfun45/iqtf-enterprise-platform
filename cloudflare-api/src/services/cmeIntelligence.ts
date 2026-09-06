export type CmePositioning =
  | 'LONG_BUILDUP'
  | 'SHORT_BUILDUP'
  | 'SHORT_COVERING'
  | 'LONG_LIQUIDATION'
  | 'NEUTRAL'

export type CmeConfirmation =
  | 'STRONG'
  | 'MODERATE'
  | 'WEAK'
  | 'NEUTRAL'
  | 'INSUFFICIENT_DATA'

export type CmeIntelligence = {
  priceChange: number
  priceChangePercent: number

  volumeChange: number
  volumeChangePercent: number

  openInterestChange: number
  openInterestChangePercent: number

  volumeZscore: number
  oiZscore: number

  positioning: CmePositioning

  volumeConfirmation: CmeConfirmation
  oiConfirmation: CmeConfirmation

  confirmationScore: number
}

function zscore(
  value: number,
  values: number[],
): number | null {
  const cleanValues = values.filter(
    (item) => Number.isFinite(item),
  )

  if (cleanValues.length < 3) {
    return null
  }

  const mean =
    cleanValues.reduce(
      (sum, item) => sum + item,
      0,
    ) / cleanValues.length

  const variance =
    cleanValues.reduce(
      (sum, item) =>
        sum + Math.pow(item - mean, 2),
      0,
    ) / cleanValues.length

  const std = Math.sqrt(variance)

  if (std === 0) {
    return 0
  }

  return (value - mean) / std
}

function strength(
  z: number | null,
): CmeConfirmation {
  if (z === null) {
    return 'INSUFFICIENT_DATA'
  }

  const abs = Math.abs(z)

  if (abs >= 2) {
    return 'STRONG'
  }

  if (abs >= 1) {
    return 'MODERATE'
  }

  if (abs > 0.25) {
    return 'WEAK'
  }

  return 'NEUTRAL'
}

function percentChange(
  current: number,
  previous: number,
): number {
  if (
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return 0
  }

  return (
    ((current - previous) / previous) *
    100
  )
}

export function analyzeCmeIntelligence(params: {
  price: number
  previousPrice?: number

  volume?: number
  previousVolume?: number

  openInterest?: number
  previousOpenInterest?: number

  historicalVolumeChanges?: number[]
  historicalOIChanges?: number[]
}): CmeIntelligence {
  const price = Number.isFinite(params.price)
    ? params.price
    : 0

  const previousPrice =
    Number.isFinite(params.previousPrice)
      ? params.previousPrice!
      : price

  const volume = Number.isFinite(params.volume)
    ? params.volume!
    : 0

  const previousVolume =
    Number.isFinite(params.previousVolume)
      ? params.previousVolume!
      : volume

  const oi = Number.isFinite(
    params.openInterest,
  )
    ? params.openInterest!
    : 0

  const previousOI =
    Number.isFinite(
      params.previousOpenInterest,
    )
      ? params.previousOpenInterest!
      : oi

  const priceChange =
    price - previousPrice

  const priceChangePercent =
    percentChange(
      price,
      previousPrice,
    )

  const volumeChange =
    volume - previousVolume

  const volumeChangePercent =
    percentChange(
      volume,
      previousVolume,
    )

  const oiChange =
    oi - previousOI

  const oiChangePercent =
    percentChange(
      oi,
      previousOI,
    )

  const volumeZ =
    zscore(
      volumeChange,
      params.historicalVolumeChanges ?? [],
    )

  const oiZ =
    zscore(
      oiChange,
      params.historicalOIChanges ?? [],
    )

  let positioning: CmePositioning =
    'NEUTRAL'

  if (
    priceChange > 0 &&
    oiChange > 0
  ) {
    positioning =
      'LONG_BUILDUP'
  } else if (
    priceChange < 0 &&
    oiChange > 0
  ) {
    positioning =
      'SHORT_BUILDUP'
  } else if (
    priceChange > 0 &&
    oiChange < 0
  ) {
    positioning =
      'SHORT_COVERING'
  } else if (
    priceChange < 0 &&
    oiChange < 0
  ) {
    positioning =
      'LONG_LIQUIDATION'
  }

  const volumeConfirmation =
    strength(volumeZ)

  const oiConfirmation =
    strength(oiZ)

  const priceSignal =
    priceChange > 0
      ? 1
      : priceChange < 0
        ? -1
        : 0

  const oiSignal =
    oiChange > 0
      ? 1
      : oiChange < 0
        ? -1
        : 0

  const volumeSignal =
    volumeChange > 0
      ? 1
      : volumeChange < 0
        ? -1
        : 0

  const confirmationScore =
    Math.max(
      -1,
      Math.min(
        1,
        priceSignal * 0.4 +
        oiSignal * 0.35 +
        volumeSignal * 0.25,
      ),
    )

  return {
    priceChange,
    priceChangePercent,

    volumeChange,
    volumeChangePercent,

    openInterestChange: oiChange,
    openInterestChangePercent:
      oiChangePercent,

    volumeZscore:
      volumeZ ?? 0,

    oiZscore:
      oiZ ?? 0,

    positioning,

    volumeConfirmation,
    oiConfirmation,

    confirmationScore,
  }
}
