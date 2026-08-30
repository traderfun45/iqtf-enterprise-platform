import { runCmeOcr } from '../services/cmeOcr.js'

import { analyzeCmeImage } from '../services/openaiVision.js'
import { normalizeCmeVision } from '../services/cmeVisionNormalizer.js'
import { validateCmeVision } from '../services/cmeVisionValidator.js'
import { analyzeCmeOptionIntelligence } from '../services/cmeOptionIntelligence.js'
import fs from "node:fs/promises"
import type { FastifyInstance } from 'fastify'

import {
  createCmeMarketData,
  getLatestCmeMarketData,
  getCmeMarketDataHistory,
  type CmeMarketData,
} from '../db/cme.js'

import {
  analyzeCmeIntelligence,
} from '../services/cmeIntelligence.js'
import { resolveVol2VolState } from '../services/vol2volState.js'
import { analyzeVol2Vol } from '../services/vol2vol.js'
import { getMarketProvider } from '../providers/market/index.js'
import { getMarketBySymbol } from '../db/markets.js'
import { calculateMarketIntelligence } from '../services/market/intelligence.js'
import { getCachedMarketIntelligence } from '../services/market/intelligenceCache.js'
import { calculateIqtfDecision } from '../services/iqtfDecision.js'
import {
  getVol2VolState,
  saveVol2VolState,
} from '../db/vol2volState.js'

function buildHistoricalChanges(
  history: CmeMarketData[],
) {
  const historicalVolumeChanges: number[] = []
  const historicalOIChanges: number[] = []
  for (
    let i = 1;
    i < history.length;
    i++
  ) {
    const current = history[i - 1]
    const previous = history[i]

    if (
      current.volume !== undefined &&
      previous.volume !== undefined
    ) {
      historicalVolumeChanges.push(
        current.volume - previous.volume,
      )
    }

    if (
      current.openInterest !== undefined &&
      previous.openInterest !== undefined
    ) {
      historicalOIChanges.push(
        current.openInterest -
          previous.openInterest,
      )
    }
  }

  return {
    historicalVolumeChanges,
    historicalOIChanges,
  }
}



