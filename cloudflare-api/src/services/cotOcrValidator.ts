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

export function validateCotRecord(
  ocr: CotOcrRecord,
  database: Record<string, unknown> | null,
): CotValidationResult {
  if (!ocr.report_date) {
    return {
      reportDate: null,
      status: 'INVALID',
      conflicts: [],
    }
  }

  if (!database) {
    return {
      reportDate: ocr.report_date,
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
    reportDate: ocr.report_date,
    status:
      conflicts.length > 0
        ? 'CONFLICT'
        : 'MATCH',
    conflicts,
  }
}
