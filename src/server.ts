import './db/database.js'
import { marketRoutes } from './routes/market.js'

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { healthRoutes } from './routes/health.js'

export function buildServer() {
  const app = Fastify({
    logger: true
  })

  app.register(cors, {
    origin: true
  })

  app.register(healthRoutes)
  app.register(marketRoutes)
  return app

}
