import type { MarketCandle } from '../../market/twelveData.js'
import {
  calculateExpectedMove,
  type ExpectedMoveTimeframe,
} from '../market/expectedMove.js'

export type BacktestSide = 'BUY' | 'SELL'
export type BacktestResult =
  | 'TP1'
  | 'TP2'
  | 'SL'
  | 'NO_RESOLUTION'

export interface BacktestTrade {
  setupTime: string
  entryTime: string
  side: BacktestSide
  sd: 1 | 2 | 3
  entry: number
  tp1: number
  tp2: number
  sl: number
  exit: number
  result: BacktestResult
  r: number
  barsHeld: number
}

export interface BacktestSummary {
  symbol: string
  timeframe: ExpectedMoveTimeframe
  selectedSd: 1 | 2 | 3
  candleCount: number
  trades: BacktestTrade[]
  totalTrades: number
  buyTrades: number
  sellTrades: number
  tp1: number
  tp2: number
  sl: number
  noResolution: number
  winRate: number
  totalR: number
  averageR: number
  maxDrawdownR: number
}

function level(
  levels: {
    minus3: number
    minus2: number
    minus1: number
    atm: number
    plus1: number
    plus2: number
    plus3: number
  },
  name: 'minus1' | 'minus2' | 'minus3' | 'plus1' | 'plus2' | 'plus3',
): number {
  return levels[name]
}

function simulateTrade(
  candles: MarketCandle[],
  startIndex: number,
  side: BacktestSide,
  entry: number,
  tp1: number,
  tp2: number,
  sl: number,
  sd: 1 | 2 | 3,
): BacktestTrade {
  const setupTime = candles[startIndex - 1]?.timestamp ?? candles[startIndex].timestamp
  const entryTime = candles[startIndex].timestamp

  for (let i = startIndex; i < candles.length; i += 1) {
    const candle = candles[i]

    const tp1Hit =
      side === 'BUY'
        ? candle.high >= tp1
        : candle.low <= tp1

    const tp2Hit =
      side === 'BUY'
        ? candle.high >= tp2
        : candle.low <= tp2

    const slHit =
      side === 'BUY'
        ? candle.low <= sl
        : candle.high >= sl

    /*
     * Conservative assumption:
     * if TP and SL occur in the same candle, resolve at SL.
     */
    if (slHit) {
      const risk = Math.abs(entry - sl)
      const r =
        side === 'BUY'
          ? (sl - entry) / risk
          : (entry - sl) / risk

      return {
        setupTime,
        entryTime,
        side,
        sd,
        entry,
        tp1,
        tp2,
        sl,
        exit: sl,
        result: 'SL',
        r,
        barsHeld: i - startIndex + 1,
      }
    }

    if (tp2Hit) {
      const risk = Math.abs(entry - sl)
      const r =
        side === 'BUY'
          ? (tp2 - entry) / risk
          : (entry - tp2) / risk

      return {
        setupTime,
        entryTime,
        side,
        sd,
        entry,
        tp1,
        tp2,
        sl,
        exit: tp2,
        result: 'TP2',
        r,
        barsHeld: i - startIndex + 1,
      }
    }

    if (tp1Hit) {
      const risk = Math.abs(entry - sl)
      const r =
        side === 'BUY'
          ? (tp1 - entry) / risk
          : (entry - tp1) / risk

      return {
        setupTime,
        entryTime,
        side,
        sd,
        entry,
        tp1,
        tp2,
        sl,
        exit: tp1,
        result: 'TP1',
        r,
        barsHeld: i - startIndex + 1,
      }
    }
  }

  return {
    setupTime,
    entryTime,
    side,
    sd,
    entry,
    tp1,
    tp2,
    sl,
    exit: entry,
    result: 'NO_RESOLUTION',
    r: 0,
    barsHeld: candles.length - startIndex,
  }
}

