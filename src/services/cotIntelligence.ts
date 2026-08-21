import type { CotMarketData } from '../db/cot.js'

export type CotPositioning =
  | 'STRONG_LONG'
  | 'LONG'
  | 'NEUTRAL'
  | 'SHORT'
  | 'STRONG_SHORT'

export type CotConfidence =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'

export type CotIntelligence = {
  managedMoneyNet: number
  producerNet: number
  swapDealerNet: number
  otherReportablesNet: number

  managedMoneyNetChange: number
  producerNetChange: number
  swapDealerNetChange: number
  otherReportablesNetChange: number

  positioning: CotPositioning
  confidence: CotConfidence
  score: number

  reasons: string[]
}

function value(value: number | undefined): number {
  return value ?? 0
}

function net(
  long: number | undefined,
  short: number | undefined,
): number {
  return value(long) - value(short)
}

export function analyzeCotIntelligence(params: {
  latest: CotMarketData
  previous?: CotMarketData | null
}): CotIntelligence {
  const { latest, previous } = params

  const managedMoneyNet = net(
    latest.managedMoneyLong,
    latest.managedMoneyShort,
  )

  const producerNet = net(
    latest.producerLong,
    latest.producerShort,
  )

  const swapDealerNet = net(
    latest.swapDealerLong,
    latest.swapDealerShort,
  )

  const otherReportablesNet = net(
    latest.otherReportablesLong,
    latest.otherReportablesShort,
  )

  /*
   * When there is no previous COT report,
   * there is no valid change to calculate.
   */
  const managedMoneyNetChange = previous
    ? managedMoneyNet -
      net(
        previous.managedMoneyLong,
        previous.managedMoneyShort,
      )
    : 0

  const producerNetChange = previous
    ? producerNet -
      net(
        previous.producerLong,
        previous.producerShort,
      )
    : 0

  const swapDealerNetChange = previous
    ? swapDealerNet -
      net(
        previous.swapDealerLong,
        previous.swapDealerShort,
      )
    : 0

  const otherReportablesNetChange = previous
    ? otherReportablesNet -
      net(
        previous.otherReportablesLong,
        previous.otherReportablesShort,
      )
    : 0

  let score = 0
  const reasons: string[] = []

  if (managedMoneyNet > 0) {
    score += 1
    reasons.push('Managed Money is net long')
  } else if (managedMoneyNet < 0) {
    score -= 1
    reasons.push('Managed Money is net short')
  }

  if (previous) {
    if (managedMoneyNetChange > 0) {
      score += 1
      reasons.push(
        'Managed Money increased net long exposure',
      )
    } else if (managedMoneyNetChange < 0) {
      score -= 1
      reasons.push(
        'Managed Money decreased net long exposure',
      )
    }

    if (producerNetChange < 0) {
      score += 1
      reasons.push(
        'Producer/Merchant net position decreased',
      )
    } else if (producerNetChange > 0) {
      score -= 1
      reasons.push(
        'Producer/Merchant net position increased',
      )
    }
  }

  let positioning: CotPositioning

  if (score >= 2) {
    positioning = 'STRONG_LONG'
  } else if (score === 1) {
    positioning = 'LONG'
  } else if (score === 0) {
    positioning = 'NEUTRAL'
  } else if (score === -1) {
    positioning = 'SHORT'
  } else {
    positioning = 'STRONG_SHORT'
  }

  let confidence: CotConfidence

  if (!previous) {
    confidence = 'LOW'
  } else if (Math.abs(score) >= 2) {
    confidence = 'HIGH'
  } else {
    confidence = 'MEDIUM'
  }

  return {
    managedMoneyNet,
    producerNet,
    swapDealerNet,
    otherReportablesNet,

    managedMoneyNetChange,
    producerNetChange,
    swapDealerNetChange,
    otherReportablesNetChange,

    positioning,
    confidence,
    score,

    reasons,
  }
}
