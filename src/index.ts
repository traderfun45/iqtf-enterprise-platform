import 'dotenv/config'
import { buildServer } from './server.js'

const app = buildServer()

const port = Number(process.env.API_PORT ?? 3000)
const host = process.env.API_HOST ?? '0.0.0.0'

async function start() {
  try {
    await app.listen({ port, host })
    console.log(`IQTF API running on http://${host}:${port}`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

start()
