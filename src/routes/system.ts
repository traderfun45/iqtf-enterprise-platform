import type { FastifyInstance } from 'fastify'
import os from 'node:os'

const startedAt = Date.now()

export async function systemRoutes(app: FastifyInstance) {
  app.get('/api/system/status', async () => {
    const memory = process.memoryUsage()
    const cpu = process.cpuUsage()

    return {
      service: 'iqtf-enterprise',
      status: 'healthy',

      process: {
        pid: process.pid,
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt: new Date(startedAt).toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },

      memory: {
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
        externalBytes: memory.external,
        arrayBuffersBytes: memory.arrayBuffers
      },

      cpu: {
        userMicros: cpu.user,
        systemMicros: cpu.system
      },

      system: {
        hostname: os.hostname(),
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length,
        totalMemoryBytes: os.totalmem(),
        freeMemoryBytes: os.freemem()
      },

      services: {
        api: 'online',
        market: 'online',
        cache: 'enabled',
        watchdog: 'enabled'
      },

      timestamp: new Date().toISOString()
    }
  })
}
