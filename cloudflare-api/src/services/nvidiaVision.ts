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

  const response = await fetch(NVIDIA_ENDPOINT, {
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
              text: `
OCR TASK ONLY.

Read the CME Gold / Vol2Vol screenshot.
Do NOT describe the image.
Do NOT explain the image.
Do NOT summarize the image.
Do NOT analyze the market.
Do NOT calculate anything.
Do NOT infer values that are not visible.

Your ONLY task is to transcribe visible text and numbers.

CRITICAL:
- Read the actual table/chart labels and numeric values.
- Preserve decimal points exactly.
- Preserve commas in numbers when visible.
- Preserve + and - signs exactly.
- Preserve labels exactly as shown.
- Never convert +1, +2, +3 into 1SD, 2SD, 3SD.
- Never convert 1SD into +1.
- Never calculate missing values.
- Never replace an unreadable value with a guessed value.

PRIORITY FIELDS:
Future Stl
Vol Stl
Calls
Puts

Expected Range:
ATM
+1
+2
+3
-1
-2
-3

Also transcribe visible:
Future
Strike
Volatility
OI
Change
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

Return ONLY this JSON object.
No markdown.
No explanation.

{
  "screenshot_type": "CME Options / Vol2Vol",
  "raw_text": "verbatim transcription of all relevant visible text and numbers",
  "unreadable_or_missing_information": []
}

If something important is genuinely unreadable, put its label in unreadable_or_missing_information.
Do not invent its value.
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

  const responseText = await response.text()

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
