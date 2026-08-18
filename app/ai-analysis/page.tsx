"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from "react"
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  ShieldCheck,
  RefreshCw,
} from "lucide-react"

import {
  getMarketIntelligence,
  type Intelligence,
} from "@/lib/market"

import {
  buildIntelligenceDecision,
  type IntelligenceDecision,
} from "@/lib/intelligence/decision"

function formatScore(value: number) {
  return value.toFixed(3)
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

function getDecision(
  data: Intelligence | null
): IntelligenceDecision {
  if (!data) {
    return {
      bias: "NEUTRAL",
      confidence: 0,
      risk: "NORMAL",
      action: "WAIT",
      readiness: "NOT READY",
      reason: "Live intelligence data is required",
      confirmation: "WAITING",
      constraint: "No execution without live data",
      factors: {
        factors: [],
        supporting: [],
        conflicting: [],
        neutral: [],
        primaryDriver: null,
        confidence: 0,
      },
      conflicts: {
        conflicts: [],
        hasConflict: false,
        severity: "low",
        totalImpact: 0,
        summary: "No live intelligence data available",
      },
    }
  }

  return buildIntelligenceDecision(data)
}

function getRiskPositionContext(
  data: Intelligence | null,
  decision: ReturnType<typeof getDecision>
) {
  if (!data) {
    return {
      positionBias: "NEUTRAL",
      readiness: "NOT READY",
      riskLevel: "UNKNOWN",
      atrContext: "—",
      protection: "WAIT FOR LIVE DATA",
    }
  }

  const atr = data.volatility.atr
  const atrPercent = data.volatility.atrPercent

  let positionBias = "NEUTRAL"

  if (decision.bias === "BULLISH") {
    positionBias = "LONG-SIDE"
  } else if (decision.bias === "BEARISH") {
    positionBias = "SHORT-SIDE"
  }

  let readiness = "NOT READY"

  if (
    decision.action !== "WAIT" &&
    decision.confidence >= 70 &&
    decision.risk !== "HIGH"
  ) {
    readiness = "CONFIRMED"
  } else if (
    decision.bias !== "NEUTRAL" &&
    decision.confidence >= 50 &&
    decision.risk !== "HIGH"
  ) {
    readiness = "WATCH"
  }

  let riskLevel = "NORMAL"

  if (atrPercent >= 0.5) {
    riskLevel = "HIGH"
  } else if (atrPercent >= 0.3) {
    riskLevel = "ELEVATED"
  } else if (atrPercent < 0.15) {
    riskLevel = "LOW"
  }

  const atrContext = `ATR ${atr.toFixed(2)} · ${atrPercent.toFixed(2)}%`

  let protection = "Monitor confirmation before directional exposure"

  if (riskLevel === "HIGH") {
    protection = "High-volatility protection active"
  } else if (readiness === "NOT READY") {
    protection = "Insufficient confirmation · WAIT"
  } else if (readiness === "WATCH") {
    protection = "Monitor confirmation and volatility"
  } else {
    protection = "Conditions remain within defined risk limits"
  }

  return {
    positionBias,
    readiness,
    riskLevel,
    atrContext,
    protection,
  }
}

function getTradePlan(
  data: Intelligence | null,
  decision: ReturnType<typeof getDecision>,
  riskPosition: ReturnType<typeof getRiskPositionContext>
) {
  if (!data) {
    return {
      setup: "WAIT",
      direction: "NEUTRAL",
      trigger: "WAIT FOR LIVE DATA",
      invalidation: "—",
      target: "—",
      riskReward: "—",
      planStatus: "NOT READY",
    }
  }

  const atr = data.volatility.atr

  let setup = "WAIT"
  let direction = "NEUTRAL"
  let trigger = "Require directional confirmation"
  let invalidation = `ATR protection · ${atr.toFixed(2)}`
  let target = `Monitor ≥ 1.5 ATR · ${(atr * 1.5).toFixed(2)}`
  let riskReward = "1 : 1.5"
  let planStatus = "CONFIRMATION REQUIRED"

  if (
    decision.action === "LONG WATCH" &&
    riskPosition.readiness === "CONFIRMED"
  ) {
    setup = "LONG SETUP"
    direction = "LONG"
    trigger = "Bullish confirmation above active structure"
    invalidation = `Below risk boundary · ~${atr.toFixed(2)} ATR`
    target = `Initial objective · ~${(atr * 1.5).toFixed(2)}`
    riskReward = "1 : 1.5"
    planStatus = "READY"
  } else if (
    decision.action === "SHORT WATCH" &&
    riskPosition.readiness === "CONFIRMED"
  ) {
    setup = "SHORT SETUP"
    direction = "SHORT"
    trigger = "Bearish confirmation below active structure"
    invalidation = `Above risk boundary · ~${atr.toFixed(2)} ATR`
    target = `Initial objective · ~${(atr * 1.5).toFixed(2)}`
    riskReward = "1 : 1.5"
    planStatus = "READY"
  }

  if (data.volatility.atrPercent >= 0.5) {
    planStatus = "HIGH RISK · WAIT"
    setup = "WAIT"
    direction = "NEUTRAL"
    trigger = "Wait for volatility normalization"
  }

  return {
    setup,
    direction,
    trigger,
    invalidation,
    target,
    riskReward,
    planStatus,
  }
}

function getMonitoringContext(
  data: Intelligence | null,
  decision: ReturnType<typeof getDecision>,
  riskPosition: ReturnType<typeof getRiskPositionContext>,
  tradePlan: ReturnType<typeof getTradePlan>
) {
  if (!data) {
    return {
      regime: "UNKNOWN",
      scenario: "NEUTRAL",
      confirmation: "WAITING",
      priority: "LOW",
      watch: "WAIT FOR LIVE DATA",
      invalidation: "LIVE DATA REQUIRED",
    }
  }

  const trendScore = data.trend.score
  const momentumScore = data.momentum.score
  const atrPercent = data.volatility.atrPercent

  let regime = "RANGE"

  if (atrPercent >= 0.5) {
    regime = "HIGH VOLATILITY"
  } else if (atrPercent < 0.15) {
    regime = "LOW VOLATILITY"
  } else if (Math.abs(trendScore) >= 0.1) {
    regime = "TRENDING"
  }

  let scenario = "NEUTRAL"

  if (
    data.trend.direction === "bullish" &&
    trendScore > 0 &&
    momentumScore > 0
  ) {
    scenario = "BULLISH"
  } else if (
    data.trend.direction === "bearish" &&
    trendScore < 0 &&
    momentumScore < 0
  ) {
    scenario = "BEARISH"
  }

  let confirmation = "WAITING"

  if (
    decision.action !== "WAIT" &&
    riskPosition.readiness === "CONFIRMED"
  ) {
    confirmation = "CONFIRMED"
  } else if (
    scenario !== "NEUTRAL" ||
    riskPosition.readiness === "WATCH"
  ) {
    confirmation = "DEVELOPING"
  }

  let priority = "LOW"

  if (
    confirmation === "CONFIRMED" ||
    regime === "HIGH VOLATILITY"
  ) {
    priority = "HIGH"
  } else if (
    confirmation === "DEVELOPING" ||
    regime === "TRENDING"
  ) {
    priority = "MEDIUM"
  }

  let watch = "Monitor trend and momentum alignment"

  if (scenario === "BULLISH") {
    watch = "Monitor bullish continuation and momentum confirmation"
  } else if (scenario === "BEARISH") {
    watch = "Monitor bearish continuation and momentum confirmation"
  } else if (data.trend.direction === "bullish") {
    watch = "Bullish trend remains active, but momentum confirmation is required"
  } else if (data.trend.direction === "bearish") {
    watch = "Bearish trend remains active, but momentum confirmation is required"
  }

  let invalidation = "No directional confirmation yet"

  if (tradePlan.direction === "LONG") {
    invalidation = "Cancel long scenario if bullish structure fails"
  } else if (tradePlan.direction === "SHORT") {
    invalidation = "Cancel short scenario if bearish structure fails"
  } else if (scenario === "BULLISH") {
    invalidation = "Bullish scenario weakens if trend and momentum diverge"
  } else if (scenario === "BEARISH") {
    invalidation = "Bearish scenario weakens if trend and momentum diverge"
  }

  return {
    regime,
    scenario,
    confirmation,
    priority,
    watch,
    invalidation,
  }
}

function getAlertContext(
  data: Intelligence | null,
  decision: ReturnType<typeof getDecision>,
  riskPosition: ReturnType<typeof getRiskPositionContext>,
  tradePlan: ReturnType<typeof getTradePlan>,
  monitoring: ReturnType<typeof getMonitoringContext>
) {
  if (!data) {
    return {
      level: "LOW",
      primary: "DATA UNAVAILABLE",
      escalation: "NONE",
      reason: "Live intelligence data is required",
      action: "WAIT FOR LIVE DATA",
    }
  }

  const atrPercent = data.volatility.atrPercent
  const trendScore = data.trend.score
  const momentumScore = data.momentum.score

  const divergence =
    (data.trend.direction === "bullish" && momentumScore < 0) ||
    (data.trend.direction === "bearish" && momentumScore > 0)

  let level = "NORMAL"
  let primary = "NO ACTIVE ALERT"
  let escalation = "NONE"
  let reason = "Current market state remains within defined monitoring limits"
  let action = "CONTINUE MONITORING"

  if (atrPercent >= 0.5) {
    level = "HIGH"
    primary = "HIGH VOLATILITY"
    escalation = "RISK ESCALATION"
    reason = "Volatility has exceeded the defined high-risk threshold"
    action = "REDUCE EXPOSURE AND WAIT FOR STABILITY"
  } else if (
    riskPosition.readiness === "CONFIRMED" &&
    decision.risk === "HIGH"
  ) {
    level = "HIGH"
    primary = "CONFIRMED SETUP / HIGH RISK"
    escalation = "RISK ESCALATION"
    reason = "Directional confirmation exists while risk remains elevated"
    action = "REQUIRE STRICT RISK CONTROL"
  } else if (divergence) {
    level = "MEDIUM"
    primary = "TREND / MOMENTUM DIVERGENCE"
    escalation = "CONFIRMATION ESCALATION"
    reason = "Trend direction and momentum are not aligned"
    action = "WAIT FOR MOMENTUM CONFIRMATION"
  } else if (
    monitoring.confirmation === "DEVELOPING" ||
    monitoring.priority === "MEDIUM"
  ) {
    level = "MEDIUM"
    primary = "DEVELOPING SCENARIO"
    escalation = "MONITOR CLOSELY"
    reason = "Directional conditions are developing but remain unconfirmed"
    action = "MONITOR FOR CONFIRMATION"
  } else if (
    Math.abs(trendScore) >= 0.1 ||
    monitoring.regime === "TRENDING"
  ) {
    level = "LOW"
    primary = "TREND ACTIVE"
    escalation = "ROUTINE MONITORING"
    reason = "A directional trend is active without elevated risk conditions"
    action = "CONTINUE MONITORING"
  }

  return {
    level,
    primary,
    escalation,
    reason,
    action,
  }
}

function getActionContext(
  data: Intelligence | null,
  decision: ReturnType<typeof getDecision>,
  riskPosition: ReturnType<typeof getRiskPositionContext>,
  tradePlan: ReturnType<typeof getTradePlan>,
  monitoring: ReturnType<typeof getMonitoringContext>,
  alert: ReturnType<typeof getAlertContext>
) {
  if (!data) {
    return {
      action: "WAIT",
      state: "DATA REQUIRED",
      priority: "LOW",
      nextStep: "Wait for live intelligence data",
      constraint: "No execution without live data",
    }
  }

  let action = "WAIT"
  let state = "OBSERVE"
  let priority = "LOW"
  let nextStep = "Continue monitoring current market state"
  let constraint = "No execution without confirmation"

  if (alert.level === "HIGH") {
    action = "PROTECT"
    state = "RISK CONTROL"
    priority = "HIGH"
    nextStep = alert.action
    constraint = "Do not initiate new exposure while risk is elevated"
  } else if (
    tradePlan.direction === "LONG" &&
    tradePlan.planStatus === "READY"
  ) {
    action = "PREPARE LONG"
    state = "EXECUTION READY"
    priority = "HIGH"
    nextStep = "Wait for the defined long trigger before execution"
    constraint = "Execute only after trigger confirmation"
  } else if (
    tradePlan.direction === "SHORT" &&
    tradePlan.planStatus === "READY"
  ) {
    action = "PREPARE SHORT"
    state = "EXECUTION READY"
    priority = "HIGH"
    nextStep = "Wait for the defined short trigger before execution"
    constraint = "Execute only after trigger confirmation"
  } else if (
    monitoring.confirmation === "DEVELOPING"
  ) {
    action = "WAIT FOR CONFIRMATION"
    state = "DEVELOPING"
    priority = "MEDIUM"
    nextStep = monitoring.watch
    constraint = "Do not execute while directional confirmation is incomplete"
  } else if (
    monitoring.scenario === "BULLISH"
  ) {
    action = "WATCH LONG"
    state = "WATCH"
    priority = "MEDIUM"
    nextStep = "Monitor bullish continuation and momentum confirmation"
    constraint = "No long execution without confirmation"
  } else if (
    monitoring.scenario === "BEARISH"
  ) {
    action = "WATCH SHORT"
    state = "WATCH"
    priority = "MEDIUM"
    nextStep = "Monitor bearish continuation and momentum confirmation"
    constraint = "No short execution without confirmation"
  } else if (
    decision.action !== "WAIT"
  ) {
    action = "MONITOR BIAS"
    state = "BIAS ACTIVE"
    priority = "LOW"
    nextStep = "Monitor for alignment between decision and market confirmation"
    constraint = "Maintain conditional execution only"
  }

  return {
    action,
    state,
    priority,
    nextStep,
    constraint,
  }
}

function getExecutiveSummary(
  data: Intelligence | null,
  decision: ReturnType<typeof getDecision>,
  riskPosition: ReturnType<typeof getRiskPositionContext>,
  tradePlan: ReturnType<typeof getTradePlan>,
  monitoring: ReturnType<typeof getMonitoringContext>,
  alert: ReturnType<typeof getAlertContext>,
  actionContext: ReturnType<typeof getActionContext>
) {
  if (!data) {
    return {
      regime: "UNKNOWN",
      bias: "NEUTRAL",
      risk: "UNKNOWN",
      action: "WAIT",
      verdict: "LIVE MARKET DATA REQUIRED",
      current: "Waiting for live intelligence",
      next: "Wait for live market data",
      invalidation: "No decision can be validated without live data",
    }
  }

  const bias =
    monitoring.scenario === "BULLISH"
      ? "BULLISH"
      : monitoring.scenario === "BEARISH"
        ? "BEARISH"
        : "NEUTRAL"

    const risk =
      alert.level === "HIGH"
        ? "HIGH"
        : decision.risk === "ELEVATED"
          ? "ELEVATED"
          : decision.risk === "LOW"
            ? "LOW"
            : "NORMAL"

  let verdict = "NEUTRAL — WAIT FOR CONFIRMATION"

  if (
    actionContext.action === "PREPARE LONG" &&
    monitoring.confirmation === "CONFIRMED"
  ) {
    verdict = "LONG SCENARIO — WAIT FOR TRIGGER"
  } else if (
    actionContext.action === "PREPARE SHORT" &&
    monitoring.confirmation === "CONFIRMED"
  ) {
    verdict = "SHORT SCENARIO — WAIT FOR TRIGGER"
  } else if (alert.level === "HIGH") {
    verdict = "RISK ELEVATED — PROTECT CAPITAL"
  } else if (bias === "BULLISH") {
    verdict = "BULLISH BIAS — CONFIRM MOMENTUM"
  } else if (bias === "BEARISH") {
    verdict = "BEARISH BIAS — CONFIRM MOMENTUM"
  }

  let current = "Market conditions remain neutral"

  if (bias === "BULLISH") {
    current = "Bullish structure is active"
  } else if (bias === "BEARISH") {
    current = "Bearish structure is active"
  } else if (data.trend.direction === "bullish") {
    current = "Bullish trend exists but confirmation is incomplete"
  } else if (data.trend.direction === "bearish") {
    current = "Bearish trend exists but confirmation is incomplete"
  }

  let next = actionContext.nextStep

  if (monitoring.confirmation === "DEVELOPING") {
    next = monitoring.watch
  }

  let invalidation = monitoring.invalidation

  if (tradePlan.direction === "LONG") {
    invalidation = "Long thesis invalidates if bullish structure fails"
  } else if (tradePlan.direction === "SHORT") {
    invalidation = "Short thesis invalidates if bearish structure fails"
  }

  return {
    regime: monitoring.regime,
    bias,
    risk,
    action: actionContext.action,
    verdict,
    current,
    next,
    invalidation,
  }
}

function getSignalConfidence(
  data: Intelligence | null,
  decision: ReturnType<typeof getDecision>,
  riskPosition: ReturnType<typeof getRiskPositionContext>,
  monitoring: ReturnType<typeof getMonitoringContext>,
  alert: ReturnType<typeof getAlertContext>
) {
  if (!data) {
    return {
      confidence: 0,
      quality: "UNAVAILABLE",
      trendStrength: 0,
      momentumStrength: 0,
      volatilityQuality: 0,
      decisionAlignment: 0,
      riskAlignment: 0,
      reason: "Live intelligence data is required",
      weakness: "No live market data",
    }
  }

  const trendStrength = Math.round(
    Math.min(100, Math.abs(data.trend.score) * 500)
  )

  const momentumStrength = Math.round(
    Math.min(100, Math.abs(data.momentum.score) * 500)
  )

  const atrPercent = data.volatility.atrPercent

  let volatilityQuality = 70

  if (atrPercent >= 0.5) {
    volatilityQuality = 25
  } else if (atrPercent >= 0.3) {
    volatilityQuality = 50
  } else if (atrPercent < 0.15) {
    volatilityQuality = 55
  }

  const decisionAlignment =
    decision.readiness === "CONFIRMED"
      ? 100
      : decision.readiness === "WATCH"
        ? 65
        : decision.action === "PROTECT"
          ? 30
          : 40

  const riskAlignment =
    decision.risk === "HIGH"
      ? 30
      : decision.risk === "ELEVATED"
        ? 55
        : decision.risk === "LOW"
          ? 90
          : 75

  // Single source of truth:
  // Executive decision confidence is the authoritative confidence.
  const confidence = decision.confidence

  let quality = "WEAK"

  if (confidence >= 75) {
    quality = "STRONG"
  } else if (confidence >= 50) {
    quality = "MODERATE"
  }

  let reason =
    "Directional evidence is weak and confirmation is incomplete"

  if (decision.readiness === "CONFIRMED") {
    reason =
      "Trend, momentum, decision and risk conditions support the current directional bias"
  } else if (decision.readiness === "WATCH") {
    reason =
      "Directional evidence is developing, but confirmation remains incomplete"
  } else if (decision.action === "PROTECT") {
    reason =
      "Volatility or risk conditions require protection before new directional exposure"
  }

  if (data.mtf.alignment === "mixed") {
    reason =
      "MTF alignment is mixed; directional confirmation remains incomplete"
  }

  let weakness = "No major weakness detected"

  if (data.mtf.alignment === "mixed") {
    weakness = "Multi-timeframe alignment is mixed"
  } else if (decision.conflicts.hasConflict) {
    weakness =
      "Intelligence conflicts are reducing directional conviction"
  } else if (momentumStrength < 35) {
    weakness = "Momentum strength is weak"
  } else if (trendStrength < 35) {
    weakness = "Trend strength is weak"
  } else if (volatilityQuality < 40) {
    weakness = "Volatility conditions reduce signal quality"
  } else if (decision.risk === "HIGH") {
    weakness = "Risk conditions require protection"
  } else if (monitoring.scenario === "NEUTRAL") {
    weakness = "No clear directional scenario is active"
  } else if (alert.level === "HIGH") {
    weakness = "Active alert conditions reduce decision quality"
  }

  return {
    confidence,
    quality,
    trendStrength,
    momentumStrength,
    volatilityQuality,
    decisionAlignment,
    riskAlignment,
    reason,
    weakness,
  }
}

export default function AIAnalysisPage() {


  const [data, setData] = useState<Intelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadIntelligence(isInitialLoad = false) {
    try {
      if (isInitialLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setError(null)

      const result = await getMarketIntelligence(
        "XAUUSD",
        "1h",
        50
      )

      setData(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load market intelligence"
      )
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      }

      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadIntelligence(true)

    const timer = setInterval(() => {
      loadIntelligence(false)
    }, 30000)

    return () => clearInterval(timer)
  }, [])

  const signal = data?.signal ?? "neutral"
  const isBullish = signal === "bullish"
  const isBearish = signal === "bearish"

  const signalLabel = signal.toUpperCase()

  const signalColor = isBullish
    ? "text-emerald-400"
    : isBearish
      ? "text-red-400"
      : "text-zinc-400"

  const signalBg = isBullish
    ? "bg-emerald-500/10"
    : isBearish
      ? "bg-red-500/10"
      : "bg-zinc-500/10"

  const decision = getDecision(data)

  const decisionColor =
    decision.bias === "BULLISH"
      ? "text-emerald-400"
      : decision.bias === "BEARISH"
        ? "text-red-400"
        : "text-zinc-300"

  const riskColor =
    decision.risk === "HIGH"
      ? "text-red-400"
      : decision.risk === "ELEVATED"
        ? "text-yellow-400"
        : decision.risk === "LOW"
          ? "text-emerald-400"
          : "text-zinc-300"

  const riskPosition = getRiskPositionContext(data, decision)

  const readinessColor =
    riskPosition.readiness === "CONFIRMED"
      ? "text-emerald-400"
      : riskPosition.readiness === "WATCH"
        ? "text-yellow-400"
        : "text-zinc-300"

  const tradePlan = getTradePlan(
    data,
    decision,
    riskPosition
  )

  const tradePlanColor =
    tradePlan.direction === "LONG"
      ? "text-emerald-400"
      : tradePlan.direction === "SHORT"
        ? "text-red-400"
        : "text-zinc-300"

  const monitoring = getMonitoringContext(
    data,
    decision,
    riskPosition,
    tradePlan
  )

  const monitoringColor =
    monitoring.scenario === "BULLISH"
      ? "text-emerald-400"
      : monitoring.scenario === "BEARISH"
        ? "text-red-400"
        : "text-zinc-300"

  const priorityColor =
    monitoring.priority === "HIGH"
      ? "text-red-400"
      : monitoring.priority === "MEDIUM"
        ? "text-yellow-400"
        : "text-zinc-300"

  const alert = getAlertContext(
    data,
    decision,
    riskPosition,
    tradePlan,
    monitoring
  )

  const alertColor =
    alert.level === "HIGH"
      ? "text-red-400"
      : alert.level === "MEDIUM"
        ? "text-yellow-400"
        : alert.level === "LOW"
          ? "text-sky-400"
          : "text-emerald-400"

  const actionContext = getActionContext(
    data,
    decision,
    riskPosition,
    tradePlan,
    monitoring,
    alert
  )

  const actionColor =
    actionContext.priority === "HIGH"
      ? "text-red-400"
      : actionContext.priority === "MEDIUM"
        ? "text-yellow-400"
        : "text-sky-400"

  const executiveSummary = getExecutiveSummary(
    data,
    decision,
    riskPosition,
    tradePlan,
    monitoring,
    alert,
    actionContext
  )

  const executiveBiasColor =
    executiveSummary.bias === "BULLISH"
      ? "text-emerald-400"
      : executiveSummary.bias === "BEARISH"
        ? "text-red-400"
        : "text-zinc-300"

  const executiveRiskColor =
    executiveSummary.risk === "HIGH"
      ? "text-red-400"
      : executiveSummary.risk === "ELEVATED"
        ? "text-yellow-400"
        : executiveSummary.risk === "CONTROLLED"
          ? "text-emerald-400"
          : "text-zinc-300"

  const signalConfidence = getSignalConfidence(
    data,
    decision,
    riskPosition,
    monitoring,
    alert
  )

  const confidenceColor =
    signalConfidence.quality === "STRONG"
      ? "text-emerald-400"
      : signalConfidence.quality === "MODERATE"
        ? "text-yellow-400"
        : signalConfidence.quality === "WEAK"
          ? "text-red-400"
          : "text-zinc-400"

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              LIVE
            </span>

            <span className="text-xs text-zinc-500">
              XAUUSD · {data?.interval ?? "1h"}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white">
            Executive Intelligence
          </h1>

          <p className="mt-1 text-zinc-400">
            Institutional AI Market Analysis Engine
          </p>
        </div>

        <button
          onClick={() => loadIntelligence(false)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.06] disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading || refreshing ? "animate-spin" : ""
            }`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
          <p className="mt-1 text-xs text-zinc-500">
            Make sure iqtf-enterprise API is running on port 4000.
          </p>
        </div>
      )}

      {/* Executive Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">
            Market Regime
          </p>

          <p className="mt-2 text-2xl font-bold uppercase text-white">
            {data?.trend.direction ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">
            AI Score
          </p>

          <p className={`mt-2 text-2xl font-bold ${signalColor}`}>
            {data ? formatScore(data.score) : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">
            Institutional Bias
          </p>

          <p className={`mt-2 text-2xl font-bold uppercase ${signalColor}`}>
            {data?.signal ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">
            Trend Score
          </p>

          <p className={`mt-2 text-2xl font-bold ${signalColor}`}>
            {data ? formatScore(data.trend.score) : "—"}
          </p>
        </div>
      </div>

      {/* Intelligence */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <Brain className="text-sky-400" />

            <div>
              <h2 className="text-lg font-semibold text-white">
                AI Market Intelligence
              </h2>

              <p className="text-xs text-zinc-500">
                Live XAUUSD · 1H · {data?.candleCount ?? 0} candles
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {/* Trend */}
            <div className="rounded-lg bg-zinc-900 p-4">
              <div className={`flex items-center gap-2 ${signalColor}`}>
                {isBearish ? (
                  <TrendingDown size={18} />
                ) : (
                  <TrendingUp size={18} />
                )}

                <span className="font-semibold">
                  Trend
                </span>
              </div>

              <p className="mt-2 text-zinc-300">
                {data
                  ? `${data.trend.direction.toUpperCase()} trend detected with score ${formatScore(data.trend.score)}.`
                  : "Loading market trend..."}
              </p>
            </div>

            {/* Institutional Bias */}
            <div className="rounded-lg bg-zinc-900 p-4">
              <div className="flex items-center gap-2 text-sky-400">
                <ShieldCheck size={18} />

                <span className="font-semibold">
                  Institutional Bias
                </span>
              </div>

              <p className="mt-2 text-zinc-300">
                {data
                  ? `Current market signal is ${data.signal.toUpperCase()}.`
                  : "Loading institutional bias..."}
              </p>
            </div>

            {/* Momentum */}
            <div className="rounded-lg bg-zinc-900 p-4">
              <div className="flex items-center gap-2 text-sky-400">
                <Activity size={18} />

                <span className="font-semibold">
                  Momentum
                </span>
              </div>

              <p className="mt-2 text-zinc-300">
                {data
                  ? `Momentum ${data.momentum.value >= 0 ? "positive" : "negative"} · score ${formatScore(data.momentum.score)}.`
                  : "Loading momentum..."}
              </p>
            </div>

            {/* Volatility */}
            <div className="rounded-lg bg-zinc-900 p-4">
              <div className="flex items-center gap-2 text-yellow-400">
                <Target size={18} />

                <span className="font-semibold">
                  Volatility
                </span>
              </div>

              <p className="mt-2 text-zinc-300">
                {data
                  ? `ATR ${data.volatility.atr.toFixed(2)} · ${formatPercent(data.volatility.atrPercent)}`
                  : "Loading volatility..."}
              </p>
            </div>
          </div>
        </div>

        {/* Signal */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-lg font-semibold text-white">
            Executive Signal
          </h2>

          <div
            className={`mt-6 rounded-xl ${signalBg} p-6 text-center`}
          >
            {isBearish ? (
              <TrendingDown
                className={`mx-auto ${signalColor}`}
                size={40}
              />
            ) : isBullish ? (
              <TrendingUp
                className={`mx-auto ${signalColor}`}
                size={40}
              />
            ) : (
              <Activity
                className={`mx-auto ${signalColor}`}
                size={40}
              />
            )}

            <p className={`mt-3 text-2xl font-bold ${signalColor}`}>
              {loading ? "LOADING" : signalLabel}
            </p>

            <p className="mt-1 text-zinc-400">
              Score {data ? formatScore(data.score) : "—"}
            </p>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">
                Symbol
              </span>

              <span className="text-white">
                {data?.symbol ?? "XAUUSD"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-500">
                Timeframe
              </span>

              <span className="text-white">
                {data?.interval ?? "1h"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-500">
                Candles
              </span>

              <span className="text-white">
                {data?.candleCount ?? "—"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-500">
                ATR
              </span>

              <span className="text-white">
                {data
                  ? data.volatility.atr.toFixed(2)
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Decision Layer */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-sky-400" />

          <div>
            <h2 className="text-lg font-semibold text-white">
              Executive Decision
            </h2>

            <p className="text-xs text-zinc-500">
              Decision layer derived from live intelligence
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Market Bias
            </p>

            <p className={`mt-2 text-xl font-bold ${decisionColor}`}>
              {decision.bias}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Confidence
            </p>

            <p className="mt-2 text-xl font-bold text-white">
              {data ? `${decision.confidence}%` : "—"}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Risk State
            </p>

            <p className={`mt-2 text-xl font-bold ${riskColor}`}>
              {decision.risk}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Executive Action
            </p>

            <p className={`mt-2 text-xl font-bold ${decisionColor}`}>
              {decision.action}
            </p>
          </div>
        </div>

        {data && (
          <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 text-sm text-zinc-400">
            <span className="font-semibold text-white">
              Decision rationale:
            </span>{" "}
            {decision.action === "WAIT"
              ? "Current trend and score do not provide sufficient confirmation for an aggressive directional decision."
              : `Current intelligence supports a ${decision.action.toLowerCase()} with ${decision.risk.toLowerCase()} risk conditions.`}
          </div>
        )}
      </div>

      {/* Executive Risk & Position Context */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-sky-400" />

          <div>
            <h2 className="text-lg font-semibold text-white">
              Executive Risk & Position
            </h2>

            <p className="text-xs text-zinc-500">
              Risk context derived from live intelligence and decision state
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Position Bias
            </p>

            <p className={`mt-2 text-xl font-bold ${decisionColor}`}>
              {riskPosition.positionBias}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Entry Readiness
            </p>

            <p className={`mt-2 text-xl font-bold ${readinessColor}`}>
              {riskPosition.readiness}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Risk Level
            </p>

            <p className={`mt-2 text-xl font-bold ${riskColor}`}>
              {riskPosition.riskLevel}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Volatility Context
            </p>

            <p className="mt-2 text-xl font-bold text-white">
              {riskPosition.atrContext}
            </p>
          </div>
        </div>

        {data && (
          <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500">
              Risk Protection
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-300">
              {riskPosition.protection}
            </p>
          </div>
        )}
      </div>

      {/* Executive Trade Plan Layer */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-sky-400" />

          <div>
            <h2 className="text-lg font-semibold text-white">
              Executive Trade Plan
            </h2>

            <p className="text-xs text-zinc-500">
              Scenario plan derived from current intelligence state
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Setup
            </p>

            <p className={`mt-2 text-xl font-bold ${tradePlanColor}`}>
              {tradePlan.setup}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Direction
            </p>

            <p className={`mt-2 text-xl font-bold ${tradePlanColor}`}>
              {tradePlan.direction}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Risk / Reward
            </p>

            <p className="mt-2 text-xl font-bold text-white">
              {tradePlan.riskReward}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Plan Status
            </p>

            <p className="mt-2 text-xl font-bold text-yellow-400">
              {tradePlan.planStatus}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500">
              Trigger
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-300">
              {tradePlan.trigger}
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500">
              Invalidation
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-300">
              {tradePlan.invalidation}
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500">
              Initial Objective
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-300">
              {tradePlan.target}
            </p>
          </div>
        </div>

        {data && (
          <div className="mt-4 rounded-lg border border-sky-500/10 bg-sky-500/[0.03] p-4 text-sm text-zinc-400">
            <span className="font-semibold text-white">
              Plan logic:
            </span>{" "}
            The plan remains conditional and follows the current
            intelligence, confirmation state, and volatility regime.
          </div>
        )}
      </div>

      {/* Signal Confidence & Decision Quality */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-violet-400" />

          <div>
            <h2 className="text-lg font-semibold text-white">
              Signal Confidence & Decision Quality
            </h2>

            <p className="text-xs text-zinc-500">
              Decision confidence is authoritative; factor scores are diagnostic
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Signal Confidence
            </p>

            <p className={`mt-2 text-2xl font-bold ${confidenceColor}`}>
              {signalConfidence.confidence}%
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Decision Quality
            </p>

            <p className={`mt-2 text-2xl font-bold ${confidenceColor}`}>
              {signalConfidence.quality}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Trend Strength
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {signalConfidence.trendStrength}%
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Momentum Strength
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {signalConfidence.momentumStrength}%
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500">
              Volatility Quality
            </p>

            <p className="mt-2 text-xl font-bold text-white">
              {signalConfidence.volatilityQuality}%
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500">
              Decision Alignment
            </p>

            <p className="mt-2 text-xl font-bold text-white">
              {signalConfidence.decisionAlignment}%
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500">
              Risk Alignment
            </p>

            <p className="mt-2 text-xl font-bold text-white">
              {signalConfidence.riskAlignment}%
            </p>
          </div>
        </div>

        {data && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-zinc-500">
                Confidence Reason
              </p>

              <p className="mt-2 text-sm font-medium text-zinc-300">
                {signalConfidence.reason}
              </p>
            </div>

            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-zinc-500">
                Primary Weakness
              </p>

              <p className="mt-2 text-sm font-medium text-zinc-300">
                {signalConfidence.weakness}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Executive Command Center */}
      <div className="rounded-xl border border-sky-500/20 bg-zinc-950 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-sky-400" />

          <div>
            <h2 className="text-lg font-semibold text-white">
              Executive Command Center
            </h2>

            <p className="text-xs text-zinc-500">
              Consolidated decision state from live market intelligence
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-white/5 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Executive Verdict
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {executiveSummary.verdict}
          </p>

          <p className="mt-2 text-sm text-zinc-400">
            {executiveSummary.current}
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Market Regime
            </p>

            <p className="mt-2 text-xl font-bold text-white">
              {executiveSummary.regime}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Current Bias
            </p>

            <p className={`mt-2 text-xl font-bold ${executiveBiasColor}`}>
              {executiveSummary.bias}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Risk State
            </p>

            <p className={`mt-2 text-xl font-bold ${executiveRiskColor}`}>
              {executiveSummary.risk}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Recommended Action
            </p>

            <p className={`mt-2 text-xl font-bold ${actionColor}`}>
              {executiveSummary.action}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500">
              What Matters Now
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-300">
              {executiveSummary.current}
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500">
              What Must Happen Next
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-300">
              {executiveSummary.next}
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500">
              View Invalidation
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-300">
              {executiveSummary.invalidation}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-sky-500/10 bg-sky-500/[0.03] p-4 text-sm text-zinc-400">
          <span className="font-semibold text-white">
            Executive policy:
          </span>{" "}
          The command center summarizes live conditions only. It does not
          authorize automatic order execution.
        </div>
      </div>

      {/* Executive Monitoring & Scenario Layer */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-sky-400" />

          <div>
            <h2 className="text-lg font-semibold text-white">
              Executive Monitoring & Scenario
            </h2>

            <p className="text-xs text-zinc-500">
              Live monitoring state derived from trend, momentum and volatility
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Market Regime
            </p>

            <p className="mt-2 text-xl font-bold text-white">
              {monitoring.regime}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Active Scenario
            </p>

            <p className={`mt-2 text-xl font-bold ${monitoringColor}`}>
              {monitoring.scenario}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Confirmation
            </p>

            <p className="mt-2 text-xl font-bold text-white">
              {monitoring.confirmation}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Monitoring Priority
            </p>

            <p className={`mt-2 text-xl font-bold ${priorityColor}`}>
              {monitoring.priority}
            </p>
          </div>
        </div>

        {data && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-zinc-500">
                What to Monitor
              </p>

              <p className="mt-2 text-sm font-medium text-zinc-300">
                {monitoring.watch}
              </p>
            </div>

            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-zinc-500">
                Scenario Invalidation
              </p>

              <p className="mt-2 text-sm font-medium text-zinc-300">
                {monitoring.invalidation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Executive Alert & Escalation Layer */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-sky-400" />

          <div>
            <h2 className="text-lg font-semibold text-white">
              Executive Alert & Escalation
            </h2>

            <p className="text-xs text-zinc-500">
              Alert state derived from live risk, confirmation and scenario conditions
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Alert Level
            </p>

            <p className={`mt-2 text-xl font-bold ${alertColor}`}>
              {alert.level}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Primary Alert
            </p>

            <p className={`mt-2 text-xl font-bold ${alertColor}`}>
              {alert.primary}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Escalation
            </p>

            <p className="mt-2 text-xl font-bold text-white">
              {alert.escalation}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Required Action
            </p>

            <p className="mt-2 text-sm font-bold text-zinc-300">
              {alert.action}
            </p>
          </div>
        </div>

        {data && (
          <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500">
              Alert Reason
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-300">
              {alert.reason}
            </p>
          </div>
        )}
      </div>

      {/* Executive Action & Execution Layer */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-sky-400" />

          <div>
            <h2 className="text-lg font-semibold text-white">
              Executive Action & Execution
            </h2>

            <p className="text-xs text-zinc-500">
              Action state derived from decision, risk, plan, monitoring and alerts
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Recommended Action
            </p>

            <p className={`mt-2 text-xl font-bold ${actionColor}`}>
              {actionContext.action}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Execution State
            </p>

            <p className="mt-2 text-xl font-bold text-white">
              {actionContext.state}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Action Priority
            </p>

            <p className={`mt-2 text-xl font-bold ${actionColor}`}>
              {actionContext.priority}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">
              Execution Gate
            </p>

            <p className="mt-2 text-sm font-bold text-zinc-300">
              Conditional
            </p>
          </div>
        </div>

        {data && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-zinc-500">
                Next Step
              </p>

              <p className="mt-2 text-sm font-medium text-zinc-300">
                {actionContext.nextStep}
              </p>
            </div>

            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-zinc-500">
                Execution Constraint
              </p>

              <p className="mt-2 text-sm font-medium text-zinc-300">
                {actionContext.constraint}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-sky-500/10 bg-sky-500/[0.03] p-4 text-sm text-zinc-400">
          <span className="font-semibold text-white">
            Execution policy:
          </span>{" "}
          Actions remain conditional on live market confirmation and risk
          controls. No automatic order execution is implied by this layer.
        </div>
      </div>

      {/* Executive Interpretation */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center gap-3">
          <Brain className="text-sky-400" />

          <div>
            <h2 className="text-lg font-semibold text-white">
              Executive Interpretation
            </h2>

            <p className="text-xs text-zinc-500">
              Generated from live market intelligence
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-zinc-900 p-5">
          {!data ? (
            <p className="text-zinc-400">
              Loading executive interpretation...
            </p>
          ) : (
            <div className="space-y-3 text-sm leading-6 text-zinc-300">
              <p>
                <span className="font-semibold text-white">
                  Regime:
                </span>{" "}
                {data.trend.direction.toUpperCase()} with trend
                score {formatScore(data.trend.score)}.
              </p>

              <p>
                <span className="font-semibold text-white">
                  Momentum:
                </span>{" "}
                {data.momentum.value >= 0
                  ? "Positive"
                  : "Negative"}{" "}
                momentum with score{" "}
                {formatScore(data.momentum.score)}.
              </p>

              <p>
                <span className="font-semibold text-white">
                  Volatility:
                </span>{" "}
                ATR {data.volatility.atr.toFixed(2)}{" "}
                ({formatPercent(data.volatility.atrPercent)}).
              </p>

              <p>
                <span className="font-semibold text-white">
                  Executive view:
                </span>{" "}
                Current institutional bias is{" "}
                <span className={`font-semibold ${signalColor}`}>
                  {data.signal.toUpperCase()}
                </span>
                .
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {data && (
        <div className="text-xs text-zinc-600">
          Last update:{" "}
          {new Date(data.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  )
}
