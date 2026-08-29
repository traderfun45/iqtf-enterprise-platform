import type { FastifyInstance } from 'fastify'

import {
  getCmeMarketDataHistory,
} from '../db/cme.js'

import {
  getCotMarketDataHistory,
} from '../db/cot.js'

import {
  analyzeCmeIntelligence,
} from '../services/cmeIntelligence.js'

import {
  analyzeVol2Vol,
} from '../services/vol2vol.js'

import {
  analyzeCotIntelligence,
} from '../services/cotIntelligence.js'

import {
  buildHistoricalChanges,
} from '../services/institutional.js'

import {
  getMarketProvider,
} from '../providers/market/index.js'

import {
  getMarketBySymbol,
} from '../db/markets.js'

import {
  calculateMarketIntelligence,
} from '../services/market/intelligence.js'

import {
  getCachedMarketIntelligence,
} from '../services/market/intelligenceCache.js'

import {
  calculateIqtfDecision,
} from '../services/iqtfDecision.js'

export async function institutionalRoutes(
  app: FastifyInstance,
) {
  app.get(
    '/api/institutional/analysis',
    async (request, reply) => {
      const query =
        request.query as {
          symbol?: string
        }

      const symbol =
        query.symbol ?? 'GC'

      const cmeHistory =
        getCmeMarketDataHistory(
          symbol,
          100,
        )

      const cotHistory =
        getCotMarketDataHistory(
          symbol,
          100,
        )

      const latestCme =
        cmeHistory[0]

      const previousCme =
        cmeHistory[1]

      const latestCot =
        cotHistory[0]

      const previousCot =
        cotHistory[1]

      if (
        !latestCme ||
        latestCme.settlementPrice === undefined
      ) {
        return reply.code(404).send({
          error:
            'No CME market data available',
        })
      }

      if (!latestCot) {
        return reply.code(404).send({
          error:
            'No COT market data available',
        })
      }

      const cot =
        analyzeCotIntelligence({
          latest: latestCot,
          previous: previousCot,
        })

      const {
        historicalVolumeChanges,
        historicalOIChanges,
      } =
        buildHistoricalChanges(
          cmeHistory,
        )

      const cme =
        analyzeCmeIntelligence({
          price:
            latestCme.settlementPrice,

          previousPrice:
            previousCme?.settlementPrice,

          volume:
            latestCme.volume,

          previousVolume:
            previousCme?.volume,

          openInterest:
            latestCme.openInterest,

          previousOpenInterest:
            previousCme?.openInterest,

          historicalVolumeChanges,
          historicalOIChanges,
        })

      const vol2vol =
        analyzeVol2Vol({
          priceChange:
            cme.priceChange,

          volumeChange:
            cme.volumeChange,

          openInterestChange:
            cme.openInterestChange,

          volumeZscore:
            cme.volumeZscore,

          oiZscore:
            cme.oiZscore,

          positioning:
            cme.positioning,
        })

      const marketIntelligence =
        await getCachedMarketIntelligence(
          `${symbol}:1h:50`,
          async () => {
            const market =
              getMarketBySymbol(symbol)

            if (!market) {
              throw new Error(
                `Market symbol not found: ${symbol}`,
              )
            }

            const provider =
              getMarketProvider(
                market.provider ?? 'mock',
              )

            if (
              typeof provider.getHistory !==
              'function'
            ) {
              throw new Error(
                `Historical data is not supported for ${symbol}`,
              )
            }

            const candles =
              await provider.getHistory(
                symbol,
                {
                  interval: '1h',
                  outputsize: 50,
                },
              )

            return {
              intelligence:
                calculateMarketIntelligence(
                  candles,
                ),
              candleCount:
                candles.length,
            }
          },
        )


      /*
       * INSTITUTIONAL ALIGNMENT V3
       *
       * Institutional alignment uses CME + Vol2Vol + COT.
       * Market score is intentionally excluded.
       */

      const institutionalScore =
        cme.confirmationScore * 0.25 +
        (vol2vol.score / 100) * 0.25 +
        (cot.score / 3) * 0.15

      const institutionalAlignment =
        institutionalScore > 0.25
          ? 'BULLISH'
          : institutionalScore < -0.25
            ? 'BEARISH'
            : 'NEUTRAL'

      const marketAlignment =
        marketIntelligence.intelligence.score > 0.25
          ? 'BULLISH'
          : marketIntelligence.intelligence.score < -0.25
            ? 'BEARISH'
            : 'NEUTRAL'

      const signalConflict =
        marketAlignment !== 'NEUTRAL' &&
        institutionalAlignment !== 'NEUTRAL' &&
        marketAlignment !== institutionalAlignment

      const iqtfDecision =
        calculateIqtfDecision({
          marketScore:
            marketIntelligence.intelligence.score,

          cmeConfirmation:
            cme.confirmationScore,

          vol2volScore:
            vol2vol.score,

          marketSignal:
            marketIntelligence.intelligence.signal,

          marketStructure:
            marketIntelligence
              .intelligence
              .structure
              .direction,

          volatilityRegime:
            marketIntelligence
              .intelligence
              .volatilityRegime
              .regime,

          cmePositioning:
            cme.positioning,
            
            cotScore:
              cot.score,

            cotPositioning:
              cot.positioning,

          cmeOiConfirmation:
            cme.oiConfirmation,

          vol2volSignal:
            vol2vol.signal,
        })

      return {
        success: true,

        symbol,

        marketIntelligence:
          marketIntelligence.intelligence,

        iqtfDecision,

          summary: {
            decision: iqtfDecision.decision,
            confidence: iqtfDecision.confidence,
            riskState: iqtfDecision.riskState,
            compositeScore: iqtfDecision.compositeScore,

            marketAlignment,
            institutionalAlignment,
            institutionalScore,
            signalConflict,

components: iqtfDecision.components,
            reasons: iqtfDecision.reasons,
            warnings: iqtfDecision.warnings,
          },

        cme,

        vol2vol,

        cot: {
          intelligence: cot,
          latest: latestCot,
          previous: previousCot,
        },

        historyStats: {
          cmeRecords:
            cmeHistory.length,

          cotRecords:
            cotHistory.length,

          volumeChangeSamples:
            historicalVolumeChanges.length,

          oiChangeSamples:
            historicalOIChanges.length,
        },
      }
    },
  )
}
