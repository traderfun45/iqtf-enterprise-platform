"use client"

import { useMemo, useState } from "react"
import type { ExpectedMoveXauUsd } from "@/lib/market"
import type { ChartPoint } from "@/lib/intelligence/chart"

type Props = {
  data: ChartPoint[]
  expectedMoveData: ExpectedMoveXauUsd | null
}

type Timeframe = "1H" | "4H" | "D"

function buildPath(
  points: ChartPoint[],
  key: "price" | "ema50" | "ema200",
  x: (index: number) => number,
  y: (value: number) => number,
) {
  const parts: string[] = []

  points.forEach((point, index) => {
    const value = point[key]

    if (value == null || !Number.isFinite(value)) {
      return
    }

    parts.push(
      `${parts.length === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(value).toFixed(2)}`
    )
  })

  return parts.join(" ")
}

export default function IqtfIntelligenceChart({
  data,
  expectedMoveData,
}: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1H")

  const chart = useMemo(() => {
    const visible = data.slice(-100)

    if (visible.length === 0) {
      return null
    }

    const item = expectedMoveData?.data[timeframe]

    if (!item) {
      return null
    }

    const width = 1000
    const height = 430
    const padding = {
      left: 20,
      right: 82,
      top: 28,
      bottom: 38,
    }

    const values = [
      ...visible.map((point) => point.price),
      ...visible.map((point) => point.ema50).filter(
        (value): value is number => value != null
      ),
      ...visible.map((point) => point.ema200).filter(
        (value): value is number => value != null
      ),
      item.levels.minus3,
      item.levels.minus2,
      item.levels.minus1,
      item.levels.atm,
      item.levels.plus1,
      item.levels.plus2,
      item.levels.plus3,
    ]

    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)
    const range = Math.max(rawMax - rawMin, 1)
    const min = rawMin - range * 0.08
    const max = rawMax + range * 0.08

    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom

    const x = (index: number) =>
      padding.left +
      (index / Math.max(visible.length - 1, 1)) * innerWidth

    const y = (value: number) =>
      padding.top +
      ((max - value) / (max - min)) * innerHeight

    return {
      visible,
      item,
      width,
      height,
      padding,
      x,
      y,
      pricePath: buildPath(visible, "price", x, y),
      ema50Path: buildPath(visible, "ema50", x, y),
      ema200Path: buildPath(visible, "ema200", x, y),
      levels: [
        { label: "+3 SD", value: item.levels.plus3 },
        { label: "+2 SD", value: item.levels.plus2 },
        { label: "+1 SD", value: item.levels.plus1 },
        { label: "ATM", value: item.levels.atm },
        { label: "-1 SD", value: item.levels.minus1 },
        { label: "-2 SD", value: item.levels.minus2 },
        { label: "-3 SD", value: item.levels.minus3 },
      ],
    }
  }, [data, expectedMoveData, timeframe])

  if (!chart) {
    return (
      <div className="flex min-h-[430px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-500">
        Chart data unavailable
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            IQTF Intelligence Chart
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            XAUUSD price · EMA50 / EMA200 · Expected Move zones
          </p>
        </div>

        <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {(["1H", "4H", "D"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTimeframe(item)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                timeframe === item
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-900 bg-black/20">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="h-auto w-full"
          role="img"
          aria-label={`XAUUSD ${timeframe} intelligence chart`}
        >
          {chart.levels.map((level) => {
            const yy = chart.y(level.value)
            const strong =
              level.label === "ATM" ||
              level.label === "+1 SD" ||
              level.label === "-1 SD"

            return (
              <g key={level.label}>
                <line
                  x1={chart.padding.left}
                  x2={chart.width - chart.padding.right}
                  y1={yy}
                  y2={yy}
                  stroke="currentColor"
                  className={
                    strong
                      ? "text-zinc-600"
                      : "text-zinc-800"
                  }
                  strokeDasharray={
                    level.label === "ATM" ? undefined : "5 5"
                  }
                />
                <text
                  x={chart.width - chart.padding.right + 8}
                  y={yy + 4}
                  className={
                    strong
                      ? "fill-zinc-300 text-[12px]"
                      : "fill-zinc-600 text-[11px]"
                  }
                >
                  {level.label} {level.value.toFixed(2)}
                </text>
              </g>
            )
          })}

          <path
            d={chart.ema200Path}
            fill="none"
            stroke="currentColor"
            className="text-zinc-600"
            strokeWidth="2"
          />

          <path
            d={chart.ema50Path}
            fill="none"
            stroke="currentColor"
            className="text-zinc-400"
            strokeWidth="2"
          />

          <path
            d={chart.pricePath}
            fill="none"
            stroke="currentColor"
            className="text-white"
            strokeWidth="2.5"
          />

          <line
            x1={chart.x(chart.visible.length - 1)}
            x2={chart.x(chart.visible.length - 1)}
            y1={chart.padding.top}
            y2={chart.height - chart.padding.bottom}
            stroke="currentColor"
            className="text-zinc-800"
            strokeDasharray="3 5"
          />

          <circle
            cx={chart.x(chart.visible.length - 1)}
            cy={chart.y(chart.visible[chart.visible.length - 1].price)}
            r="4"
            fill="currentColor"
            className="text-white"
          />
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500">
        <span>
          Price{" "}
          <strong className="text-white">
            {chart.visible[chart.visible.length - 1].price.toFixed(2)}
          </strong>
        </span>

        <span>
          EMA50{" "}
          <strong className="text-zinc-300">
            {chart.visible[chart.visible.length - 1].ema50?.toFixed(2) ?? "—"}
          </strong>
        </span>

        <span>
          EMA200{" "}
          <strong className="text-zinc-400">
            {chart.visible[chart.visible.length - 1].ema200?.toFixed(2) ?? "—"}
          </strong>
        </span>

        <span>
          HV14{" "}
          <strong className="text-zinc-300">
            {chart.item.hv14Percent.toFixed(2)}%
          </strong>
        </span>

        <span>
          EM ±{" "}
          <strong className="text-zinc-300">
            {chart.item.expectedMove.toFixed(2)}
          </strong>
        </span>
      </div>
    </div>
  )
}
