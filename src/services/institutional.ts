import type { CmeMarketData } from '../db/cme.js'

export function buildHistoricalChanges(
  history: CmeMarketData[],
) {
  const historicalVolumeChanges: number[] = []
  const historicalOIChanges: number[] = []

  for (
    let i = 1;
    i < history.length;
    i++
  ) {
    const current = history[i - 1]
    const previous = history[i]

    if (
      current.volume !== undefined &&
      previous.volume !== undefined
    ) {
      historicalVolumeChanges.push(
        current.volume - previous.volume,
      )
    }

    if (
      current.openInterest !== undefined &&
      previous.openInterest !== undefined
    ) {
      historicalOIChanges.push(
        current.openInterest -
          previous.openInterest,
      )
    }
  }

  return {
    historicalVolumeChanges,
    historicalOIChanges,
  }
}
