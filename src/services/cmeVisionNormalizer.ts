export type CmeVisionNormalized = {
  screenshotType?: string
  asOfDate?: string

  underlyingFutures: Array<{
    symbol: string
    dte?: number
    settlement?: number
    price?: number
    change?: number
  }>

  optionSeries: Array<{
    symbol: string
    dte?: number
    underlying?: string
  }>

  volatilitySettlement?: number
  volatilityCurve?: unknown
  expectedRange?: unknown
  settlementReferenceLines?: unknown

  strikesRange?: {
    minStrike?: number
    maxStrike?: number
  }

  optionRows: Array<{
    strike: number
    series: string
    callSettle?: number
    putSettle?: number
    callOi?: number
    callOiChange?: number
    putOi?: number
    putOiChange?: number
  }>

  notableConcentrations: Array<{
    strike: number
    series: string
    type: "CALL" | "PUT"
    value: number
  }>

  unreadableOrMissingInformation?: string
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim())
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined
}

export function normalizeCmeVision(
  input: unknown,
): CmeVisionNormalized {
  if (!input || typeof input !== "object") {
    return {
      underlyingFutures: [],
      optionSeries: [],
      optionRows: [],
      notableConcentrations: [],
    }
  }

  const source = input as Record<string, unknown>

  // ------------------------------------------------------------
  // Screenshot metadata
  // ------------------------------------------------------------

  const screenshotType =
    text(source.screenshot_type) ??
    text(source.screenshotType) ??
    text(source.image_type)

  const asOfDate =
    text(source.as_of_date) ??
    text(source.asOfDate)

  // ------------------------------------------------------------
  // Underlying futures
  // Supports:
  //   [{ symbol: "GC", price: 4562.6, change: 25.5 }]
  //   [{ symbol: "OG|GC", value: "4562.6" }]
  // ------------------------------------------------------------

  const underlyingFutures: CmeVisionNormalized["underlyingFutures"] = []

  if (Array.isArray(source.underlying_futures)) {
    for (const item of source.underlying_futures) {

if (typeof item === "string") {
  const match = item.match(
    /\b(GC|OG)\b.*?(\d+(?:\.\d+)?)/i,
  )

  if (match) {
    underlyingFutures.push({
      symbol: match[1].toUpperCase(),
      price: finiteNumber(match[2]),
    })
  }

  continue
}
    if (!item || typeof item !== "object") continue

     const value = item as Record<string, unknown>

      const rawSymbol =
        text(value.symbol) ??
        text(value.underlying)

      if (!rawSymbol) continue

      const symbolMatch = rawSymbol.match(/\b(GC|OG)\b/i)

      const symbol = symbolMatch
        ? symbolMatch[1].toUpperCase()
        : rawSymbol

      const price = finiteNumber(
        value.price ??
        value.value ??
        value.future_price,
      )

      const settlement = finiteNumber(
        value.future_settlement ??
        value.settlement,
      )

      const change = finiteNumber(
        value.change ??
        value.future_change,
      )

      const dte = finiteNumber(value.dte)

      underlyingFutures.push({
        symbol,
        ...(dte !== undefined ? { dte } : {}),
        ...(settlement !== undefined ? { settlement } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(change !== undefined ? { change } : {}),
      })
    }
  }

  // ------------------------------------------------------------
  // Option series
  // Supports:
  //   [{ symbol: "OG3Q6", dte: 0.52 }]
  //   [{ series: "OG3Q6", value: "0.52 DTE" }]
  //   ["OG3Q6"]
  // ------------------------------------------------------------

  const optionSeries: CmeVisionNormalized["optionSeries"] = []

  if (Array.isArray(source.option_series)) {
    for (const item of source.option_series) {
      if (typeof item === "string") {
        optionSeries.push({
          symbol: item,
        })
        continue
      }

      if (!item || typeof item !== "object") continue

      const value = item as Record<string, unknown>

      const symbol =
        text(value.symbol) ??
        text(value.series)

      if (!symbol) continue

      let dte = finiteNumber(value.dte)

      if (dte === undefined && typeof value.value === "string") {
        const match = value.value.match(
          /(\d+(?:\.\d+)?)\s*DTE/i,
        )

        if (match) {
          dte = finiteNumber(match[1])
        }
      }

      const underlying =
        text(value.underlying) ??
        text(value.underlying_future) ??
        text(value.underlying_futures_ref)

      optionSeries.push({
        symbol,
        ...(dte !== undefined ? { dte } : {}),
        ...(underlying ? { underlying } : {}),
      })
    }
  }

  // ------------------------------------------------------------
  // Also support top-level contract/series strings
  // ------------------------------------------------------------

  if (optionSeries.length === 0) {
    const series =
      text(source.option_series) ??
      text(source.contract_symbol) ??
      text(source.contract_symbols)

    if (series) {
      optionSeries.push({
        symbol: series,
      })
    }
  }

  // ------------------------------------------------------------
  // Volatility / range information
  // ------------------------------------------------------------

  const volatilitySettlement = finiteNumber(
    source.volatility_settlement ??
    source.volatilitySettlement ??
    source.vol,
  )

  const volatilityCurve =
    source.volatility_curve ??
    source.volatilityCurve

  const expectedRange =
    source.expected_range ??
    source.expectedRange

  const settlementReferenceLines =
    source.settlement_reference_lines ??
    source.settlementReferenceLines

  // ------------------------------------------------------------
  // Strike range
  //
  // IMPORTANT:
  // This is only metadata.
  // It is NEVER converted into notable concentrations.
  // ------------------------------------------------------------

  const range =
    source.strikes_range_visible

  let minStrike: number | undefined
  let maxStrike: number | undefined

  if (range && typeof range === "object") {
    const rangeValue = range as Record<string, unknown>

    minStrike = finiteNumber(
      rangeValue.min_strike ??
      rangeValue.minStrike,
    )

    maxStrike = finiteNumber(
      rangeValue.max_strike ??
      rangeValue.maxStrike,
    )
  }

  // ------------------------------------------------------------
  // Raw Option Rows
  // Preserve all OCR-readable QuikStrike rows.
  // Settlement and OI are kept separately.
  // ------------------------------------------------------------

  const optionRows: CmeVisionNormalized["optionRows"] = []

  if (Array.isArray(source.option_rows)) {
    for (const item of source.option_rows) {
      if (!item || typeof item !== "object") continue

      const value = item as Record<string, unknown>

      const strike = finiteNumber(value.strike)
      const series = text(value.series)

      if (strike === undefined || !series) continue

      const row: CmeVisionNormalized["optionRows"][number] = {
        strike,
        series,
      }

      const callSettle = finiteNumber(value.call_settle)
      const putSettle = finiteNumber(value.put_settle)
      const callOi = finiteNumber(value.call_oi)
      const callOiChange = finiteNumber(value.call_oi_change)
      const putOi = finiteNumber(value.put_oi)
      const putOiChange = finiteNumber(value.put_oi_change)

      if (callSettle !== undefined) row.callSettle = callSettle
      if (putSettle !== undefined) row.putSettle = putSettle
      if (callOi !== undefined) row.callOi = callOi
      if (callOiChange !== undefined) row.callOiChange = callOiChange
      if (putOi !== undefined) row.putOi = putOi
      if (putOiChange !== undefined) row.putOiChange = putOiChange

      optionRows.push(row)
    }
  }

  // ------------------------------------------------------------
  // Concentrations
  // Canonical output:
  // {
  //   strike,
  //   series,
  //   type: CALL|PUT,
  //   value
  // }
  // ------------------------------------------------------------

  const notableConcentrations: CmeVisionNormalized["notableConcentrations"] = []

  const addConcentration = (
    strikeValue: unknown,
    seriesValue: unknown,
    typeValue: unknown,
    amountValue: unknown,
  ) => {
    const strike = finiteNumber(strikeValue)
    const series = text(seriesValue)
    const amount = finiteNumber(amountValue)

    if (
      strike === undefined ||
      !series ||
      amount === undefined
    ) {
      return
    }

    const normalizedType =
      typeof typeValue === "string"
        ? typeValue.toUpperCase()
        : ""

    if (
      normalizedType !== "CALL" &&
      normalizedType !== "PUT"
    ) {
      return
    }

    notableConcentrations.push({
      strike,
      series,
      type: normalizedType,
      value: amount,
    })
  }

// Format 0: raw option_rows from Vision
if (Array.isArray(source.option_rows)) {
  for (const item of source.option_rows) {
    if (!item || typeof item !== "object") continue

    const value = item as Record<string, unknown>

    const strike = finiteNumber(value.strike)
    const series = text(value.series)

    if (strike === undefined || !series) continue

    // QuikStrike Settlement Sheet:
    // Preserve all OCR data in optionRows.
    // Concentrations are selected AFTER all rows are collected.
    // NEVER use settlement prices as concentration values.
    //
    // Do not add every OI row here.
    // This prevents ordinary rows from becoming concentrations.

  }
}

  // ------------------------------------------------------------
  // Format 1:
  // notable_call_put_concentrations
  //
  // { strike, series, call, put }
  // ------------------------------------------------------------

  if (Array.isArray(source.notable_call_put_concentrations)) {
    for (const item of source.notable_call_put_concentrations) {
      if (!item || typeof item !== "object") continue

      const value = item as Record<string, unknown>

      const strike = finiteNumber(value.strike)
      const series = text(value.series)

      if (
        strike === undefined ||
        !series
      ) {
        continue
      }

      addConcentration(
        strike,
        series,
        "CALL",
        value.call,
      )

      addConcentration(
        strike,
        series,
        "PUT",
        value.put,
      )
    }
  }

  // ------------------------------------------------------------
  // Format 2:
  // important_volume_or_oi_concentration
  //
  // { strike, series, type, value }
  // ------------------------------------------------------------

  if (Array.isArray(source.important_volume_or_oi_concentration)) {
    for (const item of source.important_volume_or_oi_concentration) {
      if (!item || typeof item !== "object") continue

      const value = item as Record<string, unknown>

      addConcentration(
        value.strike,
        value.series,
        value.type,
        value.value,
      )
    }
  }

  // ------------------------------------------------------------
  // Format 3:
  // call_values / put_values
  //
  // {
  //   "4500": {
  //      "OG3Q6": 53
  //   }
  // }
  // ------------------------------------------------------------

  const addValueMap = (
    mapValue: unknown,
    type: "CALL" | "PUT",
  ) => {
    if (
      !mapValue ||
      typeof mapValue !== "object"
    ) {
      return
    }

    const strikeMap =
      mapValue as Record<string, unknown>

    for (const [strikeText, seriesData] of Object.entries(strikeMap)) {
      const strike = finiteNumber(strikeText)

      if (
        strike === undefined ||
        !seriesData ||
        typeof seriesData !== "object"
      ) {
        continue
      }

      const seriesMap =
        seriesData as Record<string, unknown>

      for (const [series, rawValue] of Object.entries(seriesMap)) {
        addConcentration(
          strike,
          series,
          type,
          rawValue,
        )
      }
    }
  }

  addValueMap(source.call_values, "CALL")
  addValueMap(source.put_values, "PUT")

  // ------------------------------------------------------------
  // Format 4:
  // notable_volume_concentrations
  //
  // {
  //   calls: "Major volume peak near strike 4650 (approx 115)"
  //   puts:  "Notable peak near strike 4500 (approx 53)"
  // }
  //
  // Only explicit strike numbers are accepted.
  // Ranges / Delta labels are ignored.
  // ------------------------------------------------------------

  const parseVolumeText = (
    value: unknown,
    type: "CALL" | "PUT",
  ) => {
    if (typeof value !== "string") return

    const regex =
      /strike\s*(?:~|near)?\s*(\d+(?:\.\d+)?)[^0-9]{0,40}(?:approx(?:imately)?\s*)?(\d+(?:\.\d+)?)/gi

    for (const match of value.matchAll(regex)) {
      const strike = finiteNumber(match[1])
      const amount = finiteNumber(match[2])

      if (
        strike === undefined ||
        amount === undefined
      ) {
        continue
      }

      const series =
        text(source.option_series) ??
        text(source.contract_symbol) ??
        text(source.contract_symbols) ??
        optionSeries[0]?.symbol

      if (!series) continue

      addConcentration(
        strike,
        series,
        type,
        amount,
      )
    }
  }

  if (
    source.notable_volume_concentrations &&
    typeof source.notable_volume_concentrations === "object"
  ) {
    const volumeData =
      source.notable_volume_concentrations as Record<string, unknown>

    parseVolumeText(volumeData.calls, "CALL")
    parseVolumeText(volumeData.puts, "PUT")
  }

  // ------------------------------------------------------------
  // Format 5:
  // Generic concentration objects
  //
  // { strike, series, type, value }
  // ------------------------------------------------------------

  const genericLists = [
    source.notable_high_concentrations,
    source.important_concentrations,
  ]

  for (const list of genericLists) {
    if (!Array.isArray(list)) continue

    for (const item of list) {
      if (!item || typeof item !== "object") continue

      const value =
        item as Record<string, unknown>

      addConcentration(
        value.strike,
        value.series,
        value.type,
        value.value,
      )
    }
  }

  // ------------------------------------------------------------
  // Format 6:
  // details string
  //
  // { strike: 4500,
  //   details: "OG3Q6 (CALL 10,694, PUT 1,261)" }
  // ------------------------------------------------------------

  const parseDetails = (
    item: Record<string, unknown>,
  ) => {
    const strike = finiteNumber(item.strike)
    const details = text(item.details)

    if (
      strike === undefined ||
      !details
    ) {
      return
    }

    const regex =
      /([A-Z0-9|]+)\s*\([^)]*?\b(CALL|PUT)\s+([\d,]+(?:\.\d+)?)\b/gi

    for (const match of details.matchAll(regex)) {
      addConcentration(
        strike,
        match[1],
        match[2],
        match[3],
      )
    }
  }

  for (const list of genericLists) {
    if (!Array.isArray(list)) continue

    for (const item of list) {
      if (!item || typeof item !== "object") continue

      parseDetails(
        item as Record<string, unknown>,
      )
    }
  }

  // ------------------------------------------------------------
  // Select significant OI concentrations from OCR option rows
  // ------------------------------------------------------------
  //
  // optionRows contains the complete readable QuikStrike table.
  // Use only explicitly OCR-read Open Interest values.
  // NEVER use settlement prices.
  // NEVER calculate or estimate values.
  // ------------------------------------------------------------

  for (const row of optionRows) {
    if (row.callOi !== undefined) {
      addConcentration(
        row.strike,
        row.series,
        "CALL",
        row.callOi,
      )
    }

    if (row.putOi !== undefined) {
      addConcentration(
        row.strike,
        row.series,
        "PUT",
        row.putOi,
      )
    }
  }

  // Keep only the 15 largest explicitly-read OI values.
  notableConcentrations.sort(
    (a, b) => b.value - a.value,
  )

  const selectedConcentrations =
    notableConcentrations.slice(0, 15)

  // ------------------------------------------------------------
  // Remove duplicates
  // ------------------------------------------------------------

  const uniqueConcentrations = Array.from(
    new Map(
      selectedConcentrations.map((item) => [
        `${item.strike}|${item.series}|${item.type}|${item.value}`,
        item,
      ]),
    ).values(),
  )

  // ------------------------------------------------------------
  // Missing information
  // ------------------------------------------------------------

  const unreadable =
    Array.isArray(
      source.unreadable_or_missing_information,
    )
      ? source.unreadable_or_missing_information
          .filter(
            (item): item is string =>
              typeof item === "string",
          )
          .join(" ")
      : text(
          source.unreadable_or_missing_information,
        )

  return {
    ...(screenshotType ? { screenshotType } : {}),
    ...(asOfDate ? { asOfDate } : {}),

    underlyingFutures,

    optionSeries,

    ...(volatilitySettlement !== undefined
      ? { volatilitySettlement }
      : {}),

    ...(volatilityCurve !== undefined
      ? { volatilityCurve }
      : {}),

    ...(expectedRange !== undefined
      ? { expectedRange }
      : {}),

    ...(settlementReferenceLines !== undefined
      ? { settlementReferenceLines }
      : {}),

    ...(minStrike !== undefined || maxStrike !== undefined
      ? {
          strikesRange: {
            ...(minStrike !== undefined
              ? { minStrike }
              : {}),
            ...(maxStrike !== undefined
              ? { maxStrike }
              : {}),
          },
        }
      : {}),

    optionRows,
    notableConcentrations:
      selectedConcentrations,

    ...(unreadable
      ? {
          unreadableOrMissingInformation:
            unreadable,
        }
      : {}),
  }
}
