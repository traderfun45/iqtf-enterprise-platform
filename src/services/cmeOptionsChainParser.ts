export type CmeRowQuality =
  | 'VALID'
  | 'PARTIAL'
  | 'SUSPECT'
  | 'DUPLICATE'

export type CmeOptionRow = {
  strike: number
  values: number[]
  valueCount: number
  valid: boolean
  quality: CmeRowQuality
  reasons: string[]
}

export type CmeOptionsChainParsed = {
  contracts: string[]
  rows: CmeOptionRow[]
  validRows: CmeOptionRow[]
  invalidRows: CmeOptionRow[]
}

function parseNumber(value: string): number | undefined {
  const normalized = value.trim()

  if (/^\d{1,3}[.,]\d{3}$/.test(normalized)) {
    const parsed = Number(normalized.replace(/[.,]/g, ''))
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const parsed = Number(normalized.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

function classifyRow(
  strike: number,
  values: number[],
  duplicate: boolean,
): {
  valid: boolean
  quality: CmeRowQuality
  reasons: string[]
} {
  const reasons: string[] = []

  if (duplicate) {
    reasons.push('DUPLICATE_STRIKE')
  }

  if (values.length < 10) {
    reasons.push('TOO_FEW_VALUES')
  }

  if (values.length > 14) {
    reasons.push('TOO_MANY_VALUES')
  }

  const suspiciousValues = values.filter((value) => value > 100000)

  if (suspiciousValues.length > 0) {
    reasons.push('EXTREME_VALUE')
  }

  if (values.length >= 10 && values.length <= 14 && reasons.length === 0) {
    return {
      valid: true,
      quality: 'VALID',
      reasons,
    }
  }

  if (values.length >= 8 && values.length < 10) {
    return {
      valid: false,
      quality: 'PARTIAL',
      reasons,
    }
  }

  return {
    valid: false,
    quality: duplicate ? 'DUPLICATE' : 'SUSPECT',
    reasons,
  }
}

export function parseCmeOptionsChain(
  text: string,
): CmeOptionsChainParsed {
  const contracts = [
    'OG3Q6',
    'OGU6',
    'OGV6',
    'OGX6',
    'OGZ6',
    'OGG7',
    'OGH7',
  ]

  const rows: CmeOptionRow[] = []

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()

    const match = line.match(/^(\d{4})\s+(.+)$/)

    if (!match) {
      continue
    }

    const strike = Number(match[1])

    if (!Number.isFinite(strike)) {
      continue
    }

    const values =
      match[2]
        .match(/\d+(?:[.,]\d+)*/g)
        ?.map(parseNumber)
        .filter(
          (value): value is number => value !== undefined,
        ) ?? []

    if (values.length === 0) {
      continue
    }

    const duplicate = rows.some((row) => row.strike === strike)

    const classification = classifyRow(
      strike,
      values,
      duplicate,
    )

    rows.push({
      strike,
      values,
      valueCount: values.length,
      valid: classification.valid,
      quality: classification.quality,
      reasons: classification.reasons,
    })
  }

  const validRows = rows.filter(
    (row) => row.quality === 'VALID',
  )

  const invalidRows = rows.filter(
    (row) => row.quality !== 'VALID',
  )

  return {
    contracts,
    rows,
    validRows,
    invalidRows,
  }
}
