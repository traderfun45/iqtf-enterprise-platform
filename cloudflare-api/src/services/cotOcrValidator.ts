export type CotOcrRecord = {
  report_date: string | null
  total_oi: number | null
  producer_long: number | null
  producer_short: number | null
  swap_dealer_long: number | null
  swap_dealer_short: number | null
  managed_money_long: number | null
  managed_money_short: number | null
  other_reportables_long: number | null
  other_reportables_short: number | null
}

export type CotValidationField =
  | 'total_oi'
  | 'producer_long'
  | 'producer_short'
  | 'swap_dealer_long'
  | 'swap_dealer_short'
  | 'managed_money_long'
  | 'managed_money_short'
  | 'other_reportables_long'
  | 'other_reportables_short'

export type CotValidationConflict = {
  field: CotValidationField
  ocrValue: number | null
  databaseValue: number | null
}

export type CotValidationResult = {
  reportDate: string | null
  status: 'MATCH' | 'CONFLICT' | 'NEW' | 'INVALID'
  conflicts: CotValidationConflict[]
}

const fields: CotValidationField[] = [
  'total_oi',
  'producer_long',
  'producer_short',
  'swap_dealer_long',
  'swap_dealer_short',
  'managed_money_long',
  'managed_money_short',
  'other_reportables_long',
  'other_reportables_short',
]

export function normalizeCotDate(
  value: string | null,
): string | undefined {
  if (!value) return undefined

  const isoMatch = value.trim().match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  )

  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
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

  const match = value.trim().match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  )

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

export function validateCotRecord(
  ocr: CotOcrRecord,
  database: Record<string, unknown> | null,
): CotValidationResult {
  const reportDate = normalizeCotDate(ocr.report_date)

  if (!reportDate) {
    return {
      reportDate: null,
      status: 'INVALID',
      conflicts: [],
    }
  }

  if (!database) {
    return {
      reportDate,
      status: 'NEW',
      conflicts: [],
    }
  }

  const conflicts: CotValidationConflict[] = []

  for (const field of fields) {
    const ocrValue = ocr[field]

    if (ocrValue === null) continue

    const databaseValue =
      database[field] == null
        ? null
        : Number(database[field])

    if (ocrValue !== databaseValue) {
      conflicts.push({
        field,
        ocrValue,
        databaseValue,
      })
    }
  }

  return {
    reportDate,
    status:
      conflicts.length > 0
        ? 'CONFLICT'
        : 'MATCH',
    conflicts,
  }
}
