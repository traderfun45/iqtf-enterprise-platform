export type OptionRow = {
  strike: number
  series: string
  callOi?: number
  putOi?: number
}

export type OptionConcentration = {
  strike: number
  series: string
  type: 'CALL' | 'PUT'
  value: number
}

export type CmeOptionStrikeSummary = {
  strike: number
  callVolume: number
  putVolume: number
  totalVolume: number
  callPutRatio: number | null
  callPutImbalance: number
  dominantSide: 'CALL' | 'PUT' | 'BALANCED'
}

export type CmeOptionIntelligence = {
  totalConcentrations: number
  totalCallValue: number
  totalPutValue: number
  overallCallPutRatio: number | null
  overallImbalance: number
  overallBias: 'CALL' | 'PUT' | 'BALANCED'
  dominantStrike: number | null
  dominantStrikeVolume: number
  strikes: CmeOptionStrikeSummary[]
}

function addOi(
  map: Map<number, { callVolume: number; putVolume: number }>,
  strike: number,
  type: 'CALL' | 'PUT',
  value: number,
) {
  const current = map.get(strike) ?? {
    callVolume: 0,
    putVolume: 0,
  }

  if (type === 'CALL') {
    current.callVolume += value
  } else {
    current.putVolume += value
  }

  map.set(strike, current)
}

export function analyzeCmeOptionIntelligence(
  optionRows: OptionRow[] = [],
  concentrations: OptionConcentration[] = [],
): CmeOptionIntelligence {
  const strikeMap = new Map<
    number,
    { callVolume: number; putVolume: number }
  >()

  let totalConcentrations = 0

  // ------------------------------------------------------------
  // PRIMARY SOURCE: OCR optionRows
  // Use ONLY callOi / putOi.
  // NEVER use settlement prices.
  // ------------------------------------------------------------

  for (const row of optionRows) {
    if (
      !row ||
      !Number.isFinite(row.strike) ||
      typeof row.series !== 'string' ||
      row.series.length === 0
    ) {
      continue
    }

    let used = false

    if (
      row.callOi !== undefined &&
      Number.isFinite(row.callOi) &&
      row.callOi >= 0
    ) {
      addOi(
        strikeMap,
        row.strike,
        'CALL',
        row.callOi,
      )
      used = true
    }

    if (
      row.putOi !== undefined &&
      Number.isFinite(row.putOi) &&
      row.putOi >= 0
    ) {
      addOi(
        strikeMap,
        row.strike,
        'PUT',
        row.putOi,
      )
      used = true
    }

    if (used) {
      totalConcentrations++
    }
  }

  // ------------------------------------------------------------
  // FALLBACK: notableConcentrations
  // Used only when optionRows did not provide data.
  // ------------------------------------------------------------

  if (strikeMap.size === 0) {
    for (const item of concentrations) {
      if (
        !item ||
        !Number.isFinite(item.strike) ||
        typeof item.series !== 'string' ||
        item.series.length === 0 ||
        (item.type !== 'CALL' && item.type !== 'PUT') ||
        !Number.isFinite(item.value) ||
        item.value < 0
      ) {
        continue
      }

      addOi(
        strikeMap,
        item.strike,
        item.type,
        item.value,
      )

      totalConcentrations++
    }
  }

  // ------------------------------------------------------------
  // Build strike summaries
  // ------------------------------------------------------------

  const strikes: CmeOptionStrikeSummary[] = []

  for (const [strike, values] of strikeMap.entries()) {
    const totalVolume =
      values.callVolume + values.putVolume

    const callPutRatio =
      values.putVolume > 0
        ? values.callVolume / values.putVolume
        : null

    const callPutImbalance =
      totalVolume > 0
        ? (values.callVolume - values.putVolume) /
          totalVolume
        : 0

    let dominantSide:
      | 'CALL'
      | 'PUT'
      | 'BALANCED' = 'BALANCED'

    if (values.callVolume > values.putVolume) {
      dominantSide = 'CALL'
    } else if (values.putVolume > values.callVolume) {
      dominantSide = 'PUT'
    }

    strikes.push({
      strike,
      callVolume: values.callVolume,
      putVolume: values.putVolume,
      totalVolume,
      callPutRatio,
      callPutImbalance,
      dominantSide,
    })
  }

  strikes.sort(
    (a, b) => b.totalVolume - a.totalVolume,
  )

  // ------------------------------------------------------------
  // Overall CALL / PUT
  // ------------------------------------------------------------

  const totalCallValue = strikes.reduce(
    (sum, item) => sum + item.callVolume,
    0,
  )

  const totalPutValue = strikes.reduce(
    (sum, item) => sum + item.putVolume,
    0,
  )

  const total =
    totalCallValue + totalPutValue

  const overallCallPutRatio =
    totalPutValue > 0
      ? totalCallValue / totalPutValue
      : null

  const overallImbalance =
    total > 0
      ? (totalCallValue - totalPutValue) / total
      : 0

  let overallBias:
    | 'CALL'
    | 'PUT'
    | 'BALANCED' = 'BALANCED'

  if (totalCallValue > totalPutValue) {
    overallBias = 'CALL'
  } else if (totalPutValue > totalCallValue) {
    overallBias = 'PUT'
  }

  return {
    totalConcentrations,
    totalCallValue,
    totalPutValue,
    overallCallPutRatio,
    overallImbalance,
    overallBias,

    dominantStrike:
      strikes.length > 0
        ? strikes[0].strike
        : null,

    dominantStrikeVolume:
      strikes.length > 0
        ? strikes[0].totalVolume
        : 0,

    strikes,
  }
}
