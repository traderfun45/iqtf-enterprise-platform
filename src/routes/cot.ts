import type { FastifyInstance } from 'fastify'

import {
  createCotMarketData,
  getLatestCotMarketData,
  getCotMarketDataHistory,
} from '../db/cot.js'

import {
  analyzeCotIntelligence,
} from '../services/cotIntelligence.js'

export async function cotRoutes(
  app: FastifyInstance,
) {

  // =========================================================
  // POST /api/cot
  // =========================================================

  app.post('/api/cot', async (request, reply) => {
    const body =
      request.body as any

    if (
      !body?.symbol ||
      !body?.reportDate
    ) {
      return reply.code(400).send({
        error:
          'symbol and reportDate are required',
      })
    }

    const data =
      createCotMarketData({
        symbol:
          body.symbol,

        reportDate:
          body.reportDate,

        openInterest:
          body.openInterest,

        producerLong:
          body.producerLong,

        producerShort:
          body.producerShort,

        swapDealerLong:
          body.swapDealerLong,

        swapDealerShort:
          body.swapDealerShort,

        managedMoneyLong:
          body.managedMoneyLong,

        managedMoneyShort:
          body.managedMoneyShort,

        otherReportablesLong:
          body.otherReportablesLong,

        otherReportablesShort:
          body.otherReportablesShort,

        source:
          body.source ??
          'CFTC',

        note:
          body.note,
      })

    return reply.code(201).send({
      success: true,
      data,
    })
  })

  // =========================================================
  // GET /api/cot/latest
  // =========================================================

  app.get(
    '/api/cot/latest',
    async (request) => {

      const query =
        request.query as {
          symbol?: string
        }

      const symbol =
        query.symbol ??
        'GC'

      return {
        success: true,

        data:
          getLatestCotMarketData(
            symbol,
          ),
      }
    },
  )

  // =========================================================
  // GET /api/cot/history
  // =========================================================

  app.get(
    '/api/cot/history',
    async (request) => {

      const query =
        request.query as {
          symbol?: string
          limit?: string
        }

      const symbol =
        query.symbol ??
        'GC'

      const limit =
        Math.min(
          Math.max(
            Number(
              query.limit ??
              30,
            ),
            1,
          ),
          100,
        )

      return {
        success: true,

        data:
          getCotMarketDataHistory(
            symbol,
            limit,
          ),
      }
    },
  )

  // =========================================================
  // GET /api/cot/analysis
  // =========================================================

  app.get(
    '/api/cot/analysis',
    async (request, reply) => {

      const query =
        request.query as {
          symbol?: string
        }

      const symbol =
        query.symbol ??
        'GC'

      const history =
        getCotMarketDataHistory(
          symbol,
          100,
        )

      const latest =
        history[0]

      const previous =
        history[1]

      if (!latest) {
        return reply.code(404).send({
          error:
            'No COT market data available',
        })
      }

      const intelligence =
        analyzeCotIntelligence({
          latest,
          previous,
        })

      return {
        success: true,

        symbol,

        data:
          latest,

        intelligence,

        historyStats: {
          records:
            history.length,
        },
      }
    },
  )
}
