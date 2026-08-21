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

      const cot =
        analyzeCotIntelligence({
          latest: latestCot,
          previous: previousCot,
        })
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

      return {
        success: true,

        symbol,

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
