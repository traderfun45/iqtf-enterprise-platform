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
    // GET /api/cme/latest?symbol=GC
    // =========================================================
    if (url.pathname === '/api/cme/latest' && request.method === 'GET') {
      const symbol = url.searchParams.get('symbol') ?? 'GC'

      try {
        const result = await env.DB.prepare(`
          SELECT
            id,
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
            created_at,
            updated_at,
            created_by,
            input_method,
            image_reference
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
      } catch (error) {
        console.error('D1 CME latest error:', error)

        return json(
          {
            success: false,
            error: 'Failed to read CME data from D1',
          },
          500,
        )
      }
    }

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
