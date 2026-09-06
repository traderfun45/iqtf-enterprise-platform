"use client"

import { useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AppShell } from "@/components/layout/app-shell"
import {
  getInstitutionalAnalysis,
  getMarketIntelligence,
  getMarketSnapshot,
  type Intelligence,
  type InstitutionalAnalysis,
  type Quote,
} from "@/lib/market"
import {
  getSystemStatus,
  type SystemStatus,
} from "@/lib/system"
import { buildIntelligenceExplanation } from "@/lib/intelligence/explanation"

function formatPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—"
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function directionClass(
  direction?:
    | "bullish"
    | "bearish"
    | "neutral"
    | "mixed"
    | "LONG"
    | "LONG_WATCH"
    | "NO_TRADE"
    | "SHORT_WATCH"
    | "SHORT",
) {
  if (
    direction === "bullish" ||
    direction === "LONG" ||
    direction === "LONG_WATCH"
  ) {
    return "text-emerald-400"
  }

  if (
    direction === "bearish" ||
    direction === "SHORT" ||
    direction === "SHORT_WATCH"
  ) {
    return "text-red-400"
  }

  if (direction === "mixed" || direction === "NO_TRADE") {
    return "text-amber-400"
  }

  return "text-zinc-400"
}

function signalBadgeClass(
  signal?: "bullish" | "bearish" | "neutral",
) {
  if (signal === "bullish") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
  }

  if (signal === "bearish") {
    return "border-red-500/30 bg-red-500/10 text-red-400"
  }

  return "border-white/10 bg-white/[0.03] text-zinc-400"
}

