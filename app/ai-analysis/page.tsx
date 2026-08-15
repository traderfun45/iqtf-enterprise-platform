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
