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
  category:
    | "trend"
    | "momentum"
    | "structure"
    | "volatility"
    | "mtf"
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

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.max(min, Math.min(max, value))
}

function directionFromScore(
  score: number
): FactorDirection {
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

  return sameDirection
    ? "supporting"
    : "conflicting"
}

export function buildIntelligenceFactors(
  data: Intelligence
): FactorAnalysis {
  const signalScore = clamp(data.score, -1, 1)

  const trendScore = clamp(
    data.trend.score,
    -1,
    1
  )

  const momentumScore = clamp(
    data.momentum.score,
    -1,
    1
  )

  const structureScore = clamp(
    data.structure.score,
    -1,
    1
  )

  const mtfScore = clamp(
    data.mtf.score,
    -1,
    1
  )

  /*
   * Volatility regime is a context factor.
   *
   * LOW / NORMAL:
   * no directional pressure.
   *
   * HIGH:
   * reduces directional confidence rather than
   * automatically becoming bullish or bearish.
   */
  let volatilityScore = clamp(
    data.volatilityRegime.score,
    -1,
    1
  )

  if (
    data.volatilityRegime.regime === "HIGH" &&
    volatilityScore === 0
  ) {
    volatilityScore =
      signalScore > 0
        ? -0.5
        : signalScore < 0
          ? 0.5
          : 0
  }

  const factors: IntelligenceFactor[] = [
    {
      id: "trend",
      name: "Trend",
      category: "trend",
      score: trendScore,
      weight: 0.25,
      contribution: trendScore * 0.25,
      direction: directionFromScore(trendScore),
      status: statusFromScore(
        trendScore,
        signalScore
      ),
      reason:
        data.trend.direction === "bullish"
          ? "Trend direction is bullish"
          : data.trend.direction === "bearish"
            ? "Trend direction is bearish"
            : "Trend direction is neutral",
    },

    {
      id: "momentum",
      name: "Momentum",
      category: "momentum",
      score: momentumScore,
      weight: 0.20,
      contribution: momentumScore * 0.20,
      direction: directionFromScore(
        momentumScore
      ),
      status: statusFromScore(
        momentumScore,
        signalScore
      ),
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
      score: structureScore,
      weight: 0.25,
      contribution: structureScore * 0.25,
      direction: directionFromScore(
        structureScore
      ),
      status: statusFromScore(
        structureScore,
        signalScore
      ),
      reason:
        data.structure.bias === "bullish"
          ? "Market structure favors buyers"
          : data.structure.bias === "bearish"
            ? "Market structure favors sellers"
            : "Market structure has no clear directional edge",
    },

    {
      id: "volatility",
      name: "Volatility Regime",
      category: "volatility",
      score: volatilityScore,
      weight: 0.10,
      contribution: volatilityScore * 0.10,
      direction: directionFromScore(
        volatilityScore
      ),
      status:
        data.volatilityRegime.regime === "HIGH"
          ? "conflicting"
          : "neutral",
      reason:
        data.volatilityRegime.regime === "HIGH"
          ? "High volatility is reducing directional confidence"
          : data.volatilityRegime.regime === "LOW"
            ? "Low volatility indicates compressed market conditions"
            : "Volatility regime is normal",
    },

    {
      id: "mtf",
      name: "Multi-Timeframe",
      category: "mtf",
      score: mtfScore,
      weight: 0.20,
      contribution: mtfScore * 0.20,
      direction: directionFromScore(mtfScore),
      status:
        Math.abs(mtfScore) < 0.05
          ? "neutral"
          : statusFromScore(
              mtfScore,
              signalScore
            ),
      reason:
        data.mtf.alignment === "bullish"
          ? "Short-term and medium-term structure align bullish"
          : data.mtf.alignment === "bearish"
            ? "Short-term and medium-term structure align bearish"
            : "Multi-timeframe structure is not aligned",
    },
  ]

  const supporting = factors.filter(
    (factor) =>
      factor.status === "supporting"
  )

  const conflicting = factors.filter(
    (factor) =>
      factor.status === "conflicting"
  )

  const neutral = factors.filter(
    (factor) =>
      factor.status === "neutral"
  )

  const primaryDriver =
    factors
      .filter(
        (factor) =>
          factor.status === "supporting"
      )
      .sort(
        (a, b) =>
          Math.abs(b.contribution) -
          Math.abs(a.contribution)
      )[0] ?? null

  const weightedScore = factors.reduce(
    (total, factor) =>
      total + factor.contribution,
    0
  )

  const confidence = Math.round(
    clamp(
      Math.abs(weightedScore) * 100,
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
