export type NvidiaVisionResult = {
  screenshot_type: string
  view_type: string
  raw_text: string
  strike_levels: number[]
  unreadable_or_missing_information: string[]
}

const NVIDIA_ENDPOINT =
  'https://integrate.api.nvidia.com/v1/chat/completions'

const NVIDIA_MODEL =
  'meta/llama-3.2-11b-vision-instruct'

export async function analyzeCmeImageWithNvidia(
  imageBase64: string,
  apiKey: string,
): Promise<NvidiaVisionResult> {
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not configured')
  }

  const cleanBase64 = imageBase64
    .replace(
      /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
      '',
    )
    .trim()

  if (!cleanBase64) {
    throw new Error('Image base64 is empty')
  }

  const fetchStartedAt = Date.now()

  console.log('[NVIDIA] FETCH START', {
    model: NVIDIA_MODEL,
    imageBase64Length: cleanBase64.length,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

  let response: Response

  try {
    response = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      temperature: 0,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `OCR TASK ONLY.

Read ONLY the visible text and numbers in this CME Gold Options / Vol2Vol screenshot.

IMPORTANT:
This screenshot may show different CME views.
FIRST identify which view is ACTIVE from the left-side menu.

For an "Intraday Volume" view, read the visible header, price/strike axis, and any explicitly printed Open Interest / TOTAL OI information that is visible in the screenshot.
Do NOT reinterpret the screenshot as an Expected Range page.

DO NOT:
- describe the image
- explain the image
- summarize the image
- analyze the market
- calculate anything
- add values that are not visibly printed
- infer missing values
- estimate bar heights
- estimate chart values
- guess unreadable numbers
- derive totals
- calculate z-scores
- convert units
- combine Put + Call into another value
- invent Expected Range values
- invent Open Interest values

OCR ACCURACY RULES:
- Transcribe only values actually visible in the screenshot.
- Preserve decimal points exactly as visible.
- Preserve commas exactly as visible.
- Preserve + and - signs exactly as visible.
- Keep the label next to its directly associated value.
- Do not take a number from another row, column, axis, or chart.
- If a decimal point is unclear, DO NOT guess it.
- If a value cannot be read confidently, put the field label in unreadable_or_missing_information.
- Never replace an unreadable value with a guessed value.

ACTIVE VIEW:
Identify the active view only from the visible left-side menu.

Possible views include:
- Volume / Intraday
- Volume / EOD
- Open Interest / OI
- Open Interest / OI Change
- Open Interest / Churn

If "Volume > Intraday" is active, use:
"view_type": "INTRADAY_VOLUME"

HEADER FIELDS — INTRADAY VOLUME:
Read these fields if visible:

Product
Expiration
DTE
Future Price
Future Change
Put
Call
Vol
Vol Chg

IMPORTANT:
- "Put" and "Call" are the header values, not chart bar values.
- "Vol" is the displayed volatility value if directly associated with the header label.
- "Vol Chg" is the displayed volatility change.
- "Future Change" must preserve its sign.
- Do not confuse "Future Price" with a Strike.
- Do not confuse "Vol" with Volume.

STRIKE / PRICE AXIS:
Read numeric strike or price levels that are EXPLICITLY PRINTED on the chart axis.

Store only clearly visible numeric axis levels.

Examples of acceptable values:
4300
4350
4400
4450
4500
4550
4600
4650

Do NOT:
- estimate intermediate strikes
- infer strikes from bar positions
- infer strikes from spacing
- create strikes that are not printed
- convert chart positions into numerical values

If the axis shows only some clearly readable levels, return only those levels.

CHART DATA:
Do not convert bar height into exact Put Volume or Call Volume numbers.

Only transcribe a chart numeric value when that number is explicitly printed next to a data point, label, or axis.

OPEN INTEREST:
Read explicitly printed Open Interest information anywhere in the screenshot when it is clearly associated with an OI label.

This includes labels such as:
- Open Interest
- OI
- TOTAL OI
- OI Change

When TOTAL OI appears together with a date, preserve the date and value together in raw_text.

IMPORTANT:
- Transcribe the visible date and OI value exactly.
- Do not select one date as the current/latest value.
- Do not map a historical TOTAL OI value to the current settlement automatically.
- Do not calculate or infer OI.
- Do not combine Put + Call.
- Do not infer OI from chart height.

EXPECTED RANGE:
Only extract Expected Range values if they are explicitly visible in the ACTIVE view.

Do NOT create Expected Range values from the chart.
Do NOT calculate ATM, +1, +2, +3, -1, -2, or -3.

OUTPUT:
Return ONLY valid JSON.
No markdown.
No explanation.
No prose outside JSON.

Use exactly this structure:

{
  "screenshot_type": "CME Options / Vol2Vol",
  "view_type": "INTRADAY_VOLUME",
  "raw_text": "visible labels and numbers only",
  "strike_levels": [],
  "unreadable_or_missing_information": []
}

IMPORTANT:
- Set view_type ONLY after checking the active left-side menu in the screenshot.
- Allowed view_type values are:
  "INTRADAY_VOLUME"
  "EOD_VOLUME"
  "OPEN_INTEREST"
  "OI_CHANGE"
  "CHURN"
  "UNKNOWN"
- Never choose a view_type from memory.
- Never assume INTRADAY_VOLUME unless the screenshot visibly shows Volume > Intraday as the active view.
- strike_levels must contain ONLY clearly readable numeric strike/price levels explicitly printed on the chart axis.
- Do not estimate or calculate strike levels.
- If no strike level can be read confidently, return an empty array.

The raw_text must contain ONLY relevant visible labels and their directly associated readable values, including explicitly printed OI information with its associated date when present.

For example, if the visible header is:
Product: Gold (OG|GC)
Expiration: OG1U6
DTE: 0.70
Future Price: 4485
Future Change: -19.9
Put: 2,682
Call: 4,931
Vol: 34.01
Vol Chg: -0.20

then transcribe those values exactly as visible.

Do not substitute another contract.
Do not substitute another price.
Do not use values from memory or another image.

If Strike values are clearly printed on the axis, include them in raw_text using the label "Strike:".

If a required header field is visible but unreadable, add its label to unreadable_or_missing_information.

Never invent a value.`,
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
    })
  } catch (error) {
    const elapsedMs = Date.now() - fetchStartedAt

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `NVIDIA Vision fetch timeout after 60 seconds (elapsed ${elapsedMs} ms)`,
      )
    }

    if (error instanceof Error) {
      throw new Error(
        `NVIDIA Vision fetch error after ${elapsedMs} ms: ${error.name}: ${error.message}`,
      )
    }

    throw new Error(
      `NVIDIA Vision fetch error after ${elapsedMs} ms: ${String(error)}`,
    )
  } finally {
    clearTimeout(timeout)
  }

  console.log('[NVIDIA] FETCH RESPONSE', {
    status: response.status,
    elapsedMs: Date.now() - fetchStartedAt,
  })

  const responseTextStartedAt = Date.now()
  const responseText = await response.text()

  console.log('[NVIDIA] RESPONSE TEXT COMPLETE', {
    elapsedMs: Date.now() - responseTextStartedAt,
    totalElapsedMs: Date.now() - fetchStartedAt,
    responseTextLength: responseText.length,
  })

  if (!response.ok) {
    throw new Error(
      `NVIDIA Vision HTTP ${response.status}: ${responseText}`,
    )
  }

  let payload: any

  try {
    payload = JSON.parse(responseText)
  } catch {
    throw new Error(
      `NVIDIA Vision returned invalid JSON: ${responseText}`,
    )
  }

  const content =
    payload?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error(
      'NVIDIA Vision response missing choices[0].message.content',
    )
  }

  const cleaned = String(content)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let result: NvidiaVisionResult

  try {
    result = JSON.parse(cleaned)
  } catch {
    // NVIDIA may occasionally wrap valid JSON in explanatory prose.
    // Extract the JSON object without deriving or inventing any values.
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')

    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      try {
        result = JSON.parse(
          cleaned.slice(jsonStart, jsonEnd + 1),
        )
      } catch {
        result = {
          screenshot_type: 'CME Options / Vol2Vol',
          view_type: 'UNKNOWN',
          raw_text: cleaned,
          strike_levels: [],
          unreadable_or_missing_information: [],
        }
      }
    } else {
      result = {
        screenshot_type: 'CME Options / Vol2Vol',
        view_type: 'UNKNOWN',
        raw_text: cleaned,
        strike_levels: [],
        unreadable_or_missing_information: [],
      }
    }
  }

  return {
    screenshot_type:
      result.screenshot_type ||
      'CME Options / Vol2Vol',

    view_type:
      result.view_type || 'UNKNOWN',

    raw_text:
      result.raw_text || '',

    strike_levels:
      Array.isArray(result.strike_levels)
        ? result.strike_levels
            .filter(
              (value): value is number =>
                typeof value === 'number' &&
                Number.isFinite(value),
            )
        : [],

    unreadable_or_missing_information:
      Array.isArray(
        result.unreadable_or_missing_information,
      )
        ? result.unreadable_or_missing_information
        : [],
  }
}

