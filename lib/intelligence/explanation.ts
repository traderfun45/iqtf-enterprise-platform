import type { Intelligence } from "../market"
import {
  buildIntelligenceFactors,
  type FactorAnalysis,
} from "./factors"
import {
  detectIntelligenceConflicts,
  type ConflictAnalysis,
} from "./conflicts"

export type IntelligenceExplanation = {
  signal: "bullish" | "bearish" | "neutral"
  confidence: number
  primaryDriver: string | null

  supporting: string[]
  conflicting: string[]

  conflictSeverity: "low" | "medium" | "high"
  conflictImpact: number

  headline: string
  explanation: string
}

function getSignalLabel(
  signal: Intelligence["signal"]
) {
  if (signal === "bullish") return "Bullish"
  if (signal === "bearish") return "Bearish"
  return "Neutral"
}

function buildHeadline(
  data: Intelligence,
  factors: FactorAnalysis
) {
  const label = getSignalLabel(data.signal)

  if (factors.primaryDriver) {
    return `${label} signal driven primarily by ${factors.primaryDriver.name}`
  }

  return `${label} signal with no dominant factor`
}

function buildExplanation(
  data: Intelligence,
  factors: FactorAnalysis,
  conflicts: ConflictAnalysis
) {
  const signalLabel = getSignalLabel(data.signal)

  const supportingNames = factors.supporting
    .map((factor) => factor.name)
    .join(", ")

  const conflictingNames = factors.conflicting
    .map((factor) => factor.name)
    .join(", ")

  if (data.signal === "neutral") {
    return conflicts.hasConflict
      ? `The market remains neutral while ${conflictingNames} is reducing directional conviction.`
      : "The market remains neutral because no factor has established a strong directional edge."
  }

  let explanation =
    `${signalLabel} confidence is supported by ${supportingNames || "limited factor alignment"}.`

  if (conflicts.hasConflict) {
    explanation +=
      ` ${conflictingNames} is reducing conviction and should be monitored for confirmation.`
  }

  return explanation
}

export function buildIntelligenceExplanation(
  data: Intelligence
): IntelligenceExplanation {
  const factors = buildIntelligenceFactors(data)
  const conflicts = detectIntelligenceConflicts(factors)

  return {
    signal: data.signal,
    confidence: factors.confidence,
    primaryDriver: factors.primaryDriver?.name ?? null,

    supporting: factors.supporting.map(
      (factor) => factor.name
    ),

    conflicting: factors.conflicting.map(
      (factor) => factor.name
    ),

    conflictSeverity: conflicts.severity,
    conflictImpact: conflicts.totalImpact,

    headline: buildHeadline(data, factors),

    explanation: buildExplanation(
      data,
      factors,
      conflicts
    ),
  }
}