export function runTradeLevelBacktest(
  xauCandles: MarketCandle[],
  gcCandles: MarketCandle[],
  timeframe: ExpectedMoveTimeframe,
  selectedSd: 1 | 2 | 3,
): BacktestSummary {
  const trades: BacktestTrade[] = []
  let nextAvailableIndex = 15

  const xau = [...xauCandles].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime(),
  )

  const gc = [...gcCandles].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime(),
  )

  for (let i = 15; i < xau.length - 1; i += 1) {
    if (i < nextAvailableIndex) {
      continue
    }

    const current = xau[i]
    const currentTime = new Date(current.timestamp).getTime()

    const gcHistory = gc.filter(
      (candle) =>
        new Date(candle.timestamp).getTime() <= currentTime,
    )

    if (gcHistory.length < 15) {
      continue
    }

    let em

    try {
      em = calculateExpectedMove(
        gcHistory,
        timeframe,
        undefined,
        current.close,
      )
    } catch {
      continue
    }

    const selectedMinus = level(
      em.levels,
      `minus${selectedSd}` as
        | 'minus1'
        | 'minus2'
        | 'minus3',
    )

    const selectedPlus = level(
      em.levels,
      `plus${selectedSd}` as
        | 'plus1'
        | 'plus2'
        | 'plus3',
    )

    const nextSd = selectedSd + 1

    const tp2Buy =
      nextSd <= 3
        ? level(
            em.levels,
            `plus${nextSd}` as
              | 'plus1'
              | 'plus2'
              | 'plus3',
          )
        : em.price + em.expectedMove * 4

    const tp2Sell =
      nextSd <= 3
        ? level(
            em.levels,
            `minus${nextSd}` as
              | 'minus1'
              | 'minus2'
              | 'minus3',
          )
        : em.price - em.expectedMove * 4

    const buySl =
      selectedMinus -
      em.expectedMove * selectedSd * 0.5

    const sellSl =
      selectedPlus +
      em.expectedMove * selectedSd * 0.5

    const next = xau[i + 1]

    const buyTriggered = next.low <= selectedMinus
    const sellTriggered = next.high >= selectedPlus

    if (buyTriggered) {
      const trade = simulateTrade(
        xau,
        i + 1,
        'BUY',
        selectedMinus,
        em.price,
        tp2Buy,
        buySl,
        selectedSd,
      )

      trades.push(trade)
      nextAvailableIndex = Math.max(
        nextAvailableIndex,
        i + 1 + trade.barsHeld,
      )
    } else if (sellTriggered) {
      const trade = simulateTrade(
        xau,
        i + 1,
        'SELL',
        selectedPlus,
        em.price,
        tp2Sell,
        sellSl,
        selectedSd,
      )

      trades.push(trade)
      nextAvailableIndex = Math.max(
        nextAvailableIndex,
        i + 1 + trade.barsHeld,
      )
    }
  }

  const totalTrades = trades.length
  const buyTrades = trades.filter(
    (trade) => trade.side === 'BUY',
  ).length
  const sellTrades = trades.filter(
    (trade) => trade.side === 'SELL',
  ).length

  const tp1 = trades.filter(
    (trade) => trade.result === 'TP1',
  ).length
  const tp2 = trades.filter(
    (trade) => trade.result === 'TP2',
  ).length
  const sl = trades.filter(
    (trade) => trade.result === 'SL',
  ).length
  const noResolution = trades.filter(
    (trade) => trade.result === 'NO_RESOLUTION',
  ).length

  const resolved = trades.filter(
    (trade) => trade.result !== 'NO_RESOLUTION',
  )

  const wins = resolved.filter(
    (trade) => trade.r > 0,
  ).length

  const totalR = trades.reduce(
    (sum, trade) => sum + trade.r,
    0,
  )

  const averageR =
    totalTrades > 0
      ? totalR / totalTrades
      : 0

  let equity = 0
  let peak = 0
  let maxDrawdownR = 0

  for (const trade of trades) {
    equity += trade.r
    peak = Math.max(peak, equity)
    maxDrawdownR = Math.max(
      maxDrawdownR,
      peak - equity,
    )
  }

  return {
    symbol: 'XAUUSD',
    timeframe,
    selectedSd,
    candleCount: xau.length,
    trades,
    totalTrades,
    buyTrades,
    sellTrades,
    tp1,
    tp2,
    sl,
    noResolution,
    winRate:
      resolved.length > 0
        ? (wins / resolved.length) * 100
        : 0,
    totalR,
    averageR,
    maxDrawdownR,
  }
}