export type NvidiaCotRecord = {
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

export type NvidiaCotVisionResult = {
  screenshot_type: string
  records: NvidiaCotRecord[]
  unreadable_or_missing_information: string[]
}

export async function analyzeCotImageWithNvidia(
  imageBase64: string,
  apiKey: string,
): Promise<NvidiaCotVisionResult> {
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not configured')
  }

  const cleanBase64 = imageBase64
    .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
    .trim()

  if (!cleanBase64) {
    throw new Error('Image base64 is empty')
  }

  const fetchStartedAt = Date.now()

  console.log('[NVIDIA COT] FETCH START', {
    model: NVIDIA_MODEL,
    imageBase64Length: cleanBase64.length,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)

  let response: Response

  try {
    response = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        temperature: 0,
        max_tokens: 1200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `OCR TASK ONLY.

Read ONLY the visible COT positioning table in this screenshot.

This is a CFTC / Commitment of Traders style report.

The screenshot may contain multiple historical report blocks.
Extract EVERY report block that is visibly readable.

DO NOT:
- analyze the market
- calculate net positions
- calculate scores
- infer missing values
- estimate numbers
- correct OCR using memory
- combine columns
- derive totals
- invent values
- use values from another screenshot

For every visible report block extract:

report_date
total_oi
producer_long
producer_short
swap_dealer_long
swap_dealer_short
managed_money_long
managed_money_short
other_reportables_long
other_reportables_short

IMPORTANT:

1. Preserve the date exactly as visibly printed.
2. Preserve every numeric value exactly as visibly printed.
3. TOTAL OI must be associated with the date in the SAME report block.
4. Do not select only the newest report.
5. Extract all clearly readable historical report blocks.
6. Do not calculate any missing field.
7. If a field is unreadable or absent, return null.
8. If a number cannot be read confidently, return null and list the field in unreadable_or_missing_information.
9. Do not map values between different report dates.
10. Do not use chart values or visual estimates.
11. Do not calculate LONG minus SHORT.
12. Do not calculate percentages.
13. Do not infer values from row alignment if the label/column is not readable.
14. Use only values actually visible in the screenshot.

The table may visibly contain category/column labels such as:
PRODUCER
SWAP DEALER
MANAGED
NONRPT / OTHER REPORTABLES
LNG
SHRT
SPRD
TOT

Use the visible table headers to identify the correct columns.
Do not assume a value belongs to a category unless the screenshot supports that mapping.

OUTPUT:
Return ONLY valid JSON.
No markdown.
No explanation.
No prose outside JSON.

Use exactly this structure:

{
  "screenshot_type": "COT",
  "records": [
    {
      "report_date": "11/8/2569",
      "total_oi": 400309,
      "producer_long": 15716,
      "producer_short": 43651,
      "swap_dealer_long": 19092,
      "swap_dealer_short": 243797,
      "managed_money_long": 148634,
      "managed_money_short": 10972,
      "other_reportables_long": 102302,
      "other_reportables_short": 22024
    }
  ],
  "unreadable_or_missing_information": []
}

If a value is not confidently readable, use null.
Never invent a value.`,
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
    })
  } catch (error) {
    const elapsedMs = Date.now() - fetchStartedAt

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `NVIDIA COT Vision fetch timeout after 60 seconds (elapsed ${elapsedMs} ms)`,
      )
    }

    if (error instanceof Error) {
      throw new Error(
        `NVIDIA COT Vision fetch error after ${elapsedMs} ms: ${error.name}: ${error.message}`,
      )
    }

    throw new Error(
      `NVIDIA COT Vision fetch error after ${elapsedMs} ms: ${String(error)}`,
    )
  } finally {
    clearTimeout(timeout)
  }

  console.log('[NVIDIA COT] FETCH RESPONSE', {
    status: response.status,
    elapsedMs: Date.now() - fetchStartedAt,
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(
      `NVIDIA COT Vision HTTP ${response.status}: ${responseText}`,
    )
  }

  let payload: any

  try {
    payload = JSON.parse(responseText)
  } catch {
    throw new Error(
      `NVIDIA COT Vision returned invalid JSON: ${responseText}`,
    )
  }

  const content = payload?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error(
      'NVIDIA COT Vision response missing choices[0].message.content',
    )
  }

  const cleaned = String(content)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  console.log('[NVIDIA COT] CONTENT', {
    contentLength: String(content).length,
    cleanedLength: cleaned.length,
    finishReason: payload?.choices?.[0]?.finish_reason ?? null,
    contentTail: cleaned.slice(-500),
  })

  let parsed: any

  try {
    parsed = JSON.parse(cleaned)
  } catch (error) {
    console.error('[NVIDIA COT] JSON PARSE FAILED', {
      error: error instanceof Error ? error.message : String(error),
      cleanedLength: cleaned.length,
      contentTail: cleaned.slice(-1000),
    })

    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')

    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      try {
        parsed = JSON.parse(
          cleaned.slice(jsonStart, jsonEnd + 1),
        )
      } catch {
        throw new Error(
          `NVIDIA COT Vision returned incomplete/invalid model JSON (length ${cleaned.length})`,
        )
      }
    } else {
      // NVIDIA Vision may occasionally return accurate OCR as Markdown
      // despite the JSON-only instruction. Parse only explicitly printed
      // labeled values; never infer or calculate missing values.
      const lines = cleaned.split(/\r?\n/)

      const records: NvidiaCotRecord[] = []
      let current: Partial<NvidiaCotRecord> | null = null

      const numberValue = (value: string): number | null => {
        const match = value.match(/[-+]?\d[\d,]*(?:\.\d+)?/)
        if (!match) return null
        const normalized = match[0].replace(/,/g, '')
        const number = Number(normalized)
        return Number.isFinite(number) ? number : null
      }

      const fieldPatterns: Array<
        [keyof NvidiaCotRecord, RegExp]
      > = [
        ['total_oi', /total\s*oi\s*:\s*([+-]?\d[\d,]*(?:\.\d+)?)/i],
        ['producer_long', /producer\s+long\s*:\s*([+-]?\d[\d,]*(?:\.\d+)?)/i],
        ['producer_short', /producer\s+short\s*:\s*([+-]?\d[\d,]*(?:\.\d+)?)/i],
        ['swap_dealer_long', /swap\s+dealer\s+long\s*:\s*([+-]?\d[\d,]*(?:\.\d+)?)/i],
        ['swap_dealer_short', /swap\s+dealer\s+short\s*:\s*([+-]?\d[\d,]*(?:\.\d+)?)/i],
        ['managed_money_long', /managed\s+money\s+long\s*:\s*([+-]?\d[\d,]*(?:\.\d+)?)/i],
        ['managed_money_short', /managed\s+money\s+short\s*:\s*([+-]?\d[\d,]*(?:\.\d+)?)/i],
        ['other_reportables_long', /other\s+reportables\s+long\s*:\s*([+-]?\d[\d,]*(?:\.\d+)?)/i],
        ['other_reportables_short', /other\s+reportables\s+short\s*:\s*([+-]?\d[\d,]*(?:\.\d+)?)/i],
      ]

      const datePattern =
        /^\s*\**\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*\**\s*$/

      const flush = () => {
        if (!current?.report_date) return

        records.push({
          report_date: current.report_date ?? null,
          total_oi: current.total_oi ?? null,
          producer_long: current.producer_long ?? null,
          producer_short: current.producer_short ?? null,
          swap_dealer_long: current.swap_dealer_long ?? null,
          swap_dealer_short: current.swap_dealer_short ?? null,
          managed_money_long: current.managed_money_long ?? null,
          managed_money_short: current.managed_money_short ?? null,
          other_reportables_long: current.other_reportables_long ?? null,
          other_reportables_short: current.other_reportables_short ?? null,
        })
      }

      for (const line of lines) {
        const dateMatch = line.match(datePattern)

        if (dateMatch) {
          flush()
          current = { report_date: dateMatch[1] }
          continue
        }

        if (!current) continue

        for (const [field, pattern] of fieldPatterns) {
          const match = line.match(pattern)

          if (match) {
            current[field] = numberValue(match[1])
            break
          }
        }
      }

      flush()

      if (records.length > 0) {
        parsed = {
          screenshot_type: 'COT',
          records,
          unreadable_or_missing_information: [],
        }
      } else {
        throw new Error(
          `NVIDIA COT Vision returned unparseable OCR text (length ${cleaned.length})`,
        )
      }
    }
  }

  const records = Array.isArray(parsed?.records)
    ? parsed.records
        .map((record: any): NvidiaCotRecord => ({
          report_date:
            typeof record?.report_date === 'string'
              ? record.report_date.trim()
              : null,

          total_oi:
            typeof record?.total_oi === 'number' &&
            Number.isFinite(record.total_oi)
              ? record.total_oi
              : null,

          producer_long:
            typeof record?.producer_long === 'number' &&
            Number.isFinite(record.producer_long)
              ? record.producer_long
              : null,

          producer_short:
            typeof record?.producer_short === 'number' &&
            Number.isFinite(record.producer_short)
              ? record.producer_short
              : null,

          swap_dealer_long:
            typeof record?.swap_dealer_long === 'number' &&
            Number.isFinite(record.swap_dealer_long)
              ? record.swap_dealer_long
              : null,

          swap_dealer_short:
            typeof record?.swap_dealer_short === 'number' &&
            Number.isFinite(record.swap_dealer_short)
              ? record.swap_dealer_short
              : null,

          managed_money_long:
            typeof record?.managed_money_long === 'number' &&
            Number.isFinite(record.managed_money_long)
              ? record.managed_money_long
              : null,

          managed_money_short:
            typeof record?.managed_money_short === 'number' &&
            Number.isFinite(record.managed_money_short)
              ? record.managed_money_short
              : null,

          other_reportables_long:
            typeof record?.other_reportables_long === 'number' &&
            Number.isFinite(record.other_reportables_long)
              ? record.other_reportables_long
              : null,

          other_reportables_short:
            typeof record?.other_reportables_short === 'number' &&
            Number.isFinite(record.other_reportables_short)
              ? record.other_reportables_short
              : null,
        }))
    : []

  return {
    screenshot_type:
      typeof parsed?.screenshot_type === 'string'
        ? parsed.screenshot_type
        : 'COT',

    records,

    unreadable_or_missing_information:
      Array.isArray(parsed?.unreadable_or_missing_information)
        ? parsed.unreadable_or_missing_information.filter(
            (value: unknown): value is string =>
              typeof value === 'string',
          )
        : [],
  }
}
