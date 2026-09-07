export type NvidiaVisionResult = {
  screenshot_type: string
  raw_text: string
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
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `OCR TASK ONLY.

Read the CME Gold / Vol2Vol screenshot.

Your ONLY task is to transcribe visible text and numbers from the screenshot.

DO NOT:
- describe the image
- explain the image
- summarize the image
- analyze the market
- calculate any value
- infer missing values
- guess unreadable numbers
- convert units
- derive totals
- calculate z-scores

CRITICAL OCR RULES:
- Read the actual labels and the numeric value immediately associated with each label.
- Preserve decimal points exactly as visible.
- Preserve commas exactly as visible.
- Preserve + and - signs exactly as visible.
- Preserve labels exactly as shown.
- Do not confuse a label with a nearby number.
- Do not use a number from another row or column.
- If a label is visible but its value cannot be read confidently, report the label in unreadable_or_missing_information.
- Never invent a value.

PRIORITY 1 — VOL2VOL HEADER:
Read these fields if visible:

Future Stl
Vol Stl
Puts
Calls

For each field, capture the number directly associated with that label.

PRIORITY 2 — OPEN INTEREST:
Carefully inspect every visible occurrence of:

TOTAL OPEN INTEREST
Total Open Interest
OPEN INTEREST
Open Interest
OI
Max OI

If a numeric value is directly associated with one of these labels, transcribe BOTH the label and value into raw_text.

IMPORTANT:
- Do not assume Max OI is Total Open Interest.
- Do not assume Calls + Puts equals Total Open Interest.
- Do not calculate Total Open Interest.
- If "TOTAL OPEN INTEREST" is visible but its number is not readable, report "TOTAL OPEN INTEREST" as unreadable_or_missing_information.

PRIORITY 3 — VOLUME:
Carefully inspect visible:

Volume
VOL
Total Volume

Transcribe the actual visible number associated with the label.

Do not calculate volume from Calls and Puts.

PRIORITY 4 — OI CHANGE:
Carefully inspect visible:

Change
OI Change
Open Interest Change
Change in OI

Transcribe the actual visible signed number associated with the label.

Preserve negative and positive signs exactly.

PRIORITY 5 — EXPECTED RANGE:

Expected Range
ATM
+1
+2
+3
-1
-2
-3

Never convert +1/+2/+3 into 1SD/2SD/3SD.
Never convert 1SD/2SD/3SD into +1/+2/+3.

PRIORITY 6 — OTHER VISIBLE DATA:

Future
Strike
Volatility
Upper
Lower
High
Low
1SD
2SD
3SD
-1SD
-2SD
-3SD

Read all relevant visible numeric values.

OUTPUT RULES:

Return ONLY this JSON object.
No markdown.
No explanation.

{
  "screenshot_type": "CME Options / Vol2Vol",
  "raw_text": "verbatim transcription of all relevant visible labels and numbers",
  "unreadable_or_missing_information": []
}

The raw_text MUST contain the visible label together with its associated number whenever the number is readable.

If a priority field is visible but its value is genuinely unreadable, put the field label in unreadable_or_missing_information.

Do not calculate or infer any missing value.
`,
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
    result = {
      screenshot_type: 'CME Options / Vol2Vol',
      raw_text: cleaned,
      unreadable_or_missing_information: [],
    }
  }

  return {
    screenshot_type:
      result.screenshot_type ||
      'CME Options / Vol2Vol',

    raw_text:
      result.raw_text || '',

    unreadable_or_missing_information:
      Array.isArray(
        result.unreadable_or_missing_information,
      )
        ? result.unreadable_or_missing_information
        : [],
  }
}
