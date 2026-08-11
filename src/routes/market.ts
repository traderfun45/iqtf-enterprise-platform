import type { FastifyInstance } from 'fastify'
import { getMarketProvider } from '../providers/market/index.js'
import {
  listMarkets,
  getMarketBySymbol,
  createMarket
} from '../db/markets.js'

const marketProvider = getMarketProvider()

export async function marketRoutes(app: FastifyInstance) {
  app.get('/api/market/status', async () => {
    return {
      status: 'ok',
      service: 'iqtf-market-api',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }
  })

  app.get('/api/market/quote', async (request) => {
    const { symbol = 'XAUUSD' } = request.query as {
      symbol?: string
    }

    return marketProvider.getQuote(symbol)
  })

  app.get('/api/markets', async () => {
    return {
      data: listMarkets()
    }
  })

  app.get('/api/markets/:symbol', async (request, reply) => {
    const { symbol } = request.params as {
      symbol: string
    }

    const market = getMarketBySymbol(symbol.toUpperCase())

    if (!market) {
      return reply.code(404).send({
        error: 'Market not found'
      })
    }

    return {
      data: market
    }
  })

  app.post('/api/markets', async (request, reply) => {
    const body = request.body as {
      symbol?: string
      name?: string | null
      provider?: string | null
    }

    if (!body.symbol || !body.symbol.trim()) {
      return reply.code(400).send({
        error: 'Symbol is required'
      })
    }

    const symbol = body.symbol.trim().toUpperCase()

    const existing = getMarketBySymbol(symbol)

    if (existing) {
      return reply.code(409).send({
        error: 'Market already exists'
      })
    }

    const market = createMarket(
      symbol,
      body.name ?? null,
      body.provider ?? null
    )

    return reply.code(201).send({
      data: market
    })
  })
}
