import type { Intelligence } from "../market"

export type FactorDirection =
  | "bullish"
  | "bearish"
  | "neutral"

export type FactorStatus =
  | "supporting"
  | "conflicting"
  | "neutral"

export type IntelligenceFactor = {
  id: string
  name: string
  category: "trend" | "momentum" | "structure" | "volatility" | "mtf"
  score: number
  weight: number
  contribution: number
  direction: FactorDirection
  status: FactorStatus
  reason: string
}

export type FactorAnalysis = {
  factors: IntelligenceFactor[]
  supporting: IntelligenceFactor[]
  conflicting: IntelligenceFactor[]
  neutral: IntelligenceFactor[]
  primaryDriver: IntelligenceFactor | null
  confidence: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function directionFromScore(score: number): FactorDirection {
  if (score > 0.05) return "bullish"
  if (score < -0.05) return "bearish"
  return "neutral"
}

function statusFromScore(
  score: number,
  signalScore: number
): FactorStatus {
  if (Math.abs(score) < 0.05) {
    return "neutral"
  }

  const sameDirection =
    (score > 0 && signalScore > 0) ||
    (score < 0 && signalScore < 0)

  return sameDirection ? "supporting" : "conflicting"
}

export function buildIntelligenceFactors(
  data: Intelligence
): FactorAnalysis {
  const signalScore = data.score

  const trendScore = clamp(data.trend.score, -1, 1)
  const momentumScore = clamp(data.momentum.score, -1, 1)

  /*
   * Volatility is treated as a risk/context factor.
   * Higher ATR does not automatically mean bullish or bearish.
   * Therefore it only becomes conflicting when volatility is
   * elevated enough to reduce directional confidence.
   */
  let volatilityScore = 0

  if (data.volatility.atrPercent >= 0.5) {
    volatilityScore = signalScore === 0
      ? 0
      : signalScore > 0
        ? -0.8
        : 0.8
  } else if (data.volatility.atrPercent >= 0.3) {
    volatilityScore = signalScore === 0
      ? 0
      : signalScore > 0
        ? -0.4
        : 0.4
  }

  const factors: IntelligenceFactor[] = [
    {
      id: "trend",
      name: "Trend",
      category: "trend",
      score: trendScore,
      weight: 0.30,
      contribution: trendScore * 0.30,
      direction: directionFromScore(trendScore),
      status: statusFromScore(trendScore, signalScore),
      reason:
        data.trend.direction === "bullish"
          ? "Trend structure is bullish"
          : data.trend.direction === "bearish"
            ? "Trend structure is bearish"
            : "Trend direction is neutral",
    },
    {
      id: "momentum",
      name: "Momentum",
      category: "momentum",
      score: momentumScore,
      weight: 0.25,
      contribution: momentumScore * 0.25,
      direction: directionFromScore(momentumScore),
      status: statusFromScore(momentumScore, signalScore),
      reason:
        momentumScore > 0.05
          ? "Momentum supports upside continuation"
          : momentumScore < -0.05
            ? "Momentum supports downside continuation"
            : "Momentum confirmation is weak",
    },
    {
      id: "structure",
      name: "Structure",
      category: "structure",
      score: trendScore,
      weight: 0.20,
      contribution: trendScore * 0.20,
      direction: directionFromScore(trendScore),
      status: statusFromScore(trendScore, signalScore),
      reason:
        trendScore > 0.05
          ? "Market structure currently favors buyers"
          : trendScore < -0.05
            ? "Market structure currently favors sellers"
            : "Market structure has no clear directional edge",
    },
    {
      id: "volatility",
      name: "Volatility",
      category: "volatility",
      score: volatilityScore,
      weight: 0.15,
      contribution: volatilityScore * 0.15,
      direction: directionFromScore(volatilityScore),
      status: statusFromScore(volatilityScore, signalScore),
      reason:
        data.volatility.atrPercent >= 0.5
          ? "High volatility is reducing directional confidence"
          : data.volatility.atrPercent >= 0.3
            ? "Elevated volatility requires additional confirmation"
            : "Volatility remains within normal conditions",
    },
    {
      id: "mtf",
      name: "Multi-Timeframe",
      category: "mtf",
      score: signalScore,
      weight: 0.10,
      contribution: signalScore * 0.10,
      direction: directionFromScore(signalScore),
      status: signalScore === 0 ? "neutral" : "supporting",
      reason:
        data.signal === "bullish"
          ? "Current intelligence signal favors bullish conditions"
          : data.signal === "bearish"
            ? "Current intelligence signal favors bearish conditions"
            : "Multi-timeframe directional confirmation is neutral",
    },
  ]

  const supporting = factors.filter(
    (factor) => factor.status === "supporting"
  )

  const conflicting = factors.filter(
    (factor) => factor.status === "conflicting"
  )

  const neutral = factors.filter(
    (factor) => factor.status === "neutral"
  )

  const primaryDriver =
    factors
      .filter((factor) => factor.status === "supporting")
      .sort(
        (a, b) =>
          Math.abs(b.contribution) - Math.abs(a.contribution)
      )[0] ?? null

  const confidence = Math.round(
    clamp(
      Math.abs(
        factors.reduce(
          (total, factor) => total + factor.contribution,
          0
        )
      ) * 100,
      0,
      100
    )
  )

  return {
    factors,
    supporting,
    conflicting,
    neutral,
    primaryDriver,
    confidence,
  }
}
