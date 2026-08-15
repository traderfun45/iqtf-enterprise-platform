"use client"

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

function formatScore(value: number) {
  return value.toFixed(3)
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

function getDecision(data: Intelligence | null) {
  if (!data) {
    return {
      bias: "NEUTRAL",
      confidence: 0,
      risk: "UNKNOWN",
      action: "WAIT",
    }
  }

  const absScore = Math.abs(data.score)
  const confidence = Math.min(100, Math.round(absScore * 1000))

  let bias = "NEUTRAL"

  if (data.signal === "bullish") {
    bias = "BULLISH"
  } else if (data.signal === "bearish") {
    bias = "BEARISH"
  } else if (data.trend.direction === "bullish" && data.score > 0) {
    bias = "BULLISH"
  } else if (data.trend.direction === "bearish" && data.score < 0) {
    bias = "BEARISH"
  }

  let risk = "NORMAL"

  if (data.volatility.atrPercent >= 0.5) {
    risk = "HIGH"
  } else if (data.volatility.atrPercent >= 0.3) {
    risk = "ELEVATED"
  } else if (data.volatility.atrPercent < 0.15) {
    risk = "LOW"
  }

  let action = "WAIT"

  if (data.signal === "bullish" && data.score >= 0.1) {
    action = "LONG BIAS"
  } else if (data.signal === "bearish" && data.score <= -0.1) {
    action = "SHORT BIAS"
  }

  return {
    bias,
    confidence,
    risk,
    action,
  }
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
    decision.action === "LONG BIAS" &&
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
    decision.action === "SHORT BIAS" &&
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
