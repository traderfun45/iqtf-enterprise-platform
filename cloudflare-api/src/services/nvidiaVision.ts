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
    .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
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
You are an OCR engine for CME Gold / Vol2Vol screenshots.

Transcribe ONLY text and numbers that are visibly present in the image.

Do NOT infer missing values.
Do NOT calculate values.
Do NOT correct values.
Preserve signed labels exactly.

Pay special attention to:

Future Stl
Vol Stl
Puts
Calls
Expected Range
ATM
+1
+2
+3
-1
-2
-3
1SD
2SD
3SD
-1SD
-2SD
-3SD
Upper
Lower
High
Low
Future
Strike
Volatility
OI
Change

IMPORTANT:
If the screenshot explicitly shows +1, +2, +3, preserve those labels.
Do NOT convert +1/+2/+3 into 1SD/2SD/3SD.

Return ONLY valid JSON:

{
  "screenshot_type": "CME Options / Vol2Vol",
  "raw_text": "all visible relevant text",
  "unreadable_or_missing_information": []
}
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
