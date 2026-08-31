export interface Env {
  DB: D1Database
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
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
