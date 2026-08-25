export type IqtfDecision =
  | 'LONG'
  | 'LONG_WATCH'
  | 'NO_TRADE'
  | 'SHORT_WATCH'
  | 'SHORT'

export type IqtfRiskState =
  | 'LOW'
  | 'NORMAL'
  | 'ELEVATED'
  | 'HIGH'

export type IqtfDecisionResult = {
  compositeScore: number
  decision: IqtfDecision
  confidence: number
  riskState: IqtfRiskState

  components: {
    market: number
    cme: number
    vol2vol: number
    cot: number
  }

  reasons: string[]
  warnings: string[]
}

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.max(min, Math.min(max, value))
}

export function calculateIqtfDecision(params: {
  marketScore: number
  cmeConfirmation: number
  vol2volScore: number

  marketSignal?:
    | 'bullish'
    | 'bearish'
    | 'neutral'

  marketStructure?:
    | 'bullish'
    | 'bearish'
    | 'neutral'

  volatilityRegime?: string

  cmePositioning?:
    | 'LONG_BUILDUP'
    | 'SHORT_BUILDUP'
    | 'SHORT_COVERING'
    | 'LONG_LIQUIDATION'
    | 'NEUTRAL'

  cmeOiConfirmation?: string
  vol2volSignal?: string

  cotScore?: number
  cotPositioning?: string
}): IqtfDecisionResult {
  const market = clamp(
    params.marketScore,
    -1,
    1,
  )

  const cme = clamp(
    params.cmeConfirmation,
    -1,
    1,
  )

  const vol2vol = clamp(
    params.vol2volScore / 100,
    -1,
    1,
  )

  const cot = clamp(
    params.cotScore ?? 0,
    -1,
    1,
  )

  /*
   * INSTITUTIONAL IQTF V2 WEIGHTING
   *
   * Market   = 35%
   * CME      = 25%
   * Vol2Vol  = 25%
   * COT      = 15%
   */
  const compositeScore = clamp(
    market * 0.35 +
    cme * 0.25 +
    vol2vol * 0.25 +
    cot * 0.15,
    -1,
    1,
  )

  let decision: IqtfDecision = 'NO_TRADE'

  if (compositeScore >= 0.60) {
    decision = 'LONG'
  } else if (compositeScore >= 0.25) {
    decision = 'LONG_WATCH'
  } else if (compositeScore <= -0.60) {
    decision = 'SHORT'
  } else if (compositeScore <= -0.25) {
    decision = 'SHORT_WATCH'
  }

  const confidence = Math.round(
    Math.abs(compositeScore) * 100,
  )

  let riskState: IqtfRiskState = 'LOW'

  if (confidence >= 80) {
    riskState = 'HIGH'
  } else if (confidence >= 60) {
    riskState = 'ELEVATED'
  } else if (confidence >= 35) {
    riskState = 'NORMAL'
  }

  const reasons: string[] = []
  const warnings: string[] = []

  /*
   * MARKET EVIDENCE
   */
  if (params.marketSignal === 'bullish') {
    reasons.push('Market signal is bullish')
  } else if (params.marketSignal === 'bearish') {
    reasons.push('Market signal is bearish')
  }

  if (params.marketStructure === 'bullish') {
    reasons.push('Market structure is bullish')
  } else if (params.marketStructure === 'bearish') {
    reasons.push('Market structure is bearish')
  }

  /*
   * CME EVIDENCE
   */
  if (params.cmePositioning === 'LONG_BUILDUP') {
    reasons.push(
      'CME positioning shows LONG_BUILDUP',
    )
  } else if (
    params.cmePositioning === 'SHORT_BUILDUP'
  ) {
    reasons.push(
      'CME positioning shows SHORT_BUILDUP',
    )
  } else if (
    params.cmePositioning === 'SHORT_COVERING'
  ) {
    reasons.push(
      'CME positioning shows SHORT_COVERING',
    )
  } else if (
    params.cmePositioning === 'LONG_LIQUIDATION'
  ) {
    reasons.push(
      'CME positioning shows LONG_LIQUIDATION',
    )
  }

  /*
   * VOL2VOL EVIDENCE
   */
  if (params.vol2volSignal) {
    reasons.push(
      `Vol2Vol signal is ${params.vol2volSignal}`,
    )
  }

  /*
   * COT / INSTITUTIONAL EVIDENCE
   */
  if (params.cotPositioning) {
    if (
      params.cotPositioning === 'LONG' ||
      params.cotPositioning === 'STRONG_LONG'
    ) {
      reasons.push(
        `COT positioning is ${params.cotPositioning}`,
      )
    } else if (
      params.cotPositioning === 'SHORT' ||
      params.cotPositioning === 'STRONG_SHORT'
    ) {
      reasons.push(
        `COT positioning is ${params.cotPositioning}`,
      )
    }
  }

  /*
   * VOLATILITY WARNING
   */
  if (params.volatilityRegime === 'ELEVATED') {
    warnings.push(
      'Volatility regime is ELEVATED',
    )
  } else if (
    params.volatilityRegime === 'HIGH'
  ) {
    warnings.push(
      'Volatility regime is HIGH',
    )
  }

  /*
   * OI DATA WARNING
   */
  if (
    params.cmeOiConfirmation ===
    'INSUFFICIENT_DATA'
  ) {
    warnings.push(
      'Open Interest confirmation has insufficient historical data',
    )
  }

  /*
   * CONFLICT WARNING
   */
  const bullishComponents =
    Number(market > 0.25) +
    Number(cme > 0.25) +
    Number(vol2vol > 0.25) +
    Number(cot > 0.25)

  const bearishComponents =
    Number(market < -0.25) +
    Number(cme < -0.25) +
    Number(vol2vol < -0.25) +
    Number(cot < -0.25)

  if (
    bullishComponents > 0 &&
    bearishComponents > 0
  ) {
    warnings.push(
      'Market, CME, Vol2Vol and COT signals are conflicting',
    )
  }

  return {
    compositeScore,
    decision,
    confidence,
    riskState,

    components: {
      market,
      cme,
      vol2vol,
      cot,
    },

    reasons,
    warnings,
  }
}
