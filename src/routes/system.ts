import type { FastifyInstance } from 'fastify'
import os from 'node:os'
import fs from 'node:fs'

const startedAt = Date.now()

function testWritable(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true })

    const testFile = `${dir}/.iqtf-write-test-${process.pid}`

    fs.writeFileSync(testFile, 'ok')
    fs.unlinkSync(testFile)

    return true
  } catch {
    return false
  }
}

export async function systemRoutes(app: FastifyInstance) {
  app.get('/api/system/status', async () => {
    const memory = process.memoryUsage()
    const cpu = process.cpuUsage()

    const candidates = [
      process.env.DB_PATH
        ? { path: process.env.DB_PATH, source: 'DB_PATH' }
        : null,
      { path: '/data/iqtf.db', source: 'render-disk' },
      { path: '/tmp/iqtf.db', source: 'tmp' },
      {
        path: `${process.cwd()}/iqtf.db`,
        source: 'cwd',
      },
    ].filter(Boolean) as {
      path: string
      source: string
    }[]

    const filesystem = candidates.map((candidate) => {
      const dir = candidate.path.substring(
        0,
        candidate.path.lastIndexOf('/'),
      )

      return {
        ...candidate,
        directory: dir,
        writable: testWritable(dir),
        exists: fs.existsSync(candidate.path),
        size: fs.existsSync(candidate.path)
          ? fs.statSync(candidate.path).size
          : null,
      }
    })

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
        configuredPath: process.env.DB_PATH ?? null,
        filesystem,
      },

      timestamp: new Date().toISOString(),
    }
  })
}
