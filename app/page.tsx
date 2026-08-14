"use client"

import { useEffect, useState } from "react"
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
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
  getMarketIntelligence,
  getMarketSnapshot,
  type Intelligence,
  type Quote,
} from "@/lib/market"
import {
  getSystemStatus,
  type SystemStatus,
} from "@/lib/system"

function formatPrice(value: number) {
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

function serviceLabel(value?: string) {
  if (!value) return "—"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function Home() {
  const [system, setSystem] = useState<SystemStatus | null>(null)
  const [xau, setXau] = useState<Quote | null>(null)
  const [gc, setGc] = useState<Quote | null>(null)
  const [intelligence, setIntelligence] =
    useState<Intelligence | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadDashboard(initial = false) {
    try {
      if (initial) setLoading(true)
      setError(null)

      const [systemData, snapshotData, intelligenceData] =
        await Promise.all([
          getSystemStatus(),
          getMarketSnapshot(),
          getMarketIntelligence("XAUUSD", "1h", 50),
        ])

      setSystem(systemData)
      setIntelligence(intelligenceData)

      setXau(
        snapshotData.data.find(
          (item) => item.symbol === "XAUUSD"
        ) ?? null
      )

      setGc(
        snapshotData.data.find(
          (item) => item.symbol === "GC"
        ) ?? null
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load executive dashboard"
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
              Executive Dashboard
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Institutional Quantitative Trading Framework
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

        {/* Executive KPI */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-zinc-500">
                System Status
              </CardTitle>

              <Activity className="h-4 w-4 text-emerald-400" />
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
                IQTF Enterprise API
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
                XAUUSD Signal
              </CardTitle>

              <Target className="h-4 w-4 text-sky-400" />
            </CardHeader>

            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  bullish
                    ? "text-emerald-400"
                    : bearish
                      ? "text-red-400"
                      : "text-zinc-300"
                }`}
              >
                {intelligence?.signal?.toUpperCase() ?? "—"}
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                Score:{" "}
                {intelligence
                  ? intelligence.score.toFixed(2)
                  : "—"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-zinc-500">
                API Uptime
              </CardTitle>

              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold text-white">
                {system
                  ? formatUptime(system.process.uptimeSeconds)
                  : "—"}
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                Production process
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Market Overview + Intelligence */}
        <div className="grid gap-4 xl:grid-cols-12">

          <Card className="border-white/10 bg-white/[0.03] xl:col-span-8">
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

                {[xau, gc].map((quote) => (
                  <div
                    key={quote?.symbol ?? "unknown"}
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

          {/* Intelligence */}
          <Card className="border-white/10 bg-white/[0.03] xl:col-span-4">
            <CardHeader>
              <CardTitle className="text-base text-white">
                XAUUSD Intelligence
              </CardTitle>

              <p className="mt-1 text-xs text-zinc-500">
                {intelligence?.interval?.toUpperCase() ?? "1H"} analysis
              </p>
            </CardHeader>

            <CardContent className="space-y-4">

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Trend
                </span>

                <span
                  className={
                    bullish
                      ? "text-xs font-medium text-emerald-400"
                      : bearish
                        ? "text-xs font-medium text-red-400"
                        : "text-xs font-medium text-zinc-400"
                  }
                >
                  {intelligence?.trend.direction?.toUpperCase() ?? "—"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Trend Score
                </span>

                <span className="text-sm font-medium text-white">
                  {intelligence
                    ? intelligence.trend.score.toFixed(2)
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Momentum
                </span>

                <span className="text-sm font-medium text-white">
                  {intelligence
                    ? intelligence.momentum.value.toFixed(2)
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  ATR
                </span>

                <span className="text-sm font-medium text-white">
                  {intelligence
                    ? intelligence.volatility.atr.toFixed(2)
                    : "—"}
                </span>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">
                    Candles analyzed
                  </span>

                  <span className="text-white">
                    {intelligence?.candleCount ?? "—"}
                  </span>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* System Monitor */}
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
                      value === "online" ||
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

        {/* Risk Placeholder */}
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
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
