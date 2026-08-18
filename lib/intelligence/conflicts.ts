import type {
  FactorAnalysis,
  IntelligenceFactor,
} from "./factors"

export type ConflictSeverity =
  | "low"
  | "medium"
  | "high"

export type MarketConflictState =
  | "none"
  | "bullish_pullback"
  | "bearish_pullback"
  | "trend_reversal_risk"

export type IntelligenceConflict = {
  factorId: string
  factorName: string
  severity: ConflictSeverity
  score: number
  impact: number
  explanation: string
}

export type ConflictAnalysis = {
  conflicts: IntelligenceConflict[]
  hasConflict: boolean
  severity: ConflictSeverity
  totalImpact: number
  summary: string
  marketState: MarketConflictState
}

function getSeverity(
  impact: number
): ConflictSeverity {
  const value = Math.abs(impact)

  if (value >= 0.6) return "high"
  if (value >= 0.3) return "medium"
  return "low"
}

function explainConflict(
  factor: IntelligenceFactor
): string {
  if (factor.id === "trend") {
    return "Trend direction is opposing the current signal"
  }

  if (factor.id === "momentum") {
    return "Momentum is moving against the current directional signal"
  }

  if (factor.id === "structure") {
    return "Market structure is opposing the current directional bias"
  }

  if (factor.id === "volatility") {
    return "Elevated volatility is reducing directional confidence"
  }

  if (factor.id === "mtf") {
    return "Multi-timeframe confirmation is not aligned with the signal"
  }

  return `${factor.name} is reducing signal confidence`
}

function detectMarketConflictState(
  analysis: FactorAnalysis
): MarketConflictState {
  const trend = analysis.factors.find(
    (factor) => factor.id === "trend"
  )

  const structure = analysis.factors.find(
    (factor) => factor.id === "structure"
  )

  const momentum = analysis.factors.find(
    (factor) => factor.id === "momentum"
  )

  const mtf = analysis.factors.find(
    (factor) => factor.id === "mtf"
  )

  if (!trend || !structure || !momentum || !mtf) {
    return "none"
  }

  const bullishCore =
    trend.direction === "bullish" &&
    structure.direction === "bullish"

  const bearishCore =
    trend.direction === "bearish" &&
    structure.direction === "bearish"

  const bullishPullback =
    bullishCore &&
    mtf.direction === "bearish" &&
    momentum.direction !== "bearish"

  const bearishPullback =
    bearishCore &&
    mtf.direction === "bullish" &&
    momentum.direction !== "bullish"

  if (bullishPullback) {
    return "bullish_pullback"
  }

  if (bearishPullback) {
    return "bearish_pullback"
  }

  const bullishReversalRisk =
    bullishCore &&
    mtf.direction === "bearish" &&
    momentum.direction === "bearish"

  const bearishReversalRisk =
    bearishCore &&
    mtf.direction === "bullish" &&
    momentum.direction === "bullish"

  if (
    bullishReversalRisk ||
    bearishReversalRisk
  ) {
    return "trend_reversal_risk"
  }

  return "none"
}

export function detectIntelligenceConflicts(
  analysis: FactorAnalysis
): ConflictAnalysis {
  const conflicts = analysis.conflicting.map(
    (factor): IntelligenceConflict => {
      const impact = factor.contribution

      return {
        factorId: factor.id,
        factorName: factor.name,
        severity: getSeverity(impact),
        score: factor.score,
        impact,
        explanation: explainConflict(factor),
      }
    }
  )

  const totalImpact = conflicts.reduce(
    (total, conflict) =>
      total + Math.abs(conflict.impact),
    0
  )

  let severity: ConflictSeverity = "low"

  if (totalImpact >= 0.6) {
    severity = "high"
  } else if (totalImpact >= 0.3) {
    severity = "medium"
  }

  let summary = "No material factor conflict detected"

  if (severity === "high") {
    summary =
      "Multiple factors are materially reducing signal confidence"
  } else if (severity === "medium") {
    summary =
      "Some factors are conflicting with the current signal"
  } else if (conflicts.length > 0) {
    summary =
      "Minor factor conflict detected; monitor confirmation"
  }

  const marketState =
    detectMarketConflictState(analysis)

  return {
    conflicts,
    hasConflict: conflicts.length > 0,
    severity,
    totalImpact,
    summary,
    marketState,
  }
}
