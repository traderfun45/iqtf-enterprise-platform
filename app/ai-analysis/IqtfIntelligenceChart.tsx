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

type Timeframe = "5m" | "15m" | "1H" | "4H" | "D"

type Props = {
  data: ChartPoint[]
  expectedMoveData: ExpectedMoveXauUsd | null
  timeframe: Timeframe
  onTimeframeChange: (timeframe: Timeframe) => void
}

function toTime(timestamp: string): Time {
  const milliseconds = new Date(timestamp).getTime()

  if (!Number.isFinite(milliseconds)) {
    return 0 as Time
  }

  return Math.floor(milliseconds / 1000) as Time
}

export default function IqtfIntelligenceChart({
  data,
  expectedMoveData,
  timeframe,
  onTimeframeChange,
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

  const [fullscreen, setFullscreen] = useState(false)

  const item = expectedMoveData?.data[timeframe] ?? null

  /*
   * Create Lightweight Charts instance once.
   */
  useEffect(() => {
    const container = containerRef.current

    if (!container || chartRef.current) {
      return
    }

    const chart = createChart(container, {
      width: Math.max(1, container.clientWidth),
      height: 430,

      layout: {
        background: {
          color: "transparent",
        },
        textColor: "#a1a1aa",
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
        scaleMargins: {
          top: 0.08,
          bottom: 0.08,
        },
      },

      timeScale: {
        borderColor: "rgba(63, 63, 70, 0.5)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 7,
        minBarSpacing: 2,
      },

      crosshair: {
        mode: 0,

        vertLine: {
          color: "rgba(161, 161, 170, 0.45)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#27272a",
        },

        horzLine: {
          color: "rgba(161, 161, 170, 0.45)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#27272a",
        },
      },

      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },

      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineVisible: false,
      lastValueVisible: true,
    })

    const ema50Series = chart.addSeries(LineSeries, {
      color: "#d4d4d8",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    const ema200Series = chart.addSeries(LineSeries, {
      color: "#71717a",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    ema50SeriesRef.current = ema50Series
    ema200SeriesRef.current = ema200Series

    const resizeObserver = new ResizeObserver(() => {
      const currentContainer = containerRef.current
      const currentChart = chartRef.current

      if (!currentContainer || !currentChart) {
        return
      }

      currentChart.applyOptions({
        width: Math.max(1, currentContainer.clientWidth),
        height: fullscreen
          ? Math.max(300, currentContainer.clientHeight)
          : 430,
      })
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()

      for (const line of priceLinesRef.current) {
        try {
          candleSeries.removePriceLine(line)
        } catch {
          // Ignore during chart destruction.
        }
      }

      priceLinesRef.current = []

      chart.remove()

      chartRef.current = null
      candleSeriesRef.current = null
      ema50SeriesRef.current = null
      ema200SeriesRef.current = null
    }
  }, [])

  /*
   * Keep chart size synchronized with fullscreen state.
   */
  useEffect(() => {
    const chart = chartRef.current
    const container = containerRef.current

    if (!chart || !container) {
      return
    }

    requestAnimationFrame(() => {
      const currentChart = chartRef.current
      const currentContainer = containerRef.current

      if (!currentChart || !currentContainer) {
        return
      }

      currentChart.applyOptions({
        width: Math.max(1, currentContainer.clientWidth),
        height: fullscreen
          ? Math.max(300, currentContainer.clientHeight)
          : 430,
      })

      currentChart.timeScale().fitContent()
    })
  }, [fullscreen])

  /*
   * Update candle + EMA data.
   */
  useEffect(() => {
    const candleSeries = candleSeriesRef.current
    const ema50Series = ema50SeriesRef.current
    const ema200Series = ema200SeriesRef.current
    const chart = chartRef.current

    if (!candleSeries || !ema50Series || !ema200Series || !chart) {
      return
    }

    const candleData = data
      .map((point) => ({
        time: toTime(point.timestamp),
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
      }))
      .filter(
        (point) =>
          point.time !== (0 as Time) &&
          Number.isFinite(point.open) &&
          Number.isFinite(point.high) &&
          Number.isFinite(point.low) &&
          Number.isFinite(point.close)
      )

    const ema50Data = data
      .filter(
        (point) =>
          point.ema50 != null &&
          Number.isFinite(point.ema50)
      )
      .map((point) => ({
        time: toTime(point.timestamp),
        value: point.ema50 as number,
      }))
      .filter(
        (point) => point.time !== (0 as Time)
      )

    const ema200Data = data
      .filter(
        (point) =>
          point.ema200 != null &&
          Number.isFinite(point.ema200)
      )
      .map((point) => ({
        time: toTime(point.timestamp),
        value: point.ema200 as number,
      }))
      .filter(
        (point) => point.time !== (0 as Time)
      )

    candleSeries.setData(candleData)
    ema50Series.setData(ema50Data)
    ema200Series.setData(ema200Data)

    if (candleData.length > 0) {
      chart.timeScale().fitContent()
    }
  }, [data])

  /*
   * Expected Move price levels.
   *
   * Lightweight Charts price lines stay attached to the
   * right price scale and move correctly with zoom/pan.
   */
  useEffect(() => {
    const series = candleSeriesRef.current

    if (!series) {
      return
    }

    for (const line of priceLinesRef.current) {
      try {
        series.removePriceLine(line)
      } catch {
        // Ignore stale price lines.
      }
    }

    priceLinesRef.current = []

    if (!item) {
      return
    }

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
    ].filter(
      (level) => Number.isFinite(level.price)
    )

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
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col bg-zinc-950 p-3"
          : "rounded-xl border border-zinc-800 bg-zinc-950 p-5"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            IQTF Intelligence Chart
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            XAUUSD {timeframe} price · EMA50 / EMA200 · Expected Move zones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            {(["5m", "15m", "1H", "4H", "D"] as const).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onTimeframeChange(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    timeframe === value
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {value}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setFullscreen((value) => !value)
            }
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
            aria-label={
              fullscreen
                ? "Exit fullscreen"
                : "Enter fullscreen"
            }
          >
            {fullscreen ? "✕" : "⛶"}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={
          fullscreen
            ? "mt-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-zinc-900 bg-black/20"
            : "mt-4 overflow-hidden rounded-lg border border-zinc-900 bg-black/20"
        }
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
            {item?.hv14Percent != null
              ? `${item.hv14Percent.toFixed(2)}%`
              : "—"}
          </strong>
        </span>

        <span>
          EM ±{" "}
          <strong className="text-zinc-300">
            {item?.expectedMove != null
              ? item.expectedMove.toFixed(2)
              : "—"}
          </strong>
        </span>
      </div>

      <div className="mt-2 text-[10px] text-zinc-600">
        Charting Library by TradingView · Market data provided by IQTF
      </div>
    </div>
  )
}
