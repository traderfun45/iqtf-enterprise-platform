import {
  analyzeCmeImageWithNvidia,
  analyzeCotImageWithNvidia,
} from './services/nvidiaVision.js'
import { parseCmeVol2Vol } from './services/cmeVol2VolParser.js'
import { normalizeCmeVision } from './services/cmeVisionNormalizer.js'
import { verifyPassword } from './services/password.js'
import { listMarkets, getMarketBySymbol } from './market/markets.js'
import { getMarketProvider } from './market/provider.js'
import { calculateMarketIntelligence } from './services/market/intelligence.js'
import { calculateExpectedMove } from './services/market/expectedMove.js'
import { calculateGoldBasis } from './services/market/goldBasis.js'
import { analyzeCmeIntelligence } from './services/cmeIntelligence.js'
import { analyzeVol2Vol } from './services/vol2vol.js'
import { analyzeCotIntelligence } from './services/cotIntelligence.js'
import { resolveVol2VolState } from './services/vol2volState.js'
import { buildHistoricalChanges } from './services/institutional.js'
import { calculateIqtfDecision } from './services/iqtfDecision.js'
import { getVol2VolState, saveVol2VolState } from './db/vol2volState.js'
import {
  normalizeCotDate,
  validateCotRecord,
} from './services/cotOcrValidator.js'

export interface Env {
  DB: D1Database
  TWELVEDATA_API_KEY?: string
  NVIDIA_API_KEY?: string
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': 'https://iqtf-enterprise-dashboard.traderfun45.workers.dev',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

function calculateZScore(
  value: number,
  history: number[],
): number {
  // Not enough historical observations
  // to produce a reliable Z-score.
  if (history.length < 3) {
    return 0
  }

  const mean =
    history.reduce((sum, x) => sum + x, 0) /
    history.length

  const variance =
    history.reduce(
      (sum, x) =>
        sum + Math.pow(x - mean, 2),
      0,
    ) / history.length

  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) {
    return 0
  }

  return (value - mean) / stdDev
}



type CmePositioning =
  | 'LONG_BUILDUP'
  | 'SHORT_BUILDUP'
  | 'SHORT_COVERING'
  | 'LONG_LIQUIDATION'
  | 'NEUTRAL'

type CmeConfirmation =
  | 'STRONG'
  | 'MODERATE'
  | 'WEAK'
  | 'NEUTRAL'
  | 'INSUFFICIENT_DATA'

function cmePercentChange(current: number, previous: number): number {
  if (!Number.isFinite(previous) || previous === 0) return 0
  return ((current - previous) / previous) * 100
}

function cmeStrength(z: number | null): CmeConfirmation {
  if (z === null) return 'INSUFFICIENT_DATA'

  const abs = Math.abs(z)

  if (abs >= 2) return 'STRONG'
  if (abs >= 1) return 'MODERATE'
  if (abs > 0.25) return 'WEAK'
  return 'NEUTRAL'
}

