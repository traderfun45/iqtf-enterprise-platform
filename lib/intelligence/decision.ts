import type { Intelligence } from "../market"
import {
  buildIntelligenceFactors,
  type FactorAnalysis,
} from "./factors"
import {
  detectIntelligenceConflicts,
  type ConflictAnalysis,
} from "./conflicts"

export type DecisionBias =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL"

export type DecisionAction =
  | "LONG WATCH"
  | "SHORT WATCH"
  | "WAIT"
  | "PROTECT"

export type DecisionReadiness =
  | "CONFIRMED"
  | "WATCH"
  | "NOT READY"

export type DecisionRisk =
  | "LOW"
  | "NORMAL"
  | "ELEVATED"
  | "HIGH"

export type IntelligenceDecision = {
  bias: DecisionBias
  action: DecisionAction
  readiness: DecisionReadiness
  confidence: number
  risk: DecisionRisk

  reason: string
  confirmation: string
  constraint: string

  factors: FactorAnalysis
  conflicts: ConflictAnalysis
}

function getRisk(data: Intelligence): DecisionRisk {
  const atrPercent = data.volatility.atrPercent

  if (atrPercent >= 0.5) return "HIGH"
  if (atrPercent >= 0.3) return "ELEVATED"
  if (atrPercent < 0.15) return "LOW"

  return "NORMAL"
}

function getBias(data: Intelligence): DecisionBias {
  if (data.signal === "bullish") return "BULLISH"
  if (data.signal === "bearish") return "BEARISH"

  if (
    data.trend.direction === "bullish" &&
    data.score > 0
  ) {
    return "BULLISH"
  }

  if (
    data.trend.direction === "bearish" &&
    data.score < 0
  ) {
    return "BEARISH"
  }

  return "NEUTRAL"
}

function getConfidence(
  data: Intelligence,
  factors: FactorAnalysis,
  conflicts: ConflictAnalysis,
): number {
  const base = Math.min(
    100,
    Math.round(Math.abs(data.score) * 100),
  )

  const supportingBonus = Math.min(
    20,
    factors.supporting.length * 4,
  )

  const conflictPenalty = Math.min(
    25,
    Math.round(conflicts.totalImpact * 25),
  )

  const volatilityPenalty =
    data.volatility.atrPercent >= 0.5
      ? 20
      : data.volatility.atrPercent >= 0.3
        ? 10
        : 0

  return Math.max(
    0,
    Math.min(
      100,
      base + supportingBonus - conflictPenalty - volatilityPenalty,
    ),
  )
}

function getReadiness(
  bias: DecisionBias,
  confidence: number,
  risk: DecisionRisk,
  data: Intelligence,
): DecisionReadiness {
  if (
    risk === "HIGH" ||
    bias === "NEUTRAL"
  ) {
    return "NOT READY"
  }

  const momentumAligned =
    (bias === "BULLISH" && data.momentum.score > 0) ||
    (bias === "BEARISH" && data.momentum.score < 0)

  const mtfAligned =
    (bias === "BULLISH" && data.mtf.alignment === "bullish") ||
    (bias === "BEARISH" && data.mtf.alignment === "bearish")

  if (
    confidence >= 70 &&
    momentumAligned &&
    mtfAligned
  ) {
    return "CONFIRMED"
  }

  if (
    confidence >= 50 &&
    momentumAligned &&
    mtfAligned
  ) {
    return "WATCH"
  }

  return "NOT READY"
}
function getAction(
  bias: DecisionBias,
  readiness: DecisionReadiness,
  risk: DecisionRisk,
): DecisionAction {
  if (risk === "HIGH") {
    return "PROTECT"
  }

  if (
    bias === "BULLISH" &&
    readiness !== "NOT READY"
  ) {
    return "LONG WATCH"
  }

  if (
    bias === "BEARISH" &&
    readiness !== "NOT READY"
  ) {
    return "SHORT WATCH"
  }

  return "WAIT"
}

function getReason(
  bias: DecisionBias,
  data: Intelligence,
  factors: FactorAnalysis,
  conflicts: ConflictAnalysis,
): string {
  if (data.mtf.alignment === "mixed") {
    return "MTF alignment is mixed; directional confirmation remains incomplete"
  }

  if (conflicts.hasConflict) {
    return `Directional evidence exists, but ${conflicts.conflicts.length} intelligence conflict(s) require confirmation`
  }

  if (bias === "BULLISH") {
    return "Bullish evidence is supported by the current intelligence factors"
  }

  if (bias === "BEARISH") {
    return "Bearish evidence is supported by the current intelligence factors"
  }

  if (factors.primaryDriver) {
    return `${factors.primaryDriver.name} is currently the primary intelligence driver`
  }

  return "No sufficiently strong directional evidence is active"
}

function getConfirmation(
  data: Intelligence,
  readiness: DecisionReadiness,
): string {
  if (data.mtf.alignment === "mixed") {
    return "Wait for MTF alignment"
  }

  if (data.momentum.score === 0) {
    return "Wait for momentum confirmation"
  }

  if (readiness === "CONFIRMED") {
    return "Directional confirmation is currently sufficient"
  }

  if (readiness === "WATCH") {
    return "Monitor confirmation before directional exposure"
  }

  return "Require stronger directional evidence"
}

function getConstraint(
  risk: DecisionRisk,
  readiness: DecisionReadiness,
): string {
  if (risk === "HIGH") {
    return "Do not initiate new exposure while volatility is elevated"
  }

  if (readiness === "CONFIRMED") {
    return "Execute only after the defined market trigger"
  }

  if (readiness === "WATCH") {
    return "No execution without additional confirmation"
  }

  return "No directional execution"
}

export function buildIntelligenceDecision(
  data: Intelligence,
): IntelligenceDecision {
  const factors = buildIntelligenceFactors(data)
  const conflicts = detectIntelligenceConflicts(
    factors,
  )

  const risk = getRisk(data)
  const bias = getBias(data)

  const confidence = getConfidence(
    data,
    factors,
    conflicts,
  )

  const readiness = getReadiness(
    bias,
    confidence,
    risk,
    data,
  )

  const action = getAction(
    bias,
    readiness,
    risk,
  )

  return {
    bias,
    action,
    readiness,
    confidence,
    risk,
    reason: getReason(
      bias,
      data,
      factors,
      conflicts,
    ),
    confirmation: getConfirmation(
      data,
      readiness,
    ),
    constraint: getConstraint(
      risk,
      readiness,
    ),
    factors,
    conflicts,
  }
}
