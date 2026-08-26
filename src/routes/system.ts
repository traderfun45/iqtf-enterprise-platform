import type { FastifyInstance } from 'fastify'
import os from 'node:os'
import fs from 'node:fs'
import { db } from '../db/database.js'

const startedAt = Date.now()

export async function systemRoutes(app: FastifyInstance) {
  app.get('/api/system/status', async () => {
    const memory = process.memoryUsage()
    const cpu = process.cpuUsage()

    const dbPath = process.env.DB_PATH ?? null

    const dbFileExists = (() => {
      try {
        return dbPath ? fs.existsSync(dbPath) : false
      } catch {
        return false
      }
    })()

    const dbFileSize = (() => {
      try {
        return dbPath ? fs.statSync(dbPath).size : null
      } catch {
        return null
      }
    })()

    const databaseConnected = (() => {
      try {
        db.prepare('SELECT 1').get()
        return true
      } catch {
        return false
      }
    })()

    const cmeCount = (() => {
      try {
        const row = db
          .prepare(`
            SELECT COUNT(*) AS count
            FROM cme_market_data
          `)
          .get() as { count: number }

        return Number(row.count)
      } catch {
        return null
      }
    })()

    return {
      service: 'iqtf-enterprise',
      status: 'healthy',

      process: {
        pid: process.pid,
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt: new Date(startedAt).toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },

      memory: {
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
        externalBytes: memory.external,
        arrayBuffersBytes: memory.arrayBuffers,
      },

      cpu: {
        userMicros: cpu.user,
        systemMicros: cpu.system,
      },

      system: {
        hostname: os.hostname(),
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length,
        totalMemoryBytes: os.totalmem(),
        freeMemoryBytes: os.freemem(),
      },

      services: {
        api: 'online',
        market: 'online',
        cache: 'enabled',
        watchdog: 'enabled',
      },

      database: {
        connected: databaseConnected,
        cmeCount,
        dbPath,
        dbFileExists,
        dbFileSize,
      },

      timestamp: new Date().toISOString(),
    }
  })
}
