import type { Intelligence } from "@/lib/market"

export type ChartPoint = {
  timestamp: string
  price: number
  ema50: number | null
  ema200: number | null
}

function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return []

  const multiplier = 2 / (period + 1)
  const result: number[] = []

  let ema = values[0]

  for (const value of values) {
    ema = (value - ema) * multiplier + ema
    result.push(ema)
  }

  return result
}

export function buildChartData(
  intelligence: Intelligence | null
): ChartPoint[] {
  if (!intelligence?.candles?.length) {
    return []
  }

  const candles = intelligence.candles
    .filter(
      (candle) =>
        Number.isFinite(candle.close) &&
        candle.close > 0 &&
        typeof candle.timestamp === "string"
    )
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime()
    )

  if (candles.length === 0) {
    return []
  }

  const closes = candles.map((candle) => candle.close)

  const ema50 = calculateEMA(closes, 50)
  const ema200 = calculateEMA(closes, 200)

  return candles.map((candle, index) => ({
    timestamp: candle.timestamp,
    price: candle.close,
    ema50: ema50[index] ?? null,
    ema200: ema200[index] ?? null,
  }))
}
