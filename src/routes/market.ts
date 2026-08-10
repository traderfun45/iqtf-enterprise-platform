import type { FastifyInstance } from 'fastify'
import { getMarketProvider } from '../providers/market/index.js'

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
}
