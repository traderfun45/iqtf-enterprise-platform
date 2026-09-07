export type CotReportParsed = {
  reportDate?: string
  openInterest?: number
  producerLong?: number
  producerShort?: number
  swapDealerLong?: number
  swapDealerShort?: number
  managedMoneyLong?: number
  managedMoneyShort?: number
  otherReportablesLong?: number
  otherReportablesShort?: number
}

export type CotReportsParsed = {
  records: CotReportParsed[]
}

function parseCount(value: string): number | undefined {
  const normalized = value
    .replace(/,/g, '')
    .trim()

  const parsed = Number(normalized)

  return Number.isFinite(parsed)
    ? parsed
    : undefined
}

function normalizeDate(value: string): string | undefined {
  const match = value
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

  if (!match) return undefined

  const day = Number(match[1])
  const month = Number(match[2])
  let year = Number(match[3])

  if (year >= 2400) {
    year -= 543
  }

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return undefined
  }

  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')
}

export function parseCotReports(
  text: string,
): CotReportsParsed {
  const records: CotReportParsed[] = []

  const pattern =
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+TOTAL\s+OI\s*:\s*([\d,.]+)/gi

  for (const match of text.matchAll(pattern)) {
    const reportDate = normalizeDate(match[1])
    const openInterest = parseCount(match[2])

    if (
      reportDate === undefined ||
      openInterest === undefined
    ) {
      continue
    }

    records.push({
      reportDate,
      openInterest,
    })
  }

  return {
    records,
  }
}

// Backward-compatible single-record helper.
// Do not use this for multi-date OCR.
export function parseCotReport(
  text: string,
): CotReportParsed {
  const result = parseCotReports(text)

  return result.records[0] ?? {}
}
