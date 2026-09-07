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
