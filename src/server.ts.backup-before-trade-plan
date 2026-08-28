import './db/database.js'

import Fastify from 'fastify'
import cors from '@fastify/cors'

import { marketRoutes } from './routes/market.js'
import { healthRoutes } from './routes/health.js'
import { userRoutes } from './routes/users.js'
import { systemRoutes } from './routes/system.js'
import { cmeRoutes } from './routes/cme.js'
import { cotRoutes } from './routes/cot.js'
import { institutionalRoutes } from './routes/institutional.js'

export function buildServer() {
  const app = Fastify({
    logger: true,
  })

  app.register(cors, {
    origin: true,
  })

  app.register(healthRoutes)
  app.register(systemRoutes)
  app.register(marketRoutes)
  app.register(cmeRoutes)
  app.register(cotRoutes)
  app.register(institutionalRoutes)
  app.register(userRoutes)

  return app
}
