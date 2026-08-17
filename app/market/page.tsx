"use client"

import { useEffect, useState } from "react"
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { getMarketSnapshot, getMarketIntelligence, type Quote, type Intelligence } from "@/lib/market"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppShell } from "@/components/layout/app-shell"

function formatPrice(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatScore(value: number) {
  return value.toFixed(2)
}

export default function MarketPage() {
  const [xau, setXau] = useState<Quote | null>(null)
  const [gc, setGc] = useState<Quote | null>(null)
  const [intelligence, setIntelligence] =
    useState<Intelligence | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

    async function loadMarket(isInitialLoad = false) {
      try {
        if (isInitialLoad) {
          setLoading(true)
        }

        setError(null)

        // Fetch market snapshot first so prices update immediately.
        const snapshotData = await getMarketSnapshot()

        const xauData = snapshotData.data.find(
          (item) => item.symbol === "XAUUSD"
        )

        const gcData = snapshotData.data.find(
          (item) => item.symbol === "GC"
        )

        if (!xauData || !gcData) {
          throw new Error("Market snapshot data unavailable")
        }

        // Keep last known good prices visible during refresh.
        setXau(xauData)
        setGc(gcData)

        // Load intelligence separately after prices are updated.
        const intelligenceData = await getMarketIntelligence(
          "XAUUSD",
          "1h",
          50
        )

        setIntelligence(intelligenceData)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load market data"
        )
      } finally {
        if (isInitialLoad) {
          setLoading(false)
        }
      }
    }

  useEffect(() => {
    loadMarket(true)

    const timer = setInterval(loadMarket, 30000)

    return () => clearInterval(timer)
  }, [])

  const bullish =
    intelligence?.signal === "bullish"

  const bearish =
    intelligence?.signal === "bearish"

  return (
    <AppShell>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              >
                LIVE
              </Badge>

              <span className="text-xs text-zinc-500">
                Market Intelligence Engine
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Market Intelligence
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Institutional multi-asset market monitoring
            </p>
          </div>

          <button
            onClick={() => loadMarket(false)}
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

              <p className="mt-1 text-xs text-zinc-500">
                Make sure iqtf-enterprise API is running on port 4000.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quotes */}
        <div className="grid gap-4 md:grid-cols-2">

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm text-zinc-400">
                  XAUUSD
                </CardTitle>

                <p className="mt-1 text-xs text-zinc-600">
                  Gold Spot
                </p>
              </div>

              <Badge
                variant="outline"
                className="border-emerald-500/20 text-emerald-400"
              >
                {xau?.source ?? "—"}
              </Badge>
            </CardHeader>

            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-white">
                {xau ? formatPrice(xau.price) : "—"}
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                Live market feed
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm text-zinc-400">
                  GC
                </CardTitle>

                <p className="mt-1 text-xs text-zinc-600">
                  Gold Futures
                </p>
              </div>

              <Badge
                variant="outline"
                className="border-sky-500/20 text-sky-400"
              >
                {gc?.source ?? "—"}
              </Badge>
            </CardHeader>

            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-white">
                {gc ? formatPrice(gc.price) : "—"}
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                <BarChart3 className="h-3.5 w-3.5 text-sky-400" />
                Futures market feed
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Intelligence */}
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-white">
                XAUUSD Intelligence
              </CardTitle>

              <p className="mt-1 text-xs text-zinc-500">
                1H analysis · {intelligence?.candleCount ?? 0} candles
              </p>
            </div>

            <Badge
              variant="outline"
              className={
                bullish
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : bearish
                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                    : "border-white/10 text-zinc-400"
              }
            >
              {intelligence?.signal?.toUpperCase() ?? "—"}
            </Badge>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {/* Trend */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-zinc-500">
                  Trend
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {intelligence?.trend.direction === "bullish" ? (
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-400" />
                  )}

                  <span className="text-lg font-semibold text-white">
                    {intelligence?.trend.direction ?? "—"}
                  </span>
                </div>

                <div className="mt-2 text-xs text-zinc-500">
                  Score:{" "}
                  {intelligence
                    ? formatScore(intelligence.trend.score)
                    : "—"}
                </div>
              </div>

              {/* Momentum */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-zinc-500">
                  Momentum
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {intelligence &&
                  intelligence.momentum.value >= 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-400" />
                  )}

                  <span className="text-lg font-semibold text-white">
                    {intelligence
                      ? `${intelligence.momentum.value.toFixed(3)}%`
                      : "—"}
                  </span>
                </div>

                <div className="mt-2 text-xs text-zinc-500">
                  Score:{" "}
                  {intelligence
                    ? formatScore(intelligence.momentum.score)
                    : "—"}
                </div>
              </div>

              {/* ATR */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-zinc-500">
                  Volatility / ATR
                </div>

                <div className="mt-3 text-lg font-semibold text-white">
                  {intelligence
                    ? formatPrice(intelligence.volatility.atr)
                    : "—"}
                </div>

                <div className="mt-2 text-xs text-zinc-500">
                  ATR{" "}
                  {intelligence
                    ? `${intelligence.volatility.atrPercent.toFixed(3)}%`
                    : "—"}
                </div>
              </div>

              {/* Score */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-zinc-500">
                  Intelligence Score
                </div>

                <div
                  className={`mt-3 text-2xl font-bold ${
                    bullish
                      ? "text-emerald-400"
                      : bearish
                        ? "text-red-400"
                        : "text-zinc-300"
                  }`}
                >
                  {intelligence
                    ? formatScore(intelligence.score)
                    : "—"}
                </div>

                <div className="mt-2 text-xs text-zinc-500">
                  Range −1.00 → +1.00
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* System */}
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Market Data System
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">

              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-zinc-500">
                  XAUUSD Provider
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />

                  <span className="text-sm font-medium text-white">
                    {xau?.source ?? "Offline"}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-zinc-500">
                  GC Provider
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />

                  <span className="text-sm font-medium text-white">
                    {gc?.source ?? "Offline"}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-zinc-500">
                  Intelligence Engine
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />

                  <span className="text-sm font-medium text-white">
                    Operational
                  </span>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

      </div>
    </AppShell>
  )
}
