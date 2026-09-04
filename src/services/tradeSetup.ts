export type TradeSetupDecision =
  | 'LONG'
  | 'LONG_WATCH'
  | 'NO_TRADE'
  | 'SHORT_WATCH'
  | 'SHORT'

export type TradeSetupRiskState =
  | 'LOW'
  | 'NORMAL'
  | 'ELEVATED'
  | 'HIGH'
export type TradePermission =
  | 'ALLOWED'
  | 'BLOCKED'
export type TradeSetup = {
  available: boolean
  decision: TradeSetupDecision

  entry: number | null
  stopLoss: number | null

  takeProfit1: number | null
  takeProfit2: number | null
  takeProfit3: number | null

  riskAmount: number | null
  rewardToTp1: number | null
  rewardToTp2: number | null
  rewardToTp3: number | null

  riskRewardTp1: number | null
  riskRewardTp2: number | null
  riskRewardTp3: number | null

  reason?: string
}

function roundPrice(value: number): number {
  return Number(value.toFixed(2))
}

function roundRatio(value: number): number {
  return Number(value.toFixed(2))
}

export function calculateTradeSetup(params: {
  decision: TradeSetupDecision
  currentPrice: number
  atr: number
  riskState: TradeSetupRiskState
  tradePermission: TradePermission
  tradePermissionReason: string
}): TradeSetup {

  const {
    decision,
    currentPrice,
    atr,
    riskState,
    tradePermission,
    tradePermissionReason,
  } = params

  if (
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(atr) ||
    currentPrice <= 0 ||
    atr <= 0
  ) {
    return {
      available: false,
      decision,
      entry: null,
      stopLoss: null,
      takeProfit1: null,
      takeProfit2: null,
      takeProfit3: null,
      riskAmount: null,
      rewardToTp1: null,
      rewardToTp2: null,
      rewardToTp3: null,
      riskRewardTp1: null,
      riskRewardTp2: null,
      riskRewardTp3: null,
      reason: 'Trade setup unavailable because price or ATR data is invalid',
    }
  }

  if (tradePermission !== 'ALLOWED') {
    return {
      available: false,
      decision,
      entry: null,
      stopLoss: null,
      takeProfit1: null,
      takeProfit2: null,
      takeProfit3: null,
      riskAmount: null,
      rewardToTp1: null,
      rewardToTp2: null,
      rewardToTp3: null,
      riskRewardTp1: null,
      riskRewardTp2: null,
      riskRewardTp3: null,
      reason: tradePermissionReason,
    }
  }

  if (
    decision === 'NO_TRADE' ||
    decision === 'LONG_WATCH' ||
    decision === 'SHORT_WATCH'
  ) {
    return {
      available: false,
      decision,
      entry: null,
      stopLoss: null,
      takeProfit1: null,
      takeProfit2: null,
      takeProfit3: null,
      riskAmount: null,
      rewardToTp1: null,
      rewardToTp2: null,
      rewardToTp3: null,
      riskRewardTp1: null,
      riskRewardTp2: null,
      riskRewardTp3: null,
      reason:
        decision === 'NO_TRADE'
          ? 'Trade setup disabled because decision is NO_TRADE'
          : 'Trade setup waiting for confirmation',
    }
  }

  /*
   * ATR-based risk model.
   *
   * NORMAL / LOW:
   *   SL = 1.0 ATR
   *
   * ELEVATED:
   *   SL = 1.25 ATR
   *
   * HIGH:
   *   No new setup should be generated.
   */
  if (riskState === 'HIGH') {
    return {
      available: false,
      decision,
      entry: null,
      stopLoss: null,
      takeProfit1: null,
      takeProfit2: null,
      takeProfit3: null,
      riskAmount: null,
      rewardToTp1: null,
      rewardToTp2: null,
      rewardToTp3: null,
      riskRewardTp1: null,
      riskRewardTp2: null,
      riskRewardTp3: null,
      reason: 'Trade setup disabled because risk state is HIGH',
    }
  }

  const stopAtrMultiplier =
    riskState === 'ELEVATED'
      ? 1.25
      : 1.0

  const riskAmount = atr * stopAtrMultiplier

  const entry = currentPrice

  const stopLoss =
    decision === 'LONG'
      ? entry - riskAmount
      : entry + riskAmount

  const takeProfit1 =
    decision === 'LONG'
      ? entry + riskAmount
      : entry - riskAmount

  const takeProfit2 =
    decision === 'LONG'
      ? entry + riskAmount * 2
      : entry - riskAmount * 2

  const takeProfit3 =
    decision === 'LONG'
      ? entry + riskAmount * 3
      : entry - riskAmount * 3

  const rewardToTp1 = Math.abs(takeProfit1 - entry)
  const rewardToTp2 = Math.abs(takeProfit2 - entry)
  const rewardToTp3 = Math.abs(takeProfit3 - entry)

  return {
    available: true,
    decision,

    entry: roundPrice(entry),
    stopLoss: roundPrice(stopLoss),

    takeProfit1: roundPrice(takeProfit1),
    takeProfit2: roundPrice(takeProfit2),
    takeProfit3: roundPrice(takeProfit3),

    riskAmount: roundPrice(riskAmount),

    rewardToTp1: roundPrice(rewardToTp1),
    rewardToTp2: roundPrice(rewardToTp2),
    rewardToTp3: roundPrice(rewardToTp3),

    riskRewardTp1: roundRatio(rewardToTp1 / riskAmount),
    riskRewardTp2: roundRatio(rewardToTp2 / riskAmount),
    riskRewardTp3: roundRatio(rewardToTp3 / riskAmount),
  }
}
