"use client"

import { useEffect, useRef, useState } from "react"
import {
  CandlestickSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts"

import type { ExpectedMoveXauUsd } from "@/lib/market"
import type { ChartPoint } from "@/lib/intelligence/chart"

type Props = {
  data: ChartPoint[]
  expectedMoveData: ExpectedMoveXauUsd | null
}

type Timeframe = "1H" | "4H" | "D"

function toTime(timestamp: string): Time {
  return Math.floor(new Date(timestamp).getTime() / 1000) as Time
}

export default function IqtfIntelligenceChart({
  data,
  expectedMoveData,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)

  const candleSeriesRef =
    useRef<ISeriesApi<"Candlestick"> | null>(null)

  const ema50SeriesRef =
    useRef<ISeriesApi<"Line"> | null>(null)

  const ema200SeriesRef =
    useRef<ISeriesApi<"Line"> | null>(null)

  const priceLinesRef = useRef<
    ReturnType<
      ISeriesApi<"Candlestick">["createPriceLine"]
    >[]
  >([])

  const [timeframe, setTimeframe] = useState<Timeframe>("1H")

  const item = expectedMoveData?.data[timeframe] ?? null

  useEffect(() => {
    if (!containerRef.current || data.length === 0) {
      return
    }

    const container = containerRef.current

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 430,

      layout: {
        background: {
          color: "transparent",
        },
        textColor: "#71717a",
      },

      grid: {
        vertLines: {
          color: "rgba(63, 63, 70, 0.25)",
        },
        horzLines: {
          color: "rgba(63, 63, 70, 0.25)",
        },
      },

      rightPriceScale: {
        borderColor: "rgba(63, 63, 70, 0.5)",
      },

      timeScale: {
        borderColor: "rgba(63, 63, 70, 0.5)",
        timeVisible: true,
        secondsVisible: false,
      },

      crosshair: {
        vertLine: {
          color: "rgba(161, 161, 170, 0.45)",
          width: 1,
          style: 2,
        },
        horzLine: {
          color: "rgba(161, 161, 170, 0.45)",
          width: 1,
          style: 2,
        },
      },
    })

    chartRef.current = chart

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    })

    const ema50Series = chart.addSeries(LineSeries, {
      color: "#d4d4d8",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    const ema200Series = chart.addSeries(LineSeries, {
      color: "#71717a",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    candleSeriesRef.current = candleSeries
    ema50SeriesRef.current = ema50Series
    ema200SeriesRef.current = ema200Series

    candleSeries.setData(
      data.map((point) => ({
        time: toTime(point.timestamp),
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
      }))
    )

    ema50Series.setData(
      data
        .filter(
          (point) =>
            point.ema50 != null &&
            Number.isFinite(point.ema50)
        )
        .map((point) => ({
          time: toTime(point.timestamp),
          value: point.ema50 as number,
        }))
    )

    ema200Series.setData(
      data
        .filter(
          (point) =>
            point.ema200 != null &&
            Number.isFinite(point.ema200)
        )
        .map((point) => ({
          time: toTime(point.timestamp),
          value: point.ema200 as number,
        }))
    )

    chart.timeScale().fitContent()

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) {
        return
      }

      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
      })
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      ema50SeriesRef.current = null
      ema200SeriesRef.current = null
    }
  }, [data])

  useEffect(() => {
    const series = candleSeriesRef.current

    if (!series || !item) {
      return
    }

    for (const line of priceLinesRef.current) {
      series.removePriceLine(line)
    }

    priceLinesRef.current = []

    const levels = [
      {
        title: "+3 SD",
        price: item.levels.plus3,
        color: "#3f3f46",
        width: 1 as const,
        style: 2 as const,
      },
      {
        title: "+2 SD",
        price: item.levels.plus2,
        color: "#52525b",
        width: 1 as const,
        style: 2 as const,
      },
      {
        title: "+1 SD",
        price: item.levels.plus1,
        color: "#a1a1aa",
        width: 2 as const,
        style: 2 as const,
      },
      {
        title: "ATM",
        price: item.levels.atm,
        color: "#fafafa",
        width: 2 as const,
        style: 0 as const,
      },
      {
        title: "-1 SD",
        price: item.levels.minus1,
        color: "#a1a1aa",
        width: 2 as const,
        style: 2 as const,
      },
      {
        title: "-2 SD",
        price: item.levels.minus2,
        color: "#52525b",
        width: 1 as const,
        style: 2 as const,
      },
      {
        title: "-3 SD",
        price: item.levels.minus3,
        color: "#3f3f46",
        width: 1 as const,
        style: 2 as const,
      },
    ]

    priceLinesRef.current = levels.map((level) =>
      series.createPriceLine({
        price: level.price,
        color: level.color,
        lineWidth: level.width,
        lineStyle: level.style,
        axisLabelVisible: true,
        title: level.title,
      })
    )
  }, [item])

  if (data.length === 0) {
    return (
      <div className="flex min-h-[430px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-500">
        Chart data unavailable
      </div>
    )
  }

  const latest = data[data.length - 1]

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            IQTF Intelligence Chart
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            XAUUSD 1H price · EMA50 / EMA200 · Expected Move zones
          </p>
        </div>

        <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {(["1H", "4H", "D"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimeframe(value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                timeframe === value
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="mt-4 overflow-hidden rounded-lg border border-zinc-900 bg-black/20"
      />

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500">
        <span>
          Price{" "}
          <strong className="text-white">
            {latest.price.toFixed(2)}
          </strong>
        </span>

        <span>
          EMA50{" "}
          <strong className="text-zinc-300">
            {latest.ema50?.toFixed(2) ?? "—"}
          </strong>
        </span>

        <span>
          EMA200{" "}
          <strong className="text-zinc-400">
            {latest.ema200?.toFixed(2) ?? "—"}
          </strong>
        </span>

        <span>
          HV14{" "}
          <strong className="text-zinc-300">
            {item?.hv14Percent != null ? `${item.hv14Percent.toFixed(2)}%` : "—"}
          </strong>
        </span>

        <span>
          EM ±{" "}
          <strong className="text-zinc-300">
            {item?.expectedMove != null ? item.expectedMove.toFixed(2) : "—"}
          </strong>
        </span>
      </div>

      <div className="mt-2 text-[10px] text-zinc-600">
        Charting Library by TradingView · Market data provided by IQTF
      </div>
    </div>
  )
}
