export type GoldBasisResult = {
  spotSymbol: 'XAUUSD'
  futuresSymbol: 'GC'
  spotPrice: number
  futuresPrice: number
  basis: number
  basisPercent: number
  timestamp: string
}

export function calculateGoldBasis(
  spotPrice: number,
  futuresPrice: number,
): GoldBasisResult {
  if (
    !Number.isFinite(spotPrice) ||
    spotPrice <= 0 ||
    !Number.isFinite(futuresPrice) ||
    futuresPrice <= 0
  ) {
    throw new Error('Invalid XAUUSD or GC price for basis calculation')
  }

  const basis = futuresPrice - spotPrice

  return {
    spotSymbol: 'XAUUSD',
    futuresSymbol: 'GC',
    spotPrice,
    futuresPrice,
    basis,
    basisPercent: (basis / spotPrice) * 100,
    timestamp: new Date().toISOString(),
  }
}