export async function cmeRoutes(
  app: FastifyInstance,
) {  // =========================================================
  // POST /api/cme/ocr
  // =========================================================
  app.post('/api/cme/ocr', async (request, reply) => {
    const body = request.body as {
      image?: string
    }

    if (!body?.image) {
      return reply.code(400).send({
        error: 'image is required',
      })
    }

    try {
      const imageBuffer = Buffer.from(body.image, 'base64')

        const tempPath = `./cme-ocr-${Date.now()}.jpg`

await fs.writeFile(tempPath, imageBuffer)

try {
  const visionResult = await analyzeCmeImage(tempPath)
console.log(
  'CME RAW VISION:',
  JSON.stringify(visionResult, null, 2)
)
  const normalizedResult = normalizeCmeVision(visionResult)
  const validation = validateCmeVision(normalizedResult)

    const optionIntelligence =
      analyzeCmeOptionIntelligence(
        normalizedResult.optionRows,
      )

  return {
    success: true,
    data: normalizedResult,
      optionIntelligence,
    validation,
  }
} finally {

  await fs.unlink(tempPath).catch(() => {})
}
     

     
        
    } catch (error) {
      console.error('CME OCR ERROR FULL:', JSON.stringify(error, null, 2)); console.error(error)

      return reply.code(500).send({
        error: 'OCR processing failed',
      })
    }
  })

  // =========================================================
  // POST /api/cme
  // =========================================================

  app.post('/api/cme', async (request, reply) => {
    const body =
      request.body as CmeMarketData

    if (
      !body?.symbol ||
      !body?.dataDate
    ) {
      return reply.code(400).send({
        error:
          'symbol and dataDate are required',
      })
    }

    const previous =
      getLatestCmeMarketData(
        body.symbol,
      )

    const history =
      getCmeMarketDataHistory(
        body.symbol,
        30,
      )

    const {
      historicalVolumeChanges,
      historicalOIChanges,
    } =
      buildHistoricalChanges(
        history,
      )

    const intelligence =
      body.settlementPrice !== undefined
        ? analyzeCmeIntelligence({
            price:
              body.settlementPrice,

            previousPrice:
              previous?.settlementPrice,

            volume:
              body.volume,

            previousVolume:
              previous?.volume,

            openInterest:
              body.openInterest,

            previousOpenInterest:
              previous?.openInterest,

            historicalVolumeChanges,
            historicalOIChanges,
          })
        : null

    const data =
      createCmeMarketData({
        ...body,

        oiChange:
          body.oiChange ??
          intelligence?.openInterestChange,

        volumeZscore:
          body.volumeZscore ??
          intelligence?.volumeZscore,

        oiZscore:
          body.oiZscore ??
          intelligence?.oiZscore,
      })

    return reply.code(201).send({
      success: true,
      data,
      intelligence,
    })
  })

  // =========================================================
  // GET /api/cme/latest
  // =========================================================

  app.get(
    "/api/cme/latest",
    async (request) => {
      const query =
        request.query as {
          symbol?: string
        }

      const symbol =
        query.symbol ?? "GC"

      const data =
        getLatestCmeMarketData(
          symbol,
        )

      return {
        success: true,
        data,
      }
    },
  )

  // =========================================================
  // GET /api/cme/history
  // =========================================================

  app.get(
    "/api/cme/history",
    async (request) => {
      const query =
        request.query as {
          symbol?: string
          limit?: string
        }

      const symbol =
        query.symbol ?? "GC"

      const limit =
        Math.min(
          Math.max(
            Number(
              query.limit ?? 30,
            ),
            1,
          ),
          100,
        )

      return {
        success: true,
        data:
          getCmeMarketDataHistory(
            symbol,
            limit,
          ),
      }
    },
  )

  // =========================================================
  // GET /api/cme/analysis
  // =========================================================


  // =========================================================
  // GET /api/cme/analysis
  // =========================================================

  app.get(
    '/api/cme/analysis',
    async (request, reply) => {
      const query =
        request.query as {
          symbol?: string
        }

      const symbol =
        query.symbol ?? 'GC'

      const history =
        getCmeMarketDataHistory(
          symbol,
          100,
        )

      const latest =
        history[0]

      const previous =
        history[1]

      if (
        !latest ||
        latest.settlementPrice === undefined
      ) {
        return reply.code(404).send({
          error:
            'No CME market data available',
        })
      }

      const {
        historicalVolumeChanges,
        historicalOIChanges,
      } =
        buildHistoricalChanges(
          history,
        )

      const intelligence =
        analyzeCmeIntelligence({
          price:
            latest.settlementPrice,

          previousPrice:
            previous?.settlementPrice,

          volume:
            latest.volume,

          previousVolume:
            previous?.volume,

          openInterest:
            latest.openInterest,

          previousOpenInterest:
            previous?.openInterest,

          historicalVolumeChanges,
          historicalOIChanges,
        })

      const vol2vol =
        analyzeVol2Vol({
          priceChange:
            intelligence.priceChange,

          volumeChange:
            intelligence.volumeChange,

          openInterestChange:
            intelligence.openInterestChange,

          volumeZscore:
            intelligence.volumeZscore,

          oiZscore:
            intelligence.oiZscore,

          positioning:
            intelligence.positioning,
        })

      const storedState =
  getVol2VolState(symbol)

const vol2volState =
  resolveVol2VolState({
    previousState:
      storedState.state,




         signal:
            vol2vol.signal,

          confidence:
            vol2vol.confidence,
        })

        const marketIntelligence =
          await getCachedMarketIntelligence(
            `${symbol}:1h:50`,
            async () => {
              const market = getMarketBySymbol(symbol)

              if (!market) {
                throw new Error(`Market symbol not found: ${symbol}`)
              }

              const provider =
                getMarketProvider(market.provider ?? 'mock')

              if (typeof provider.getHistory !== 'function') {
                throw new Error(
                  `Historical data is not supported for ${symbol}`,
                )
              }

              const candles = await provider.getHistory(symbol, {
                interval: '1h',
                outputsize: 50,
              })

const orderedCandles = [...candles].sort(
  (a, b) =>
    new Date(a.timestamp).getTime() -
    new Date(b.timestamp).getTime(),
)

return {
  intelligence: calculateMarketIntelligence(candles),
  currentPrice:
    orderedCandles[orderedCandles.length - 1].close,
  candleCount: candles.length,
}

            },
          )

        const iqtfDecision =
          calculateIqtfDecision({
            marketScore:
              marketIntelligence.intelligence.score,
            cmeConfirmation:
              intelligence.confirmationScore,
            vol2volScore:
              vol2vol.score,
            marketSignal:
              marketIntelligence.intelligence.signal,
            marketStructure:
              marketIntelligence.intelligence.structure.direction,
            volatilityRegime:
              marketIntelligence.intelligence.volatilityRegime.regime,
            cmePositioning:
              intelligence.positioning,
            cmeOiConfirmation:
              intelligence.oiConfirmation,
            vol2volSignal:
              vol2vol.signal,
          })

      return {
        success: true,

        symbol,

        data: latest,

          marketIntelligence:
            marketIntelligence.intelligence,

          intelligence,

          vol2vol,

          iqtfDecision,

        vol2volState,

        previousState:
        storedState.state,

          savedState: saveVol2VolState({ symbol, state: vol2volState.state, signal: vol2volState.signal, confidence: vol2volState.confidence, action: vol2volState.action }),

        historyStats: {
          records:
            history.length,

          volumeChangeSamples:
            historicalVolumeChanges.length,

          oiChangeSamples:
            historicalOIChanges.length,
        },
      }
    },
  )
}