function cmeZScore(
  value: number,
  history: number[],
): number | null {
  const clean = history.filter((x) => Number.isFinite(x))

  if (clean.length < 3) return null

  const mean =
    clean.reduce((sum, x) => sum + x, 0) / clean.length

  const variance =
    clean.reduce(
      (sum, x) => sum + Math.pow(x - mean, 2),
      0,
    ) / clean.length

  const std = Math.sqrt(variance)

  if (std === 0) return 0

  return (value - mean) / std
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin':
            'https://iqtf-enterprise-dashboard.traderfun45.workers.dev',
          'Access-Control-Allow-Methods':
            'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers':
            'Content-Type, Authorization',
        },
      })
    }

    // =========================================================
    // GET /health
    // =========================================================
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({
        status: 'ok',
        service: 'iqtf-cloudflare-api',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      })
    }


    // =========================================================
    // GET /api/system/status
    if (url.pathname === '/api/system/status' && request.method === 'GET') {
      return json({
        service: 'iqtf-cloudflare-api',
        status: 'healthy',
        process: {
          pid: 0,
          uptimeSeconds: 0,
          startedAt: new Date().toISOString(),
          nodeVersion: 'cloudflare-workers',
          platform: 'cloudflare',
          arch: 'edge',
        },
        memory: {
          rssBytes: 0,
          heapUsedBytes: 0,
          heapTotalBytes: 0,
          externalBytes: 0,
          arrayBuffersBytes: 0,
        },
        cpu: {
          userMicros: 0,
          systemMicros: 0,
        },
        system: {
          hostname: 'cloudflare-worker',
          loadAverage: [],
          cpuCount: 0,
          totalMemoryBytes: 0,
          freeMemoryBytes: 0,
        },
        services: {
          api: 'healthy',
          market: 'healthy',
          cache: 'healthy',
          watchdog: 'healthy',
        },
        timestamp: new Date().toISOString(),
      })
    }

    // GET /api/markets
    // List supported markets
    // =========================================================
    if (url.pathname === '/api/markets' && request.method === 'GET') {
      try {
        const markets = await listMarkets(env.DB)

        return json({
          success: true,
          markets,
        })
      } catch (error) {
        return json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load markets',
          },
          500,
        )
      }
    }

    // =========================================================
    // GET /api/markets/:symbol
    // Get one market
    // =========================================================
    if (
      url.pathname.startsWith('/api/markets/') &&
      request.method === 'GET'
    ) {
      try {
        const symbol = url.pathname.split('/').pop() || ''
        const market = await getMarketBySymbol(env.DB, symbol)

        if (!market) {
          return json(
            {
              success: false,
              error: 'Market not found',
              symbol: symbol.toUpperCase(),
            },
            404,
          )
        }

        return json({
          success: true,
          market,
        })
      } catch (error) {
        return json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load market',
          },
          500,
        )
      }
    }

    // =========================================================
    // =========================================================
    // GET /api/market/snapshot
    if (url.pathname === '/api/market/snapshot' && request.method === 'GET') {
      try {
        const markets = await listMarkets(env.DB)
        const quotes = await Promise.all(
          markets.map(async (market) => {
            const provider = getMarketProvider(market.provider, env)
            return provider.getQuote(market.symbol)
          }),
        )

        return json({
          data: quotes,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        return json(
          {
            success: false,
            error: error instanceof Error
              ? error.message
              : 'Failed to load market snapshot',
          },
          500,
        )
      }
    }

    // GET /api/market/intelligence?symbol=XAUUSD&interval=1h&outputsize=50
    // Calculate market intelligence from historical candles
    // =========================================================
    if (url.pathname === '/api/market/intelligence' && request.method === 'GET') {
      try {
        const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase()
        const interval = url.searchParams.get('interval') || '1h'
        const rawOutputsize = url.searchParams.get('outputsize')
        const outputsize = rawOutputsize ? Number(rawOutputsize) : 50

        if (!symbol) {
          return json(
            { success: false, error: 'symbol query parameter is required' },
            400,
          )
        }

        if (!Number.isInteger(outputsize) || outputsize < 2) {
          return json(
            { success: false, error: 'outputsize must be an integer >= 2' },
            400,
          )
        }

        const market = await getMarketBySymbol(env.DB, symbol)

        if (!market) {
          return json(
            { success: false, error: 'Market not found', symbol },
            404,
          )
        }

        const provider = getMarketProvider(market.provider, env)

        if (typeof provider.getHistory !== 'function') {
          return json(
            {
              success: false,
              error: 'Historical data is not supported by this provider',
              symbol,
              provider: market.provider ?? 'unknown',
            },
            501,
          )
        }

        const candles = await provider.getHistory(symbol, {
          interval,
          outputsize,
        })

        if (candles.length === 0) {
          return json(
            { success: false, error: 'No historical market data available', symbol },
            404,
          )
        }

        const intelligence = calculateMarketIntelligence(candles)

        return json({
          ...intelligence,
          interval,
          candleCount: candles.length,
        })
      } catch (error) {
        return json(
          {
            success: false,
            error: 'Market intelligence unavailable',
            message: error instanceof Error ? error.message : 'Market intelligence error',
          },
          502,
        )
      }
    }

    // GET /api/market/expected-move?symbol=GC
    // Calculate Yahoo GC=F Expected Move for 1H / 4H / D
    // =========================================================
    if (
      url.pathname === '/api/market/expected-move' &&
      request.method === 'GET'
    ) {
      try {
        const symbol = (url.searchParams.get('symbol') || 'GC')
          .trim()
          .toUpperCase()

        if (symbol !== 'GC') {
          return json(
            {
              success: false,
              error: 'Expected Move currently supports GC only',
              symbol,
            },
            400,
          )
        }

        const market = await getMarketBySymbol(env.DB, symbol)

        if (!market) {
          return json(
            {
              success: false,
              error: 'Market not found',
              symbol,
            },
            404,
          )
        }

        const provider = getMarketProvider(market.provider, env)

        if (typeof provider.getHistory !== 'function') {
          return json(
            {
              success: false,
              error: 'Historical data is not supported by this provider',
              symbol,
              provider: market.provider ?? 'unknown',
            },
            501,
          )
        }

        const quote = await provider.getQuote(symbol)

        if (
          !Number.isFinite(quote.price) ||
          quote.price <= 0
        ) {
          return json(
            {
              success: false,
              error: 'Invalid current GC quote',
              symbol,
            },
            502,
          )
        }

        const candles = await provider.getHistory(symbol, {
          interval: '1h',
          outputsize: 200,
        })

        if (candles.length < 15) {
          return json(
            {
              success: false,
              error: 'Insufficient GC historical data',
              symbol,
              candleCount: candles.length,
            },
            502,
          )
        }

        const oneHour = calculateExpectedMove(
          candles,
          '1H',
          undefined,
          quote.price,
        )

        const fourHour = calculateExpectedMove(
          candles,
          '4H',
          undefined,
          quote.price,
        )

        const dailyCandles = await provider.getHistory(symbol, {
          interval: '1d',
          outputsize: 100,
        })

        if (dailyCandles.length < 15) {
          return json(
            {
              success: false,
              error: 'Insufficient GC daily historical data',
              symbol,
              candleCount: dailyCandles.length,
            },
            502,
          )
        }

        const daily = calculateExpectedMove(
          dailyCandles,
          'D',
          undefined,
          quote.price,
        )

        return json({
          success: true,
          symbol,
          source: 'yahoo',
          data: {
            '1H': oneHour,
            '4H': fourHour,
            D: daily,
          },
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        return json(
          {
            success: false,
            error: 'Expected Move unavailable',
        message:
          error instanceof Error
            ? error.message
            : 'Expected Move calculation error',
      },
      502,
    )
  }
}

    // =========================================================
    // GET /api/market/expected-move-xauusd
    // GC volatility + XAUUSD spot price anchor
    // =========================================================
    if (
      url.pathname === '/api/market/expected-move-xauusd' &&
      request.method === 'GET'
    ) {
      try {
        const spotMarket = await getMarketBySymbol(
          env.DB,
          'XAUUSD',
        )

        const futuresMarket = await getMarketBySymbol(
          env.DB,
          'GC',
        )

        if (!spotMarket || !futuresMarket) {
          return json(
            {
              success: false,
              error: 'Gold markets not found',
              spot: 'XAUUSD',
              futures: 'GC',
            },
            404,
          )
        }

        const spotProvider = getMarketProvider(
          spotMarket.provider,
          env,
        )

        const futuresProvider = getMarketProvider(
          futuresMarket.provider,
          env,
        )

        if (
          typeof futuresProvider.getHistory !== 'function'
        ) {
          return json(
            {
              success: false,
              error: 'GC historical data is not supported',
            },
            501,
          )
        }

        const [spotQuote, futuresQuote, hourlyCandles, dailyCandles] =
          await Promise.all([
            spotProvider.getQuote('XAUUSD'),
            futuresProvider.getQuote('GC'),
            futuresProvider.getHistory('GC', {
              interval: '1h',
              outputsize: 200,
            }),
            futuresProvider.getHistory('GC', {
              interval: '1d',
              outputsize: 100,
            }),
          ])

        if (
          !Number.isFinite(spotQuote.price) ||
          spotQuote.price <= 0
        ) {
          return json(
            {
              success: false,
              error: 'Invalid current XAUUSD quote',
            },
            502,
          )
        }

        if (
          !Number.isFinite(futuresQuote.price) ||
          futuresQuote.price <= 0
        ) {
          return json(
            {
              success: false,
              error: 'Invalid current GC quote',
            },
            502,
          )
        }

        if (hourlyCandles.length < 15) {
          return json(
            {
              success: false,
              error: 'Insufficient GC hourly historical data',
              candleCount: hourlyCandles.length,
            },
            502,
          )
        }

        if (dailyCandles.length < 15) {
          return json(
            {
              success: false,
              error: 'Insufficient GC daily historical data',
              candleCount: dailyCandles.length,
            },
            502,
          )
        }

        const basis = calculateGoldBasis(
          spotQuote.price,
          futuresQuote.price,
        )

        const oneHour = calculateExpectedMove(
          hourlyCandles,
          '1H',
          undefined,
          spotQuote.price,
        )

        const fourHour = calculateExpectedMove(
          hourlyCandles,
          '4H',
          undefined,
          spotQuote.price,
        )

        const daily = calculateExpectedMove(
          dailyCandles,
          'D',
          undefined,
          spotQuote.price,
        )

        return json({
          success: true,
          symbol: 'XAUUSD',
          anchor: {
            symbol: 'XAUUSD',
            price: spotQuote.price,
            source: spotQuote.source,
          },
          volatilitySource: {
            symbol: 'GC',
            price: futuresQuote.price,
            source: futuresQuote.source,
          },
          basis,
          data: {
            '1H': oneHour,
            '4H': fourHour,
            D: daily,
          },
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        return json(
          {
            success: false,
            error: 'XAUUSD Expected Move unavailable',
            message:
              error instanceof Error
                ? error.message
                : 'XAUUSD Expected Move calculation error',
          },
          502,
        )
      }
    }

    // =========================================================
    // GET /api/market/gold-basis
    // Compare XAUUSD Spot vs GC Futures
    // =========================================================
    if (
      url.pathname === '/api/market/gold-basis' &&
      request.method === 'GET'
    ) {
      try {
        const spotMarket = await getMarketBySymbol(env.DB, 'XAUUSD')
        const futuresMarket = await getMarketBySymbol(env.DB, 'GC')

        if (!spotMarket || !futuresMarket) {
          return json(
            {
              success: false,
              error: 'Gold markets not found',
              spot: 'XAUUSD',
              futures: 'GC',
            },
            404,
          )
        }

        const spotProvider = getMarketProvider(
          spotMarket.provider,
          env,
        )

        const futuresProvider = getMarketProvider(
          futuresMarket.provider,
          env,
        )

        const [spotQuote, futuresQuote] = await Promise.all([
          spotProvider.getQuote('XAUUSD'),
          futuresProvider.getQuote('GC'),
        ])

        const basis = calculateGoldBasis(
          spotQuote.price,
          futuresQuote.price,
        )

        return json({
          success: true,
          source: {
            spot: spotQuote.source,
            futures: futuresQuote.source,
          },
          data: basis,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        return json(
          {
            success: false,
            error: 'Gold Basis unavailable',
            message:
              error instanceof Error
                ? error.message
                : 'Gold Basis calculation error',
          },
          502,
        )
      }
    }

    // =========================================================

// GET /api/market/quote?symbol=XAUUSD
    // Get current market quote through the configured provider
    // =========================================================
    if (url.pathname === '/api/market/quote' && request.method === 'GET') {
      try {
        const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase()

        if (!symbol) {
          return json(
            {
              success: false,
              error: 'symbol query parameter is required',
            },
            400,
          )
        }

        const market = await getMarketBySymbol(env.DB, symbol)

        if (!market) {
          return json(
            {
              success: false,
              error: 'Market not found',
              symbol,
            },
            404,
          )
        }

        const provider = getMarketProvider(market.provider, env)
        const quote = await provider.getQuote(market.symbol)

        return json({
          success: true,
          market,
          quote,
        })
      } catch (error) {
        return json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load market quote',
          },
          500,
        )
      }
    }

    // GET /api/cme/nvidia-test
    // NVIDIA connectivity diagnostic
    // =========================================================
    if (
      url.pathname === '/api/cme/nvidia-test' &&
      request.method === 'GET'
    ) {
      if (!env.NVIDIA_API_KEY) {
        return json(
          {
            success: false,
            error: 'NVIDIA_API_KEY is not configured',
          },
          500,
        )
      }

      const startedAt = Date.now()

      try {
        console.log('[NVIDIA TEST] FETCH START')

        const controller = new AbortController()
        const timeout = setTimeout(
          () => controller.abort(),
          30_000,
        )

        let response: Response

        try {
          response = await fetch(
            'https://integrate.api.nvidia.com/v1/models',
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
              },
              signal: controller.signal,
            },
          )
        } finally {
          clearTimeout(timeout)
        }

        const text = await response.text()

        console.log('[NVIDIA TEST] FETCH RESPONSE', {
          status: response.status,
          elapsedMs: Date.now() - startedAt,
        })

        return json({
          success: response.ok,
          status: response.status,
          elapsedMs: Date.now() - startedAt,
          body: text.slice(0, 2000),
        })
      } catch (error) {
        const elapsedMs = Date.now() - startedAt

        console.error('[NVIDIA TEST] ERROR', {
          elapsedMs,
          error,
        })

        return json(
          {
            success: false,
            elapsedMs,
            error:
              error instanceof Error
                ? `${error.name}: ${error.message}`
                : String(error),
          },
          500,
        )
      }
    }

    // =========================================================
    // POST /api/cme/nvidia-vision-test
// NVIDIA tiny-image diagnostic
if (
  url.pathname === '/api/cme/nvidia-vision-test' &&
  request.method === 'POST'
) {
  if (!env.NVIDIA_API_KEY) {
    return json(
      {
        success: false,
        error: 'NVIDIA_API_KEY is not configured',
      },
      500,
    )
  }

  const startedAt = Date.now()

  // 1x1 transparent PNG
  const tinyImageBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

  try {
    console.log('[NVIDIA TINY IMAGE TEST] START')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60_000)

    let response: Response

    try {
      response = await fetch(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'meta/llama-3.2-11b-vision-instruct',
            temperature: 0,
            max_tokens: 100,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Reply with exactly: TINY IMAGE TEST OK',
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/png;base64,${tinyImageBase64}`,
                    },
                  },
                ],
              },
            ],
          }),
          signal: controller.signal,
        },
      )
    } finally {
      clearTimeout(timeout)
    }

    const text = await response.text()
    const elapsedMs = Date.now() - startedAt

    console.log('[NVIDIA TINY IMAGE TEST] RESPONSE', {
      status: response.status,
      elapsedMs,
      responseLength: text.length,
    })

    return json({
      success: response.ok,
      status: response.status,
      elapsedMs,
      responseLength: text.length,
      body: text.slice(0, 3000),
    })
  } catch (error) {
    const elapsedMs = Date.now() - startedAt

    console.error('[NVIDIA TINY IMAGE TEST] ERROR', {
      elapsedMs,
      error,
    })

    return json(
      {
        success: false,
        elapsedMs,
        error:
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error),
      },
      500,
    )
  }
}

    // =========================================================
    if (
      url.pathname === '/api/cme/nvidia-vision-test' &&
      request.method === 'POST'
    ) {
      if (!env.NVIDIA_API_KEY) {
        return json(
          {
            success: false,
            error: 'NVIDIA_API_KEY is not configured',
          },
          500,
        )
      }

      const startedAt = Date.now()

      try {
        const body = (await request.json()) as {
          image?: string
        }

        if (!body.image) {
          return json(
            {
              success: false,
              error: 'image is required',
            },
            400,
          )
        }

        const cleanBase64 = body.image.replace(
          /^data:image\/[^;]+;base64,/,
          '',
        )

        console.log('[NVIDIA VISION TEST] START', {
          imageBase64Length: cleanBase64.length,
        })

        const controller = new AbortController()
        const timeout = setTimeout(
          () => controller.abort(),
          60_000,
        )

        let response: Response

        try {
          response = await fetch(
            'https://integrate.api.nvidia.com/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'meta/llama-3.2-11b-vision-instruct',
                temperature: 0,
                max_tokens: 500,
                messages: [
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: 'Read this image. Return a very short description of what is visible.',
                      },
                      {
                        type: 'image_url',
                        image_url: {
                          url: `data:image/jpeg;base64,${cleanBase64}`,
                        },
                      },
                    ],
                  },
                ],
              }),
              signal: controller.signal,
            },
          )
        } finally {
          clearTimeout(timeout)
        }

        const text = await response.text()

        const elapsedMs = Date.now() - startedAt

        console.log('[NVIDIA VISION TEST] RESPONSE', {
          status: response.status,
          elapsedMs,
          responseLength: text.length,
        })

        return json({
          success: response.ok,
          status: response.status,
          elapsedMs,
          responseLength: text.length,
          body: text.slice(0, 3000),
        })
      } catch (error) {
        const elapsedMs = Date.now() - startedAt

        console.error('[NVIDIA VISION TEST] ERROR', {
          elapsedMs,
          error,
        })

        return json(
          {
            success: false,
            elapsedMs,
            error:
              error instanceof Error
                ? `${error.name}: ${error.message}`
                : String(error),
          },
          500,
        )
      }
    }

    // =========================================================
    // POST /api/cme/ocr
    // NVIDIA Vision -> CME Vol2Vol Parser -> Normalizer
    // =========================================================
    if (
      url.pathname === '/api/cme/ocr' &&
      request.method === 'POST'
    ) {
      try {
        const body = (await request.json()) as {
          image?: string
        }

        if (!body.image) {
          return json(
            {
              success: false,
              error: 'image is required',
            },
            400,
          )
        }

        if (!env.NVIDIA_API_KEY) {
          return json(
            {
              success: false,
              error: 'NVIDIA_API_KEY is not configured',
            },
            500,
          )
        }

        console.log('CME OCR: NVIDIA Vision started')

        const visionResult =
          await analyzeCmeImageWithNvidia(
            body.image,
            env.NVIDIA_API_KEY,
          )

        console.log(
          'CME RAW VISION:',
          JSON.stringify(
            visionResult,
            null,
            2,
          ),
        )

        const parsedVol2Vol =
          parseCmeVol2Vol(
            visionResult.raw_text ?? '',
          )

        console.log(
          'CME PARSED VOL2VOL:',
          JSON.stringify(
            parsedVol2Vol,
            null,
            2,
          ),
        )

        const normalizedResult =
          normalizeCmeVision({
            ...visionResult,

            underlying_futures: [
              {
                symbol: 'GC',
                settlement:
                  parsedVol2Vol.futureSettlement,
                price:
                  parsedVol2Vol.futureSettlement,
              },
            ],

            volatility_settlement:
              parsedVol2Vol.volatilitySettlement,

            expectedRange: visionResult.expected_range ?? parsedVol2Vol.expectedRange,

            call_volume:
              parsedVol2Vol.callVolume,

            put_volume:
              parsedVol2Vol.putVolume,
    volume: parsedVol2Vol.volume,
    volumeZscore: parsedVol2Vol.volumeZscore,
    openInterest: parsedVol2Vol.openInterest,
    oiChange: parsedVol2Vol.oiChange,
    oiZscore: parsedVol2Vol.oiZscore,

          })

        console.log(
          'CME NORMALIZED:',
          JSON.stringify(
            normalizedResult,
            null,
            2,
          ),
        )

        return json({
          success: true,
          data: normalizedResult,
          rawVision: visionResult,
          parsedVol2Vol,
        })
      } catch (error) {
        console.error(
          'POST /api/cme/ocr error:',
          error,
        )

        return json(
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'CME OCR failed',
          },
          500,
        )
      }
    }

    // =========================================================
    // GET /api/cme/latest
    // =========================================================
    if (
      url.pathname === '/api/cme/latest' &&
      request.method === 'GET'
    ) {
      const symbol = url.searchParams.get('symbol') || 'GC'

      const result = await env.DB.prepare(`
        SELECT *
        FROM cme_market_data
        WHERE symbol = ?
        ORDER BY data_date DESC, data_time DESC, id DESC
        LIMIT 1
      `)
        .bind(symbol)
        .first()

      return json({
        success: true,
        data: result ?? null,
      })
    }

    // =========================================================
    // GET /api/cme/history
    // =========================================================
    if (
      url.pathname === '/api/cme/history' &&
      request.method === 'GET'
    ) {
      const symbol = url.searchParams.get('symbol') || 'GC'

      const limitParam = Number(
        url.searchParams.get('limit') || '30',
      )

      const limit = Math.min(
        Math.max(
          Number.isFinite(limitParam) ? limitParam : 30,
          1,
        ),
        100,
      )

      const result = await env.DB.prepare(`
        SELECT *
        FROM cme_market_data
        WHERE symbol = ?
        ORDER BY data_date DESC, data_time DESC, id DESC
        LIMIT ?
      `)
        .bind(symbol, limit)
        .all()

      return json({
        success: true,
        symbol,
        count: result.results.length,
        data: result.results,
      })
    }

    // =========================================================
    // GET /api/cme/duplicates
    // =========================================================
    if (
      url.pathname === '/api/cme/duplicates' &&
      request.method === 'GET'
    ) {
      const symbol = url.searchParams.get('symbol') || 'GC'

      const result = await env.DB.prepare(`
        SELECT
          symbol,
          data_date,
          data_time,
          COUNT(*) AS count
        FROM cme_market_data
        WHERE symbol = ?
        GROUP BY symbol, data_date, data_time
        HAVING COUNT(*) > 1
        ORDER BY data_date DESC, data_time DESC
      `)
        .bind(symbol)
        .all()

      return json({
        success: true,
        symbol,
        count: result.results.length,
        data: result.results,
      })
    }

    // =========================================================
    // POST /api/cme
    // =========================================================
    if (
      url.pathname === '/api/cme' &&
      request.method === 'POST'
    ) {
      try {
        const body = await request.json() as {
          symbol?: string
          dataDate?: string
          dataTime?: string
          settlementPrice?: number
          volume?: number
          volumeZscore?: number
          openInterest?: number
          oiChange?: number
          oiZscore?: number
          source?: string
          note?: string
          createdBy?: string
          inputMethod?: string
          imageReference?: string
        }

        if (!body.symbol || !body.dataDate) {
          return json(
            {
              success: false,
              error: 'symbol and dataDate are required',
            },
            400,
          )
        }

        const result = await env.DB.prepare(`
          INSERT INTO cme_market_data (
            symbol,
            data_date,
            data_time,
            settlement_price,
            volume,
            volume_zscore,
            open_interest,
            oi_change,
            oi_zscore,
            source,
            note,
            created_by,
            input_method,
            image_reference
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `)
          .bind(
            body.symbol,
            body.dataDate,
            body.dataTime ?? null,
            body.settlementPrice ?? null,
            body.volume ?? null,
            body.volumeZscore ?? null,
            body.openInterest ?? null,
            body.oiChange ?? null,
            body.oiZscore ?? null,
            body.source ?? 'CME',
            body.note ?? null,
            body.createdBy ?? null,
            body.inputMethod ?? 'MANUAL',
            body.imageReference ?? null,
          )
          .first()

        return json(
          {
            success: true,
            data: result,
          },
          201,
        )
      } catch (error) {
        console.error('POST /api/cme error:', error)

        return json(
          {
            success: false,
            error: 'Failed to insert CME data',
          },
          500,
        )
      }
    }

    // =========================================================
    // POST /api/cme/recalculate
    // =========================================================
    if (
      url.pathname === '/api/cme/recalculate' &&
      request.method === 'POST'
    ) {
      try {
        const symbol = url.searchParams.get('symbol') || 'GC'

        const rows = await env.DB.prepare(`
          SELECT
            id,
            volume,
            open_interest
          FROM cme_market_data
          WHERE symbol = ?
          ORDER BY data_date ASC, data_time ASC, id ASC
        `)
          .bind(symbol)
          .all()

        let previousVolume: number | null = null
        let previousOI: number | null = null

        const volumeChanges: number[] = []
        const oiChanges: number[] = []

        const updates: Promise<unknown>[] = []

        for (const row of rows.results as Array<{
          id: number
          volume: number | null
          open_interest: number | null
        }>) {
          let volumeChange: number | null = null
          let oiChange: number | null = null

          if (
            row.volume != null &&
            previousVolume != null
          ) {
            volumeChange =
              Number(row.volume) - previousVolume

            volumeChanges.push(volumeChange)
          }

          if (
            row.open_interest != null &&
            previousOI != null
          ) {
            oiChange =
              Number(row.open_interest) - previousOI

            oiChanges.push(oiChange)
          }

          const volumeHistory =
            volumeChange != null
              ? volumeChanges.slice(0, -1)
              : []

          const oiHistory =
            oiChange != null
              ? oiChanges.slice(0, -1)
              : []

          const volumeZscore =
            volumeChange != null
              ? calculateZScore(
                  volumeChange,
                  volumeHistory,
                )
              : null

          const oiZscore =
            oiChange != null
              ? calculateZScore(
                  oiChange,
                  oiHistory,
                )
              : null

          updates.push(
            env.DB.prepare(`
              UPDATE cme_market_data
              SET
                oi_change = ?,
                volume_zscore = ?,
                oi_zscore = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `)
              .bind(
                oiChange,
                volumeZscore,
                oiZscore,
                row.id,
              )
              .run(),
          )

          if (row.volume != null) {
            previousVolume = Number(row.volume)
          }

          if (row.open_interest != null) {
            previousOI = Number(row.open_interest)
          }
        }

        await Promise.all(updates)

        return json({
          success: true,
          symbol,
          count: rows.results.length,
        })
      } catch (error) {
        console.error(
          'POST /api/cme/recalculate error:',
          error,
        )

        return json(
          {
            success: false,
            error: 'Failed to recalculate CME data',
          },
          500,
        )
      }
    }

    // =========================================================
    // GET /api/cme/schema
    // =========================================================
    if (
      url.pathname === '/api/cme/schema' &&
      request.method === 'GET'
    ) {
      try {
        const result = await env.DB.prepare(`
          SELECT
            name,
            type,
            sql
          FROM sqlite_master
          WHERE type IN ('table', 'index')
            AND name LIKE 'cme_market_data%'
          ORDER BY type, name
        `).all()

        return json({
          success: true,
          data: result.results,
        })
      } catch (error) {
        console.error('GET /api/cme/schema error:', error)

        return json(
          {
            success: false,
            error: 'Failed to read CME schema',
          },
          500,
        )
      }
    }


    // =========================================================
    // GET /api/cme/intelligence
    // =========================================================
    if (
      url.pathname === '/api/cme/intelligence' &&
      request.method === 'GET'
    ) {
      try {
        const symbol = url.searchParams.get('symbol') || 'GC'

        const result = await env.DB.prepare(`
          SELECT
            id,
            symbol,
            data_date,
            data_time,
            settlement_price,
            volume,
            open_interest,
            oi_change,
            volume_zscore,
            oi_zscore
          FROM cme_market_data
          WHERE symbol = ?
          ORDER BY data_date DESC, data_time DESC, id DESC
          LIMIT 30
        `)
          .bind(symbol)
          .all()

        const rows = result.results as Array<{
          id: number
          symbol: string
          data_date: string
          data_time: string | null
          settlement_price: number | null
          volume: number | null
          open_interest: number | null
          oi_change: number | null
          volume_zscore: number | null
          oi_zscore: number | null
        }>

        if (rows.length < 2) {
          return json({
            success: true,
            symbol,
            data: {
              positioning: 'NEUTRAL',
              volumeConfirmation: 'INSUFFICIENT_DATA',
              oiConfirmation: 'INSUFFICIENT_DATA',
              confirmationScore: 0,
              dataPoints: rows.length,
            },
          })
        }

        const current = rows[0]
        const previous = rows[1]

        const price = Number(current.settlement_price ?? 0)
        const previousPrice = Number(previous.settlement_price ?? price)

        const volume = Number(current.volume ?? 0)
        const previousVolume = Number(previous.volume ?? volume)

        const oi = Number(current.open_interest ?? 0)
        const previousOI = Number(previous.open_interest ?? oi)

        const priceChange = price - previousPrice
        const priceChangePercent =
          cmePercentChange(price, previousPrice)

        const volumeChange = volume - previousVolume
        const volumeChangePercent =
          cmePercentChange(volume, previousVolume)

        const oiChange = oi - previousOI
        const oiChangePercent =
          cmePercentChange(oi, previousOI)

        const volumeChanges: number[] = []
        const oiChanges: number[] = []

        for (let i = 1; i < rows.length; i++) {
          const currentRow = rows[i - 1]
          const previousRow = rows[i]

          if (
            currentRow.volume != null &&
            previousRow.volume != null
          ) {
            volumeChanges.push(
              Number(currentRow.volume) -
                Number(previousRow.volume),
            )
          }

          if (
            currentRow.open_interest != null &&
            previousRow.open_interest != null
          ) {
            oiChanges.push(
              Number(currentRow.open_interest) -
                Number(previousRow.open_interest),
            )
          }
        }

        const volumeZ =
          current.volume_zscore != null
            ? Number(current.volume_zscore)
            : cmeZScore(volumeChange, volumeChanges)

        const oiZ =
          current.oi_zscore != null
            ? Number(current.oi_zscore)
            : cmeZScore(oiChange, oiChanges)

        let positioning: CmePositioning = 'NEUTRAL'

        if (priceChange > 0 && oiChange > 0) {
          positioning = 'LONG_BUILDUP'
        } else if (priceChange < 0 && oiChange > 0) {
          positioning = 'SHORT_BUILDUP'
        } else if (priceChange > 0 && oiChange < 0) {
          positioning = 'SHORT_COVERING'
        } else if (priceChange < 0 && oiChange < 0) {
          positioning = 'LONG_LIQUIDATION'
        }

        const volumeConfirmation = cmeStrength(volumeZ)
        const oiConfirmation = cmeStrength(oiZ)

        const priceSignal =
          priceChange > 0 ? 1 : priceChange < 0 ? -1 : 0

        const oiSignal =
          oiChange > 0 ? 1 : oiChange < 0 ? -1 : 0

        const volumeSignal =
          volumeChange > 0 ? 1 : volumeChange < 0 ? -1 : 0

        const confirmationScore = Math.max(
          -1,
          Math.min(
            1,
            priceSignal * 0.4 +
              oiSignal * 0.35 +
              volumeSignal * 0.25,
          ),
        )

        return json({
          success: true,
          symbol,
          data: {
            current: {
              id: current.id,
              dataDate: current.data_date,
              dataTime: current.data_time,
            },
            price,
            previousPrice,
            priceChange,
            priceChangePercent,
            volume,
            previousVolume,
            volumeChange,
            volumeChangePercent,
            openInterest: oi,
            previousOpenInterest: previousOI,
            openInterestChange: oiChange,
            openInterestChangePercent: oiChangePercent,
            volumeZscore: volumeZ,
            oiZscore: oiZ,
            positioning,
            volumeConfirmation,
            oiConfirmation,
            confirmationScore,
            dataPoints: rows.length,
          },
        })
      } catch (error) {
        console.error(
          'GET /api/cme/intelligence error:',
          error,
        )

        return json(
          {
            success: false,
            error: 'Failed to calculate CME intelligence',
          },
          500,
        )
      }
    }


    // =========================================================
    // GET /api/cme/analysis
    // =========================================================
    if (
      url.pathname === '/api/cme/analysis' &&
      request.method === 'GET'
    ) {
      try {
        const symbol = (url.searchParams.get('symbol') || 'GC').toUpperCase()

        const result = await env.DB.prepare(`
          SELECT id, symbol, data_date, data_time,
                 settlement_price, volume, open_interest,
                 oi_change, volume_zscore, oi_zscore,
                 source, note, created_at, updated_at,
                 created_by, input_method, image_reference
          FROM cme_market_data
          WHERE symbol = ?
          ORDER BY data_date DESC, data_time DESC, id DESC
          LIMIT 100
        `).bind(symbol).all()

        const rows = result.results as Array<Record<string, unknown>>
        const latest = rows[0]
        const previous = rows[1]

        if (!latest || latest.settlement_price == null) {
          return json({ error: 'No CME market data available' }, 404)
        }

        const history = rows.map((row) => ({
          volume: row.volume == null ? undefined : Number(row.volume),
          openInterest: row.open_interest == null ? undefined : Number(row.open_interest),
        }))

        const { historicalVolumeChanges, historicalOIChanges } =
          buildHistoricalChanges(history)

        const intelligence = analyzeCmeIntelligence({
          price: Number(latest.settlement_price),
          previousPrice: previous?.settlement_price == null ? undefined : Number(previous.settlement_price),
          volume: latest.volume == null ? undefined : Number(latest.volume),
          previousVolume: previous?.volume == null ? undefined : Number(previous.volume),
          openInterest: latest.open_interest == null ? undefined : Number(latest.open_interest),
          previousOpenInterest: previous?.open_interest == null ? undefined : Number(previous.open_interest),
          historicalVolumeChanges,
          historicalOIChanges,
        })

        const vol2vol = analyzeVol2Vol({
          priceChange: intelligence.priceChange,
          volumeChange: intelligence.volumeChange,
          openInterestChange: intelligence.openInterestChange,
          volumeZscore: intelligence.volumeZscore,
          oiZscore: intelligence.oiZscore,
          positioning: intelligence.positioning,
        })

        const storedState = await getVol2VolState(env.DB, symbol)

        const vol2volState = resolveVol2VolState({
          previousState: storedState.state as 'NO_POSITION' | 'LONG_ACTIVE' | 'SHORT_ACTIVE',
          signal: vol2vol.signal,
          confidence: vol2vol.confidence,
        })

        const market = await getMarketBySymbol(env.DB, symbol)

        if (!market) {
          return json({ error: `Market symbol not found: ${symbol}` }, 404)
        }

        const provider = getMarketProvider(market.provider, env)

        if (typeof provider.getHistory !== 'function') {
          return json({ error: `Historical data is not supported for ${symbol}` }, 501)
        }

        const candles = await provider.getHistory(symbol, {
          interval: '1h',
          outputsize: 50,
        })

        if (!candles.length) {
          return json({ error: `No market history available for ${symbol}` }, 404)
        }

        const marketIntelligence = calculateMarketIntelligence(candles)

        const iqtfDecision = calculateIqtfDecision({
          marketScore: marketIntelligence.score,
          cmeConfirmation: intelligence.confirmationScore,
          vol2volScore: vol2vol.score,
          marketSignal: marketIntelligence.signal,
          marketStructure: marketIntelligence.structure.direction,
          volatilityRegime: marketIntelligence.volatilityRegime.regime,
          cmePositioning: intelligence.positioning,
          cmeOiConfirmation: intelligence.oiConfirmation,
          vol2volSignal: vol2vol.signal,
        })

        const savedState = await saveVol2VolState(env.DB, {
          symbol,
          state: vol2volState.state,
          signal: vol2volState.signal,
          confidence: vol2volState.confidence,
          action: vol2volState.action,
        })

        return json({
          success: true,
          symbol,
          data: { id: Number(latest.id), symbol: String(latest.symbol), dataDate: String(latest.data_date), dataTime: latest.data_time == null ? "" : String(latest.data_time), settlementPrice: Number(latest.settlement_price), volume: latest.volume == null ? undefined : Number(latest.volume), volumeZscore: latest.volume_zscore == null ? undefined : Number(latest.volume_zscore), openInterest: latest.open_interest == null ? undefined : Number(latest.open_interest), oiChange: latest.oi_change == null ? undefined : Number(latest.oi_change), oiZscore: latest.oi_zscore == null ? undefined : Number(latest.oi_zscore), source: String(latest.source), inputMethod: String(latest.input_method ?? "MANUAL") },
          marketIntelligence,
          intelligence,
          vol2vol,
          iqtfDecision,
          vol2volState: savedState,
          previousState: storedState.state,
          historyStats: {
            records: rows.length,
            volumeChangeSamples: historicalVolumeChanges.length,
            oiChangeSamples: historicalOIChanges.length,
          },
        })
      } catch (error) {
        console.error('GET /api/cme/analysis error:', error)
        return json({
          success: false,
          error: 'Failed to analyze CME data',
          message: error instanceof Error ? error.message : String(error),
        }, 500)
      }
    }

    // =========================================================
    // DELETE /api/cot/:id
    // =========================================================
    if (
      url.pathname.startsWith('/api/cot/') &&
      request.method === 'DELETE'
    ) {
      try {
        const id = Number(
          url.pathname.split('/').pop(),
        )

        if (!Number.isInteger(id) || id <= 0) {
          return json(
            {
              success: false,
              error: 'Invalid COT id',
            },
            400,
          )
        }

        const result = await env.DB.prepare(`
          DELETE FROM cot_market_data
          WHERE id = ?
          RETURNING *
        `)
          .bind(id)
          .first()

        if (!result) {
          return json(
            {
              success: false,
              error: 'COT record not found',
            },
            404,
          )
        }

        return json({
          success: true,
          data: result,
        })
      } catch (error) {
        console.error(
          'DELETE /api/cot/:id error:',
          error,
        )

        return json(
          {
            success: false,
            error: 'Failed to delete COT data',
          },
          500,
        )
      }
    }


    // =========================================================
    // POST /api/cot/ocr
    // =========================================================
    if (
      url.pathname === '/api/cot/ocr' &&
      request.method === 'POST'
    ) {
      try {
        const body = await request.json() as {
          image?: string
        }

        if (!body.image) {
          return json(
            {
              success: false,
              error: 'image is required',
            },
            400,
          )
        }

        const apiKey = env.NVIDIA_API_KEY

        if (!apiKey) {
          return json(
            {
              success: false,
              error: 'NVIDIA_API_KEY is not configured',
            },
            500,
          )
        }

        const result = await analyzeCotImageWithNvidia(
          body.image,
          apiKey,
        )

        return json({
          success: true,
          data: result,
        })
      } catch (error) {
        console.error('POST /api/cot/ocr error:', error)

        return json(
          {
            success: false,
            error: 'Failed to analyze COT image',
            message:
              error instanceof Error
                ? error.message
                : String(error),
          },
          500,
        )
      }
    }

    // =========================================================
    // POST /api/cot/ocr/validate
    // =========================================================
    if (
      url.pathname === '/api/cot/ocr/validate' &&
      request.method === 'POST'
    ) {
      try {
        const body = await request.json() as {
          symbol?: string
          records?: Array<{
            report_date: string | null
            total_oi: number | null
            producer_long: number | null
            producer_short: number | null
            swap_dealer_long: number | null
            swap_dealer_short: number | null
            managed_money_long: number | null
            managed_money_short: number | null
            other_reportables_long: number | null
            other_reportables_short: number | null
          }>
        }

        const symbol = body.symbol || 'GC'
        const records = body.records || []

        if (!Array.isArray(records) || records.length === 0) {
          return json(
            {
              success: false,
              error: 'records are required',
            },
            400,
          )
        }

        const results = []

        for (const record of records) {
          const normalizedReportDate =
            normalizeCotDate(record.report_date)

          if (!normalizedReportDate) {
            results.push(
              validateCotRecord(record, null),
            )
            continue
          }

          const existing = await env.DB.prepare(`
            SELECT
              report_date,
              open_interest AS total_oi,
              producer_long,
              producer_short,
              swap_dealer_long,
              swap_dealer_short,
              managed_money_long,
              managed_money_short,
              other_reportables_long,
              other_reportables_short
            FROM cot_market_data
            WHERE symbol = ?
              AND report_date = ?
            ORDER BY id DESC
            LIMIT 1
          `)
            .bind(symbol, normalizedReportDate)
            .first()

          results.push(
            validateCotRecord(
              record,
              existing,
            ),
          )
        }

        return json({
          success: true,
          symbol,
          count: results.length,
          results,
        })
      } catch (error) {
        console.error(
          'POST /api/cot/ocr/validate error:',
          error,
        )

        return json(
          {
            success: false,
            error: 'Failed to validate COT OCR',
            message:
              error instanceof Error
                ? error.message
                : String(error),
          },
          500,
        )
      }
    }

    // =========================================================
    // POST /api/cot/ocr/apply
    // =========================================================
    if (
      url.pathname === '/api/cot/ocr/apply' &&
      request.method === 'POST'
    ) {
      try {
        const body = await request.json() as {
          symbol?: string
          record?: {
            report_date: string | null
            total_oi: number | null
            producer_long: number | null
            producer_short: number | null
            swap_dealer_long: number | null
            swap_dealer_short: number | null
            managed_money_long: number | null
            managed_money_short: number | null
            other_reportables_long: number | null
            other_reportables_short: number | null
          }
          decision?: 'KEEP_DATABASE' | 'USE_OCR'
          source?: string
          note?: string
        }

        const symbol = body.symbol || 'GC'
        const record = body.record

        if (!record) {
          return json({
            success: false,
            error: 'record is required',
          }, 400)
        }

        const reportDate = normalizeCotDate(record.report_date)

        if (!reportDate) {
          return json({
            success: false,
            error: 'Invalid report_date',
          }, 400)
        }

        const existing = await env.DB.prepare(`
          SELECT *
          FROM cot_market_data
          WHERE symbol = ?
            AND report_date = ?
          ORDER BY id DESC
          LIMIT 1
        `)
          .bind(symbol, reportDate)
          .first()

        if (existing && !body.decision) {
          return json({
            success: false,
            error: 'Existing record requires decision',
            status: 'CONFLICT',
            data: existing,
          }, 409)
        }

        if (
          existing &&
          body.decision === 'KEEP_DATABASE'
        ) {
          return json({
            success: true,
            action: 'KEEP_DATABASE',
            data: existing,
          })
        }

        if (
          existing &&
          body.decision === 'USE_OCR'
        ) {
          const result = await env.DB.prepare(`
            UPDATE cot_market_data
            SET
              open_interest = ?,
              producer_long = ?,
              producer_short = ?,
              swap_dealer_long = ?,
              swap_dealer_short = ?,
              managed_money_long = ?,
              managed_money_short = ?,
              other_reportables_long = ?,
              other_reportables_short = ?,
              source = ?,
              note = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING *
          `)
            .bind(
              record.total_oi,
              record.producer_long,
              record.producer_short,
              record.swap_dealer_long,
              record.swap_dealer_short,
              record.managed_money_long,
              record.managed_money_short,
              record.other_reportables_long,
              record.other_reportables_short,
              body.source ?? 'CFTC-OCR',
              body.note ?? null,
              existing.id,
            )
            .first()

          return json({
            success: true,
            action: 'USE_OCR',
            data: result,
          })
        }

        const result = await env.DB.prepare(`
          INSERT INTO cot_market_data (
            symbol,
            report_date,
            open_interest,
            producer_long,
            producer_short,
            swap_dealer_long,
            swap_dealer_short,
            managed_money_long,
            managed_money_short,
            other_reportables_long,
            other_reportables_short,
            source,
            note
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `)
          .bind(
            symbol,
            reportDate,
            record.total_oi,
            record.producer_long,
            record.producer_short,
            record.swap_dealer_long,
            record.swap_dealer_short,
            record.managed_money_long,
            record.managed_money_short,
            record.other_reportables_long,
            record.other_reportables_short,
            body.source ?? 'CFTC-OCR',
            body.note ?? null,
          )
          .first()

        return json({
          success: true,
          action: 'INSERT',
          data: result,
        }, 201)
      } catch (error) {
        console.error(
          'POST /api/cot/ocr/apply error:',
          error,
        )

        return json({
          success: false,
          error: 'Failed to apply COT OCR',
          message:
            error instanceof Error
              ? error.message
              : String(error),
        }, 500)
      }
    }

    // =========================================================
    // GET /api/cot/latest
    // =========================================================
    if (
      url.pathname === '/api/cot/latest' &&
      request.method === 'GET'
    ) {
      try {
        const symbol = url.searchParams.get('symbol') || 'GC'

        const result = await env.DB.prepare(`
          SELECT *
          FROM cot_market_data
          WHERE symbol = ?
          ORDER BY report_date DESC, id DESC
          LIMIT 1
        `)
          .bind(symbol)
          .first()

        return json({
          success: true,
          symbol,
          data: result ?? null,
        })
      } catch (error) {
        console.error('GET /api/cot/latest error:', error)

        return json(
          {
            success: false,
            error: 'Failed to read latest COT data',
          },
          500,
        )
      }
    }

    // =========================================================
    // GET /api/cot/history
    // =========================================================
    if (
      url.pathname === '/api/cot/history' &&
      request.method === 'GET'
    ) {
      try {
        const symbol = url.searchParams.get('symbol') || 'GC'

        const limitParam = Number(
          url.searchParams.get('limit') || '30',
        )

        const limit = Math.min(
          Math.max(
            Number.isFinite(limitParam) ? limitParam : 30,
            1,
          ),
          100,
        )

        const result = await env.DB.prepare(`
          SELECT *
          FROM cot_market_data
          WHERE symbol = ?
          ORDER BY report_date DESC, id DESC
          LIMIT ?
        `)
          .bind(symbol, limit)
          .all()

        return json({
          success: true,
          symbol,
          count: result.results.length,
          data: result.results,
        })
      } catch (error) {
        console.error('GET /api/cot/history error:', error)

        return json(
          {
            success: false,
            error: 'Failed to read COT history',
          },
          500,
        )
      }
    }

    // =========================================================
    // POST /api/cot
    // =========================================================
    if (
      url.pathname === '/api/cot' &&
      request.method === 'POST'
    ) {
      try {
        const body = await request.json() as {
          symbol?: string
          reportDate?: string
          openInterest?: number
          producerLong?: number
          producerShort?: number
          swapDealerLong?: number
          swapDealerShort?: number
          managedMoneyLong?: number
          managedMoneyShort?: number
          otherReportablesLong?: number
          otherReportablesShort?: number
          source?: string
          note?: string
        }

        if (!body.symbol || !body.reportDate) {
          return json(
            {
              success: false,
              error: 'symbol and reportDate are required',
            },
            400,
          )
        }

        const numericFields = [
          body.openInterest,
          body.producerLong,
          body.producerShort,
          body.swapDealerLong,
          body.swapDealerShort,
          body.managedMoneyLong,
          body.managedMoneyShort,
          body.otherReportablesLong,
          body.otherReportablesShort,
        ]

        if (
          numericFields.some(
            (value) =>
              typeof value !== 'number' ||
              !Number.isFinite(value),
          )
        ) {
          return json(
            {
              success: false,
              error:
                'All COT numeric fields are required',
            },
            400,
          )
        }

        const result = await env.DB.prepare(`
          INSERT INTO cot_market_data (
            symbol,
            report_date,
            open_interest,
            producer_long,
            producer_short,
            swap_dealer_long,
            swap_dealer_short,
            managed_money_long,
            managed_money_short,
            other_reportables_long,
            other_reportables_short,
            source,
            note
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `)
          .bind(
            body.symbol,
            body.reportDate,
            body.openInterest ?? null,
            body.producerLong ?? null,
            body.producerShort ?? null,
            body.swapDealerLong ?? null,
            body.swapDealerShort ?? null,
            body.managedMoneyLong ?? null,
            body.managedMoneyShort ?? null,
            body.otherReportablesLong ?? null,
            body.otherReportablesShort ?? null,
            body.source ?? 'CFTC',
            body.note ?? null,
          )
          .first()

        return json(
          {
            success: true,
            data: result,
          },
          201,
        )
      } catch (error) {
        console.error('POST /api/cot error:', error)

        return json(
          {
            success: false,
            error: 'Failed to insert COT data',
          },
          500,
        )
      }
    }

    // =========================================================
    // GET /api/cot/intelligence
    // =========================================================
    if (
      url.pathname === '/api/cot/intelligence' &&
      request.method === 'GET'
    ) {
      try {
        const symbol = url.searchParams.get('symbol') || 'GC'

        const result = await env.DB.prepare(`
          SELECT
            id,
            symbol,
            report_date,
            open_interest,
            producer_long,
            producer_short,
            swap_dealer_long,
            swap_dealer_short,
            managed_money_long,
            managed_money_short,
            other_reportables_long,
            other_reportables_short
          FROM cot_market_data
          WHERE symbol = ?
          ORDER BY report_date DESC, id DESC
          LIMIT 2
        `)
          .bind(symbol)
          .all()

        const rows = result.results as Array<{
          id: number
          symbol: string
          report_date: string
          open_interest: number | null
          producer_long: number | null
          producer_short: number | null
          swap_dealer_long: number | null
          swap_dealer_short: number | null
          managed_money_long: number | null
          managed_money_short: number | null
          other_reportables_long: number | null
          other_reportables_short: number | null
        }>

        if (rows.length === 0) {
          return json({
            success: true,
            symbol,
            data: {
              positioning: 'NEUTRAL',
              confidence: 'LOW',
              score: 0,
              dataPoints: 0,
              reasons: ['No COT data available'],
            },
          })
        }

        const latest = rows[0]
        const previous = rows[1] ?? null

        const value = (x: number | null): number =>
          x == null ? 0 : Number(x)

        const net = (
          long: number | null,
          short: number | null,
        ): number =>
          value(long) - value(short)

        const managedMoneyNet =
          net(
            latest.managed_money_long,
            latest.managed_money_short,
          )

        const producerNet =
          net(
            latest.producer_long,
            latest.producer_short,
          )

        const swapDealerNet =
          net(
            latest.swap_dealer_long,
            latest.swap_dealer_short,
          )

        const otherReportablesNet =
          net(
            latest.other_reportables_long,
            latest.other_reportables_short,
          )

        const managedMoneyNetChange = previous
          ? managedMoneyNet -
            net(
              previous.managed_money_long,
              previous.managed_money_short,
            )
          : 0

        const producerNetChange = previous
          ? producerNet -
            net(
              previous.producer_long,
              previous.producer_short,
            )
          : 0

        const swapDealerNetChange = previous
          ? swapDealerNet -
            net(
              previous.swap_dealer_long,
              previous.swap_dealer_short,
            )
          : 0

        const otherReportablesNetChange = previous
          ? otherReportablesNet -
            net(
              previous.other_reportables_long,
              previous.other_reportables_short,
            )
          : 0

        let score = 0
        const reasons: string[] = []

        if (managedMoneyNet > 0) {
          score += 1
          reasons.push('Managed Money is net long')
        } else if (managedMoneyNet < 0) {
          score -= 1
          reasons.push('Managed Money is net short')
        }

        if (previous) {
          if (managedMoneyNetChange > 0) {
            score += 1
            reasons.push(
              'Managed Money increased net long exposure',
            )
          } else if (managedMoneyNetChange < 0) {
            score -= 1
            reasons.push(
              'Managed Money decreased net long exposure',
            )
          }

          if (producerNetChange < 0) {
            score += 1
            reasons.push(
              'Producer/Merchant net position decreased',
            )
          } else if (producerNetChange > 0) {
            score -= 1
            reasons.push(
              'Producer/Merchant net position increased',
            )
          }
        }

        let positioning:
          | 'STRONG_LONG'
          | 'LONG'
          | 'NEUTRAL'
          | 'SHORT'
          | 'STRONG_SHORT'

        if (score >= 2) {
          positioning = 'STRONG_LONG'
        } else if (score === 1) {
          positioning = 'LONG'
        } else if (score === 0) {
          positioning = 'NEUTRAL'
        } else if (score === -1) {
          positioning = 'SHORT'
        } else {
          positioning = 'STRONG_SHORT'
        }

        let confidence:
          | 'HIGH'
          | 'MEDIUM'
          | 'LOW'

        if (!previous) {
          confidence = 'LOW'
        } else if (Math.abs(score) >= 2) {
          confidence = 'HIGH'
        } else {
          confidence = 'MEDIUM'
        }

        return json({
          success: true,
          symbol,
          data: {
            current: {
              id: latest.id,
              reportDate: latest.report_date,
            },

            managedMoneyNet,
            producerNet,
            swapDealerNet,
            otherReportablesNet,

            managedMoneyNetChange,
            producerNetChange,
            swapDealerNetChange,
            otherReportablesNetChange,

            positioning,
            confidence,
            score,
            reasons,
            dataPoints: rows.length,
          },
        })
      } catch (error) {
        console.error(
          'GET /api/cot/intelligence error:',
          error,
        )

        return json(
          {
            success: false,
            error: 'Failed to calculate COT intelligence',
          },
          500,
        )
      }
    }

    // =========================================================
    // TRADE PLAN
    // =========================================================

    // POST /api/trade-plan
    if (
      url.pathname === '/api/trade-plan' &&
      request.method === 'POST'
    ) {
      try {
        const body = await request.json() as {
          symbol?: string
          direction?: 'LONG' | 'SHORT'
          entryPrice?: number
          stopLoss?: number
          tp1?: number
          tp2?: number
          tp3?: number
          status?: 'ACTIVE' | 'CLOSED' | 'CANCELLED'
          note?: string
          createdBy?: string
        }

        const symbol = String(body.symbol ?? 'GC').trim().toUpperCase()
        const direction = body.direction
        const entryPrice = Number(body.entryPrice)
        const stopLoss = Number(body.stopLoss)
        const tp1 = Number(body.tp1)
        const tp2 = Number(body.tp2)
        const tp3 = Number(body.tp3)
        const status = body.status ?? 'ACTIVE'

        if (!direction || !['LONG', 'SHORT'].includes(direction)) {
          return json({
            success: false,
            error: 'direction must be LONG or SHORT',
          }, 400)
        }

        if (
          !Number.isFinite(entryPrice) ||
          !Number.isFinite(stopLoss) ||
          !Number.isFinite(tp1) ||
          !Number.isFinite(tp2) ||
          !Number.isFinite(tp3)
        ) {
          return json({
            success: false,
            error: 'entryPrice, stopLoss, tp1, tp2 and tp3 must be valid numbers',
          }, 400)
        }

        if (!['ACTIVE', 'CLOSED', 'CANCELLED'].includes(status)) {
          return json({
            success: false,
            error: 'Invalid trade plan status',
          }, 400)
        }

        const result = await env.DB.prepare(`
          INSERT INTO trade_plans (
            symbol,
            direction,
            entry_price,
            stop_loss,
            tp1,
            tp2,
            tp3,
            status,
            note,
            created_by
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `)
          .bind(
            symbol,
            direction,
            entryPrice,
            stopLoss,
            tp1,
            tp2,
            tp3,
            status,
            body.note ? String(body.note) : null,
            body.createdBy ? String(body.createdBy) : null,
          )
          .first()

        return json({
          success: true,
          data: result,
        }, 201)
      } catch (error) {
        console.error('POST /api/trade-plan error:', error)

        return json({
          success: false,
          error: 'Failed to create trade plan',
        }, 400)
      }
    }

    // GET /api/trade-plan/latest
    if (
      url.pathname === '/api/trade-plan/latest' &&
      request.method === 'GET'
    ) {
      try {
        const symbol =
          url.searchParams.get('symbol')?.trim().toUpperCase() || 'GC'

        const result = await env.DB.prepare(`
          SELECT *
          FROM trade_plans
          WHERE symbol = ?
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        `)
          .bind(symbol)
          .first()

        if (!result) {
          return json({
            success: false,
            error: 'No trade plan available',
          }, 404)
        }

        return json({
          success: true,
          data: result,
        })
      } catch (error) {
        console.error('GET /api/trade-plan/latest error:', error)

        return json({
          success: false,
          error: 'Failed to read latest trade plan',
        }, 500)
      }
    }

    // GET /api/trade-plan/history
    if (
      url.pathname === '/api/trade-plan/history' &&
      request.method === 'GET'
    ) {
      try {
        const symbol =
          url.searchParams.get('symbol')?.trim().toUpperCase() || 'GC'

        const limitParam = Number(
          url.searchParams.get('limit') || '30',
        )

        const limit = Math.min(
          Math.max(
            Number.isFinite(limitParam) ? Math.floor(limitParam) : 30,
            1,
          ),
          100,
        )

        const result = await env.DB.prepare(`
          SELECT *
          FROM trade_plans
          WHERE symbol = ?
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        `)
          .bind(symbol, limit)
          .all()

        return json({
          success: true,
          symbol,
          count: result.results.length,
          data: result.results,
        })
      } catch (error) {
        console.error('GET /api/trade-plan/history error:', error)

        return json({
          success: false,
          error: 'Failed to read trade plan history',
        }, 500)
      }
    }

    // GET /api/trade-plan/:id
    if (
      url.pathname.startsWith('/api/trade-plan/') &&
      request.method === 'GET'
    ) {
      try {
        const idText = url.pathname.split('/').pop() || ''
        const id = Number(idText)

        if (!Number.isInteger(id)) {
          return json({
            success: false,
            error: 'Invalid trade plan id',
          }, 400)
        }

        const result = await env.DB.prepare(`
          SELECT *
          FROM trade_plans
          WHERE id = ?
          LIMIT 1
        `)
          .bind(id)
          .first()

        if (!result) {
          return json({
            success: false,
            error: 'Trade plan not found',
          }, 404)
        }

        return json({
          success: true,
          data: result,
        })
      } catch (error) {
        console.error('GET /api/trade-plan/:id error:', error)

        return json({
          success: false,
          error: 'Failed to read trade plan',
        }, 500)
      }
    }

    // PUT /api/trade-plan/:id
    if (
      url.pathname.startsWith('/api/trade-plan/') &&
      request.method === 'PUT'
    ) {
      try {
        const idText = url.pathname.split('/').pop() || ''
        const id = Number(idText)

        if (!Number.isInteger(id)) {
          return json({
            success: false,
            error: 'Invalid trade plan id',
          }, 400)
        }

        const body = await request.json() as {
          symbol?: string
          direction?: 'LONG' | 'SHORT'
          entryPrice?: number
          stopLoss?: number
          tp1?: number
          tp2?: number
          tp3?: number
          status?: 'ACTIVE' | 'CLOSED' | 'CANCELLED'
          note?: string | null
        }

        const existing = await env.DB.prepare(`
          SELECT *
          FROM trade_plans
          WHERE id = ?
          LIMIT 1
        `)
          .bind(id)
          .first<{
            symbol: string
            direction: 'LONG' | 'SHORT'
            entry_price: number
            stop_loss: number
            tp1: number
            tp2: number
            tp3: number
            status: 'ACTIVE' | 'CLOSED' | 'CANCELLED'
            note: string | null
          }>()

        if (!existing) {
          return json({
            success: false,
            error: 'Trade plan not found',
          }, 404)
        }

        const symbol =
          body.symbol !== undefined
            ? String(body.symbol).trim().toUpperCase()
            : existing.symbol

        const direction =
          body.direction ?? existing.direction

        const entryPrice =
          body.entryPrice !== undefined
            ? Number(body.entryPrice)
            : existing.entry_price

        const stopLoss =
          body.stopLoss !== undefined
            ? Number(body.stopLoss)
            : existing.stop_loss

        const tp1 =
          body.tp1 !== undefined
            ? Number(body.tp1)
            : existing.tp1

        const tp2 =
          body.tp2 !== undefined
            ? Number(body.tp2)
            : existing.tp2

        const tp3 =
          body.tp3 !== undefined
            ? Number(body.tp3)
            : existing.tp3

        const status =
          body.status ?? existing.status

        const note =
          body.note !== undefined
            ? body.note
            : existing.note

        if (!['LONG', 'SHORT'].includes(direction)) {
          return json({
            success: false,
            error: 'direction must be LONG or SHORT',
          }, 400)
        }

        if (
          !Number.isFinite(entryPrice) ||
          !Number.isFinite(stopLoss) ||
          !Number.isFinite(tp1) ||
          !Number.isFinite(tp2) ||
          !Number.isFinite(tp3)
        ) {
          return json({
            success: false,
            error: 'Trade prices must be valid numbers',
          }, 400)
        }

        if (!['ACTIVE', 'CLOSED', 'CANCELLED'].includes(status)) {
          return json({
            success: false,
            error: 'Invalid trade plan status',
          }, 400)
        }

        const result = await env.DB.prepare(`
          UPDATE trade_plans
          SET
            symbol = ?,
            direction = ?,
            entry_price = ?,
            stop_loss = ?,
            tp1 = ?,
            tp2 = ?,
            tp3 = ?,
            status = ?,
            note = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          RETURNING *
        `)
          .bind(
            symbol,
            direction,
            entryPrice,
            stopLoss,
            tp1,
            tp2,
            tp3,
            status,
            note,
            id,
          )
          .first()

        return json({
          success: true,
          data: result,
        })
      } catch (error) {
        console.error('PUT /api/trade-plan/:id error:', error)

        return json({
          success: false,
          error: 'Failed to update trade plan',
        }, 400)
      }
    }

    // DELETE /api/trade-plan/:id
    if (
      url.pathname.startsWith('/api/trade-plan/') &&
      request.method === 'DELETE'
    ) {
      try {
        const idText = url.pathname.split('/').pop() || ''
        const id = Number(idText)

        if (!Number.isInteger(id)) {
          return json({
            success: false,
            error: 'Invalid trade plan id',
          }, 400)
        }

        const existing = await env.DB.prepare(`
          SELECT id
          FROM trade_plans
          WHERE id = ?
          LIMIT 1
        `)
          .bind(id)
          .first()

        if (!existing) {
          return json({
            success: false,
            error: 'Trade plan not found',
          }, 404)
        }

        await env.DB.prepare(`
          DELETE FROM trade_plans
          WHERE id = ?
        `)
          .bind(id)
          .run()

        return json({
          success: true,
          id,
        })
      } catch (error) {
        console.error('DELETE /api/trade-plan/:id error:', error)

        return json({
          success: false,
          error: 'Failed to delete trade plan',
        }, 500)
      }
    }

    // =========================================================
    // AUTH
    // =========================================================

    // POST /login
    if (
      url.pathname === '/login' &&
      request.method === 'POST'
    ) {
      try {
        const body = (await request.json()) as {
          email?: string
          password?: string
        }

        if (!body?.email || typeof body.email !== 'string') {
          return json({
            success: false,
            error: 'email is required',
          }, 400)
        }

        if (!body?.password || typeof body.password !== 'string') {
          return json({
            success: false,
            error: 'password is required',
          }, 400)
        }

        const email = body.email.trim().toLowerCase()
        const password = body.password

        if (!email) {
          return json({
            success: false,
            error: 'email is required',
          }, 400)
        }

        const user = await env.DB.prepare(`
          SELECT
            id,
            email,
            name,
            role,
            password_hash,
            created_at
          FROM users
          WHERE email = ?
          LIMIT 1
        `)
          .bind(email)
          .first<{
            id: number
            email: string
            name: string | null
            role: string
            password_hash: string | null
            created_at: string
          }>()

        if (!user || !user.password_hash) {
          return json({
            success: false,
            error: 'Invalid email or password',
          }, 401)
        }

        const valid = await verifyPassword(
          password,
          user.password_hash,
        )

        if (!valid) {
          return json({
            success: false,
            error: 'Invalid email or password',
          }, 401)
        }

        return json({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            created_at: user.created_at,
          },
        })
      } catch (error) {
        console.error('POST /login error:', error)

        return json({
          success: false,
          error: 'Login failed',
        }, 500)
      }
    }

    // =========================================================
/* INSTITUTIONAL_ROUTE_START */
if (
  url.pathname === '/api/institutional/analysis' &&
  request.method === 'GET'
) {
  try {
    const symbol = url.searchParams.get('symbol') || 'GC'
    const institutionalSymbol = symbol === 'XAUUSD' ? 'GC' : symbol

    const cmeResult = await env.DB.prepare(`
      SELECT *
      FROM cme_market_data
      WHERE symbol = ?
      ORDER BY data_date DESC, id DESC
      LIMIT 100
    `).bind(institutionalSymbol).all()

    const cmeRows = cmeResult.results as any[]

    if (cmeRows.length === 0) {
      return json({
        success: false,
        symbol,
        error: 'No CME data available',
      }, 404)
    }

    const latest = cmeRows[0]
    const previous = cmeRows[1] ?? null

    const cmeHistory = cmeRows.map((row) => ({
      id: Number(row.id),
      symbol: String(row.symbol),
      dataDate: String(row.data_date),
      dataTime: row.data_time == null ? '' : String(row.data_time),
      settlementPrice: Number(row.settlement_price),
      volume: row.volume == null ? undefined : Number(row.volume),
      volumeZscore: row.volume_zscore == null ? undefined : Number(row.volume_zscore),
      openInterest: row.open_interest == null ? undefined : Number(row.open_interest),
      oiChange: row.oi_change == null ? undefined : Number(row.oi_change),
      oiZscore: row.oi_zscore == null ? undefined : Number(row.oi_zscore),
      source: String(row.source ?? 'CME'),
      inputMethod: String(row.input_method ?? 'MANUAL'),
    }))

    const latestPrice = Number(latest.settlement_price ?? 0)
    const previousPrice = previous
      ? Number(previous.settlement_price ?? latestPrice)
      : latestPrice
    const latestVolume =
      latest.volume == null ? undefined : Number(latest.volume)
    const previousVolume =
      previous?.volume == null
        ? undefined
        : Number(previous.volume)

    const latestOi =
      latest.open_interest == null
        ? undefined
        : Number(latest.open_interest)
    const previousOi =
      previous?.open_interest == null
        ? undefined
        : Number(previous.open_interest)

    const historicalVolumeChanges = cmeRows
      .slice(0, -1)
      .map((row, i) => {
        const current = row.volume
        const previousRow = cmeRows[i + 1]?.volume

        if (current == null || previousRow == null) return null

        return Number(current) - Number(previousRow)
      })
      .filter((value): value is number => value !== null)

    const historicalOIChanges = cmeRows
      .slice(0, -1)
      .map((row, i) => {
        const current = row.open_interest
        const previousRow = cmeRows[i + 1]?.open_interest

        if (current == null || previousRow == null) return null

        return Number(current) - Number(previousRow)
      })
      .filter((value): value is number => value !== null)

    const cme = analyzeCmeIntelligence({
      price: latestPrice,
      previousPrice,
      volume: latestVolume,
      previousVolume,
      openInterest: latestOi,
      previousOpenInterest: previousOi,
      historicalVolumeChanges,
      historicalOIChanges,
    })

    const vol2vol = analyzeVol2Vol({
      priceChange: latestPrice - previousPrice,
      volumeChange: latestVolume != null && previousVolume != null ? latestVolume - previousVolume : 0,
      openInterestChange: latestOi != null && previousOi != null ? latestOi - previousOi : 0,
      volumeZscore: Number(latest.volume_zscore ?? 0),
      oiZscore: Number(latest.oi_zscore ?? 0),
      positioning: cme.positioning,
    })

    const market = await getMarketBySymbol(env.DB, symbol)

    if (!market) {
      return json({
        success: false,
        symbol,
        error: `Market not found: ${symbol}`,
      }, 404)
    }

    const provider = getMarketProvider(
      market.provider,
      env,
    )

    if (!provider.getHistory) {
      return json({
        success: false,
        symbol,
        error: 'Market history provider unavailable',
      }, 500)
    }

    const marketHistory = await provider.getHistory(
      market.symbol,
      { interval: '1h', outputsize: 50 },
    )

    const marketIntelligence = calculateMarketIntelligence(
      marketHistory,
    )

    const cotResult = await env.DB.prepare(`
      SELECT *
      FROM cot_market_data
      WHERE symbol = ?
      ORDER BY report_date DESC, id DESC
      LIMIT 2
    `).bind(institutionalSymbol).all()

    const cotRows = cotResult.results as any[]

    let cot: any

    if (cotRows.length === 0) {
      cot = {
        intelligence: {
          managedMoneyNet: 0,
          producerNet: 0,
          swapDealerNet: 0,
          otherReportablesNet: 0,
          managedMoneyNetChange: 0,
          producerNetChange: 0,
          swapDealerNetChange: 0,
          otherReportablesNetChange: 0,
          positioning: 'NEUTRAL',
          confidence: 'LOW',
          score: 0,
          reasons: ['No COT data available'],
        },
        latest: {
          id: 0,
          symbol,
          reportDate: '',
          openInterest: 0,
          producerLong: 0,
          producerShort: 0,
          swapDealerLong: 0,
          swapDealerShort: 0,
          managedMoneyLong: 0,
          managedMoneyShort: 0,
          otherReportablesLong: 0,
          otherReportablesShort: 0,
          source: 'NONE',
        },
      }
    } else {
      const mapCot = (row: any) => ({
        id: Number(row.id),
        symbol: String(row.symbol),
        reportDate: String(row.report_date),
        openInterest: Number(row.open_interest ?? 0),
        producerLong: Number(row.producer_long ?? 0),
        producerShort: Number(row.producer_short ?? 0),
        swapDealerLong: Number(row.swap_dealer_long ?? 0),
        swapDealerShort: Number(row.swap_dealer_short ?? 0),
        managedMoneyLong: Number(row.managed_money_long ?? 0),
        managedMoneyShort: Number(row.managed_money_short ?? 0),
        otherReportablesLong: Number(row.other_reportables_long ?? 0),
        otherReportablesShort: Number(row.other_reportables_short ?? 0),
        source: String(row.source ?? 'COT'),
        note: row.note == null ? undefined : String(row.note),
      })

      const cotLatest = mapCot(cotRows[0])
      const cotPrevious = cotRows[1] ? mapCot(cotRows[1]) : undefined

      cot = {
        intelligence: analyzeCotIntelligence({
          latest: cotLatest,
          previous: cotPrevious,
        }),
        latest: cotLatest,
        previous: cotPrevious,
      }
    }

    const iqtfDecision = calculateIqtfDecision({
      marketScore: Number(marketIntelligence.score ?? 0),
      cmeConfirmation: Number(cme.confirmationScore ?? 0),
      vol2volScore: Number(vol2vol.score ?? 0),
      cotScore: Number(cot.intelligence.score ?? 0),
  marketSignal: marketIntelligence.signal,
  marketStructure: marketIntelligence.structure.direction,
  volatilityRegime: marketIntelligence.volatilityRegime.regime,
  cmePositioning: cme.positioning,
  cmeOiConfirmation: cme.oiConfirmation,
  vol2volSignal: vol2vol.signal,
  cotPositioning: cot.intelligence.positioning,
    })

    const institutionalScore =
      Number(cme.confirmationScore ?? 0) * 0.25 +
      (Number(vol2vol.score ?? 0) / 100) * 0.25 +
      (Number(cot.intelligence.score ?? 0) / 3) * 0.15

    const marketScore = Number(marketIntelligence.score ?? 0)

    const marketAlignment =
      marketScore > 0.25
        ? 'BULLISH'
        : marketScore < -0.25
          ? 'BEARISH'
          : 'NEUTRAL'

    const institutionalAlignment =
      institutionalScore > 0.25
        ? 'BULLISH'
        : institutionalScore < -0.25
          ? 'BEARISH'
          : 'NEUTRAL'

    const signalConflict =
      marketAlignment !== 'NEUTRAL' &&
      institutionalAlignment !== 'NEUTRAL' &&
      marketAlignment !== institutionalAlignment

    const summary = {
      decision: iqtfDecision.decision,
      confidence: iqtfDecision.confidence,
      riskState: iqtfDecision.riskState,
      compositeScore: iqtfDecision.compositeScore,
      marketAlignment,
      institutionalAlignment,
      institutionalScore,
      signalConflict: iqtfDecision.signalConflict,
      components: iqtfDecision.components,
      reasons: iqtfDecision.reasons,
      warnings: iqtfDecision.warnings,
    }

    return json({
      success: true,
      symbol,
      cme,
      vol2vol,
      cot,
      iqtfDecision,
      summary,
      historyStats: {
        cmeRecords: cmeRows.length,
        cotRecords: cotRows.length,
        volumeChangeSamples: Math.max(0, cmeRows.length - 1),
        oiChangeSamples: Math.max(0, cmeRows.length - 1),
      },
      marketIntelligence,
      data: {
        id: Number(latest.id),
        symbol: String(latest.symbol),
        dataDate: String(latest.data_date),
        dataTime: latest.data_time == null ? '' : String(latest.data_time),
        settlementPrice: Number(latest.settlement_price),
        volume: latest.volume == null ? undefined : Number(latest.volume),
        volumeZscore: latest.volume_zscore == null ? undefined : Number(latest.volume_zscore),
        openInterest: latest.open_interest == null ? undefined : Number(latest.open_interest),
        oiChange: latest.oi_change == null ? undefined : Number(latest.oi_change),
        oiZscore: latest.oi_zscore == null ? undefined : Number(latest.oi_zscore),
        source: String(latest.source ?? 'CME'),
        inputMethod: String(latest.input_method ?? 'MANUAL'),
      },
    })
  } catch (error) {
    console.error(
      'GET /api/institutional/analysis error:',
      error,
    )

    return json({
      success: false,
      error: 'Failed to calculate institutional analysis',
    }, 500)
  }
}
/* INSTITUTIONAL_ROUTE_END */


    // 404
    // =========================================================
    return json(
      {
        success: false,
        error: 'Not Found',
        path: url.pathname,
      },
      404,
    )
  },
}
