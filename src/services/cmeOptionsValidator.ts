import type { CmeOptionsChainParsed } from './cmeOptionsChainParser.js'

export type CmeOptionsValidationRow = {
  strike: number
  values: number[]
  valueCount: number
  expectedCount: number
  status: 'VALID' | 'INCOMPLETE' | 'LOW_CONFIDENCE'
  confidence: number
}

export type CmeOptionsValidationResult = {
  contracts: string[]
  expectedCount: number
  rows: CmeOptionsValidationRow[]
}

export function validateCmeOptionsChain(
  parsed: CmeOptionsChainParsed,
): CmeOptionsValidationResult {
  const expectedCount = parsed.contracts.length * 2

  const rows = parsed.rows.map((row) => {
    const count = row.values.length

    let status: CmeOptionsValidationRow['status']
    let confidence: number

    if (count === expectedCount) {
      status = 'VALID'
      confidence = 0.95
    } else if (count >= expectedCount - 2) {
      status = 'INCOMPLETE'
      confidence = 0.70
    } else {
      status = 'LOW_CONFIDENCE'
      confidence = 0.40
    }

    return {
      strike: row.strike,
      values: row.values,
      valueCount: count,
      expectedCount,
      status,
      confidence,
    }
  })

  return {
    contracts: parsed.contracts,
    expectedCount,
    rows,
  }
}
