import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'iqtf-api',
      version: '2.0.0-alpha.1',
      timestamp: new Date().toISOString()
    }
  })
}
