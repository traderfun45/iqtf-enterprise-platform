import type { FastifyInstance } from 'fastify'

import {
  createTradePlan,
  deleteTradePlan,
  getLatestTradePlan,
  getTradePlanById,
  getTradePlanHistory,
  updateTradePlan,
  type TradeDirection,
  type TradePlanStatus,
} from '../db/tradePlan.js'

export async function tradePlanRoutes(app: FastifyInstance) {
  app.post('/api/trade-plan', async (request, reply) => {
    try {
      const body = request.body as any

      const plan = createTradePlan({
        symbol: String(body.symbol ?? 'GC'),
        direction: body.direction as TradeDirection,
        entryPrice: Number(body.entryPrice),
        stopLoss: Number(body.stopLoss),
        tp1: Number(body.tp1),
        tp2: Number(body.tp2),
        tp3: Number(body.tp3),
        status: body.status as TradePlanStatus | undefined,
        note: body.note ? String(body.note) : undefined,
        createdBy: body.createdBy
          ? String(body.createdBy)
          : undefined,
      })

      return reply.code(201).send({
        success: true,
        data: plan,
      })
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Failed to create trade plan',
      })
    }
  })

  app.get('/api/trade-plan/latest', async (request, reply) => {
    const query = request.query as { symbol?: string }
    const symbol = query.symbol ?? 'GC'

    const plan = getLatestTradePlan(symbol)

    if (!plan) {
      return reply.code(404).send({
        success: false,
        error: 'No trade plan available',
      })
    }

    return {
      success: true,
      data: plan,
    }
  })

  app.get('/api/trade-plan/history', async (request) => {
    const query = request.query as {
      symbol?: string
      limit?: string
    }

    const symbol = query.symbol ?? 'GC'
    const limit = Math.min(
      Math.max(Number(query.limit ?? 30), 1),
      100,
    )

    return {
      success: true,
      data: getTradePlanHistory(symbol, limit),
    }
  })

  app.get('/api/trade-plan/:id', async (request, reply) => {
    const params = request.params as { id: string }
    const id = Number(params.id)

    if (!Number.isInteger(id)) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid trade plan id',
      })
    }

    const plan = getTradePlanById(id)

    if (!plan) {
      return reply.code(404).send({
        success: false,
        error: 'Trade plan not found',
      })
    }

    return {
      success: true,
      data: plan,
    }
  })

  app.put('/api/trade-plan/:id', async (request, reply) => {
    try {
      const params = request.params as { id: string }
      const id = Number(params.id)

      if (!Number.isInteger(id)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid trade plan id',
        })
      }

      const body = request.body as any

      const plan = updateTradePlan(id, {
        symbol: body.symbol,
        direction: body.direction,
        entryPrice: body.entryPrice !== undefined
          ? Number(body.entryPrice)
          : undefined,
        stopLoss: body.stopLoss !== undefined
          ? Number(body.stopLoss)
          : undefined,
        tp1: body.tp1 !== undefined ? Number(body.tp1) : undefined,
        tp2: body.tp2 !== undefined ? Number(body.tp2) : undefined,
        tp3: body.tp3 !== undefined ? Number(body.tp3) : undefined,
        status: body.status,
        note: body.note,
      })

      return {
        success: true,
        data: plan,
      }
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Failed to update trade plan',
      })
    }
  })

  app.delete('/api/trade-plan/:id', async (request, reply) => {
    const params = request.params as { id: string }
    const id = Number(params.id)

    if (!Number.isInteger(id)) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid trade plan id',
      })
    }

    const deleted = deleteTradePlan(id)

    if (!deleted) {
      return reply.code(404).send({
        success: false,
        error: 'Trade plan not found',
      })
    }

    return {
      success: true,
    }
  })
}