function serviceLabel(value?: string) {
  if (!value) return "—"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function factorValue(value: number) {
  return value.toFixed(2)
}

export default function Home() {
  const [system, setSystem] = useState<SystemStatus | null>(null)
  const [xau, setXau] = useState<Quote | null>(null)
  const [gc, setGc] = useState<Quote | null>(null)
  const [intelligence, setIntelligence] =
    useState<Intelligence | null>(null)
  const [institutional, setInstitutional] =
    useState<InstitutionalAnalysis | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadDashboard(initial = false) {
    try {
      if (initial) setLoading(true)
      setError(null)

      const [systemData, snapshotData] =
        await Promise.all([
          getSystemStatus(),
          getMarketSnapshot(),
        ])

      setSystem(systemData)

      const nextXau =
        snapshotData.data.find(
          (item) => item.symbol === "XAUUSD",
        ) ?? null

      const nextGc =
        snapshotData.data.find(
          (item) => item.symbol === "GC",
        ) ?? null

      if (nextXau) setXau(nextXau)
      if (nextGc) setGc(nextGc)

      try {
        const intelligenceData =
          await getMarketIntelligence(
            "XAUUSD",
            "1h",
            50,
          )

        setIntelligence(intelligenceData)
      } catch (intelligenceError) {
        console.error(
          "Intelligence refresh failed:",
          intelligenceError,
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load executive dashboard",
      )
    } finally {
      if (initial) setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard(true)

    const timer = setInterval(() => {
      loadDashboard(false)
    }, 30000)

    return () => clearInterval(timer)
  }, [])

  const healthy = system?.status === "healthy"
  const bullish = intelligence?.signal === "bullish"
  const bearish = intelligence?.signal === "bearish"

  const explanation = intelligence
    ? buildIntelligenceExplanation(intelligence)
    : null

  return (
    <AppShell>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  healthy
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                }
              >
                {healthy ? "LIVE" : "OFFLINE"}
              </Badge>

              <span className="text-xs text-zinc-500">
                Institutional Trading System
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Executive Command Center
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Institutional market intelligence and decision support
            </p>
          </div>

          <button
            onClick={() => loadDashboard(false)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-red-400">
                <Activity className="h-4 w-4" />
                {error}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Executive KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-zinc-500">
                System
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </CardHeader>

            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  healthy
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {system
                  ? healthy
                    ? "HEALTHY"
                    : "UNHEALTHY"
                  : "—"}
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                API uptime{" "}
                {system
                  ? formatUptime(
                      system.process.uptimeSeconds,
                    )
                  : "—"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-zinc-500">
                XAUUSD
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-400" />
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold text-white">
                {xau ? formatPrice(xau.price) : "—"}
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                {xau?.source ?? "Market feed unavailable"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-zinc-500">
                GC
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-sky-400" />
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold text-white">
                {gc ? formatPrice(gc.price) : "—"}
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                {gc?.source ?? "Futures feed unavailable"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-zinc-500">
                Signal
              </CardTitle>
              <Target className="h-4 w-4 text-sky-400" />
            </CardHeader>

            <CardContent>
              <div
                className={`text-2xl font-bold ${directionClass(
                  intelligence?.signal,
                )}`}
              >
                {intelligence?.signal?.toUpperCase() ?? "—"}
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                Score{" "}
                {intelligence
                  ? intelligence.score.toFixed(2)
                  : "—"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-zinc-500">
                Confidence
              </CardTitle>
              <BrainCircuit className="h-4 w-4 text-violet-400" />
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold text-white">
                {explanation
                  ? `${explanation.confidence}%`
                  : "—"}
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                Decision quality
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Market + Intelligence */}
        <div className="grid gap-4 xl:grid-cols-12">

          {/* Market */}
          <Card className="border-white/10 bg-white/[0.03] xl:col-span-5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-white">
                  Market Overview
                </CardTitle>

                <p className="mt-1 text-xs text-zinc-500">
                  Live institutional market feed
                </p>
              </div>

              <Badge
                variant="outline"
                className="border-emerald-500/20 text-emerald-400"
              >
                LIVE DATA
              </Badge>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {[xau, gc].map((quote, index) => (
                  <div
                    key={quote?.symbol ?? `quote-${index}`}
                    className="rounded-xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-500">
                        {quote?.symbol ?? "—"}
                      </span>

                      <BarChart3 className="h-4 w-4 text-zinc-600" />
                    </div>

                    <div className="mt-3 text-2xl font-semibold text-white">
                      {quote
                        ? formatPrice(quote.price)
                        : "—"}
                    </div>

                    <div className="mt-2 text-xs text-zinc-500">
                      {quote?.source ?? "No market data"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Signal */}
          <Card className="border-white/10 bg-white/[0.03] xl:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-white">
                  XAUUSD Intelligence
                </CardTitle>

                <p className="mt-1 text-xs text-zinc-500">
                  {intelligence?.interval?.toUpperCase() ?? "1H"} analysis ·{" "}
                  {intelligence?.candleCount ?? 0} candles
                </p>
              </div>

              <Badge
                variant="outline"
                className={signalBadgeClass(
                  intelligence?.signal,
                )}
              >
                {intelligence?.signal?.toUpperCase() ?? "—"}
              </Badge>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-zinc-500">
                    Trend
                  </div>

                  <div
                    className={`mt-2 text-lg font-semibold ${directionClass(
                      intelligence?.trend.direction,
                    )}`}
                  >
                    {intelligence?.trend.direction?.toUpperCase() ?? "—"}
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    Score{" "}
                    {intelligence
                      ? factorValue(intelligence.trend.score)
                      : "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-zinc-500">
                    Momentum
                  </div>

                  <div
                    className={`mt-2 text-lg font-semibold ${
                      intelligence &&
                      intelligence.momentum.score > 0
                        ? "text-emerald-400"
                        : intelligence &&
                            intelligence.momentum.score < 0
                          ? "text-red-400"
                          : "text-zinc-400"
                    }`}
                  >
                    {intelligence
                      ? factorValue(
                          intelligence.momentum.score,
                        )
                      : "—"}
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    Momentum factor
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-zinc-500">
                    Structure
                  </div>

                  <div
                    className={`mt-2 text-lg font-semibold ${directionClass(
                      intelligence?.structure.direction,
                    )}`}
                  >
                    {intelligence?.structure.bias?.toUpperCase() ?? "—"}
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    Score{" "}
                    {intelligence
                      ? factorValue(
                          intelligence.structure.score,
                        )
                      : "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-zinc-500">
                    Volatility
                  </div>

                  <div className="mt-2 text-lg font-semibold text-white">
                    {intelligence?.volatilityRegime.regime ?? "—"}
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    ATR{" "}
                    {intelligence
                      ? intelligence.volatility.atr.toFixed(2)
                      : "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-zinc-500">
                    MTF
                  </div>

                  <div
                    className={`mt-2 text-lg font-semibold ${directionClass(
                      intelligence?.mtf.alignment,
                    )}`}
                  >
                    {intelligence?.mtf.alignment?.toUpperCase() ?? "—"}
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    Score{" "}
                    {intelligence
                      ? factorValue(
                          intelligence.mtf.score,
                        )
                      : "—"}
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

        {/* IQTF Executive Decision */}
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base text-white">
                  IQTF Executive Decision
                </CardTitle>
                <p className="mt-1 text-xs text-zinc-500">
                  Institutional decision engine · CME + Vol2Vol + COT + Market
                </p>
              </div>

              <Badge
                variant="outline"
                className={
                  institutional?.iqtfDecision?.decision === "LONG" ||
                  institutional?.iqtfDecision?.decision === "SHORT"
                    ? "border-emerald-500/30 text-emerald-400"
                    : "border-amber-500/30 text-amber-400"
                }
              >
                {institutional?.iqtfDecision?.decision ?? "—"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 xl:grid-cols-12">

              {/* Decision */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-5 xl:col-span-4">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  IQTF Decision
                </div>

                <div
                  className={`mt-3 text-3xl font-bold ${directionClass(
                    institutional?.iqtfDecision?.decision,
                  )}`}
                >
                  {institutional?.iqtfDecision?.decision ?? "—"}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-zinc-500">Confidence</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {institutional?.iqtfDecision?.confidence != null
                        ? `${institutional.iqtfDecision.confidence}%`
                        : "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-zinc-500">Risk State</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {institutional?.iqtfDecision?.riskState ?? "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-xs text-zinc-500">Trade Permission</div>
                  <div
                    className={`mt-1 text-sm font-semibold ${
                      institutional?.iqtfDecision?.tradePermission === "ALLOWED"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {institutional?.iqtfDecision?.tradePermission ?? "—"}
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    {institutional?.iqtfDecision?.tradePermissionReason ??
                      institutional?.iqtfDecision?.reasons?.[0] ??
                      "No decision reason available"}
                  </div>
                </div>
              </div>

              {/* Signal Matrix */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-5 xl:col-span-4">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Signal Matrix
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    ["Market", institutional?.iqtfDecision?.components?.market],
                    ["CME", institutional?.iqtfDecision?.components?.cme],
                    ["Vol2Vol", institutional?.iqtfDecision?.components?.vol2vol],
                    ["COT", institutional?.iqtfDecision?.components?.cot],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
                    >
                      <span className="text-sm text-zinc-400">{label}</span>
                      <span
                        className={`font-mono text-sm font-semibold ${
                          typeof value === "number" && value > 0
                            ? "text-emerald-400"
                            : typeof value === "number" && value < 0
                              ? "text-red-400"
                              : "text-zinc-400"
                        }`}
                      >
                        {typeof value === "number"
                          ? value.toFixed(3)
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-xs text-zinc-500">
                    Composite Score
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">
                    {typeof institutional?.iqtfDecision?.compositeScore ===
                    "number"
                      ? institutional.iqtfDecision.compositeScore.toFixed(3)
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Trade Setup */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-5 xl:col-span-4">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Trade Setup
                </div>

                {institutional?.tradeSetup?.available ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      ["Entry", institutional.tradeSetup.entry],
                      ["Stop Loss", institutional.tradeSetup.stopLoss],
                      ["TP1", institutional.tradeSetup.takeProfit1],
                      ["TP2", institutional.tradeSetup.takeProfit2],
                      ["TP3", institutional.tradeSetup.takeProfit3],
                      ["R:R TP1", institutional.tradeSetup.riskRewardTp1],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                      >
                        <div className="text-xs text-zinc-500">{label}</div>
                        <div className="mt-1 font-mono text-sm font-semibold text-white">
                          {typeof value === "number"
                            ? label === "R:R TP1"
                              ? `${value.toFixed(2)}R`
                              : formatPrice(value)
                            : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
                    <div className="text-sm font-semibold text-red-400">
                      Trade Setup Unavailable
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {institutional?.tradeSetup?.reason ??
                        institutional?.iqtfDecision?.tradePermissionReason ??
                        institutional?.iqtfDecision?.reasons?.[0] ??
                        "No valid trade setup"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Executive Explanation */}
            {(institutional?.iqtfDecision?.reasons?.length ||
              institutional?.iqtfDecision?.warnings?.length) ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Executive Explanation
                </div>

                <div className="mt-3 space-y-2">
                  {institutional.iqtfDecision.reasons?.slice(0, 3).map(
                    (reason, index) => (
                      <div
                        key={`reason-${index}`}
                        className="text-sm text-zinc-300"
                      >
                        • {reason}
                      </div>
                    ),
                  )}

                  {institutional.iqtfDecision.warnings?.slice(0, 2).map(
                    (warning, index) => (
                      <div
                        key={`warning-${index}`}
                        className="text-sm text-amber-400"
                      >
                        ⚠ {warning}
                      </div>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Decision Quality */}
        <div className="grid gap-4 lg:grid-cols-3">

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Target className="h-4 w-4 text-emerald-400" />
                Primary Driver
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="text-xl font-semibold text-white">
                {explanation?.primaryDriver ?? "—"}
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Strongest factor currently driving the intelligence signal.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Supporting Factors
              </CardTitle>
            </CardHeader>

            <CardContent>
              {explanation?.supporting.length ? (
                <div className="flex flex-wrap gap-2">
                  {explanation.supporting.map((factor) => (
                    <Badge
                      key={factor}
                      variant="outline"
                      className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                    >
                      {factor}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-zinc-500">
                  No strong supporting factors
                </span>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <AlertTriangle
                  className={`h-4 w-4 ${
                    explanation?.conflictSeverity === "high"
                      ? "text-red-400"
                      : explanation?.conflictSeverity === "medium"
                        ? "text-amber-400"
                        : "text-zinc-500"
                  }`}
                />
                Conflicts
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    explanation?.conflictSeverity === "high"
                      ? "border-red-500/30 bg-red-500/10 text-red-400"
                      : explanation?.conflictSeverity === "medium"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        : "border-white/10 text-zinc-400"
                  }
                >
                  {explanation?.conflictSeverity?.toUpperCase() ?? "—"}
                </Badge>

                <span className="text-xs text-zinc-500">
                  {explanation?.conflicting.length ?? 0} conflicting factors
                </span>
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-500">
                {explanation?.conflicting.length
                  ? explanation.conflicting.join(", ")
                  : "No material factor conflict detected"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Executive Assessment */}
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <BrainCircuit className="h-4 w-4 text-violet-400" />
              Executive Assessment
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div
              className={`rounded-xl border p-5 ${
                bullish
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : bearish
                    ? "border-red-500/20 bg-red-500/5"
                    : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div
                    className={`text-lg font-semibold ${
                      bullish
                        ? "text-emerald-400"
                        : bearish
                          ? "text-red-400"
                          : "text-zinc-300"
                    }`}
                  >
                    {explanation?.headline ?? "Awaiting intelligence"}
                  </div>

                  <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">
                    {explanation?.explanation ??
                      "Market intelligence is being calculated."}
                  </p>
                </div>

                <div className="shrink-0 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Confidence
                  </div>

                  <div className="mt-1 text-2xl font-bold text-white">
                    {explanation
                      ? `${explanation.confidence}%`
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Production System Monitor */}
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Production System Monitor
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["API", system?.services.api],
                ["Market", system?.services.market],
                ["Cache", system?.services.cache],
                ["Watchdog", system?.services.watchdog],
              ].map(([name, value]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-4"
                >
                  <div>
                    <div className="text-xs text-zinc-500">
                      {name}
                    </div>

                    <div className="mt-1 text-sm font-medium text-white">
                      {serviceLabel(value)}
                    </div>
                  </div>

                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      value === "online" || value === "healthy" ||
                      value === "enabled"
                        ? "bg-emerald-400"
                        : "bg-red-400"
                    }`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk */}
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <BarChart3 className="h-4 w-4 text-sky-400" />
              Risk Monitor
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-sky-400">
                <BarChart3 className="h-4 w-4" />
                Risk Engine Integration
              </div>

              <p className="mt-1 text-xs text-zinc-500">
                Risk metrics will be connected to the Risk Manager
                module in the next Phase.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppShell>
  )
}
