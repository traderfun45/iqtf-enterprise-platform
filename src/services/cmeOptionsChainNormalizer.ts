import type {
  CmeOptionRow,
  CmeOptionsChainParsed,
} from './cmeOptionsChainParser.js'

export type CmeOptionCell = {
  contract: string
  side: 'CALL' | 'PUT'
  value: number | null
  missing: boolean
}

export type CmeNormalizedRow = {
  strike: number
  quality: CmeOptionRow['quality']
  valid: boolean
  cells: CmeOptionCell[]
}

export type CmeOptionsChainNormalized = {
  contracts: string[]
  expectedValueCount: number
  rows: CmeNormalizedRow[]
}

export function normalizeCmeOptionsChain(
  parsed: CmeOptionsChainParsed,
): CmeOptionsChainNormalized {
  const expectedValueCount = parsed.contracts.length * 2

  const rows = parsed.rows.map(
    (row: CmeOptionRow): CmeNormalizedRow => {
      const cells: CmeOptionCell[] = []

      for (let i = 0; i < expectedValueCount; i++) {
        const contractIndex = Math.floor(i / 2)
        const side: 'CALL' | 'PUT' = i % 2 === 0 ? 'CALL' : 'PUT'

        cells.push({
          contract: parsed.contracts[contractIndex],
          side,
          value: row.values[i] ?? null,
          missing: row.values[i] === undefined,
        })
      }

      return {
        strike: row.strike,
        quality: row.quality,
        valid: row.valid,
        cells,
      }
    },
  )

  return {
    contracts: parsed.contracts,
    expectedValueCount,
    rows,
  }
}
