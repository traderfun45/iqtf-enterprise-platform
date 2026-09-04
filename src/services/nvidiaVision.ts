import "dotenv/config"
import fs from "node:fs/promises"
import path from "node:path"

const NVIDIA_API_URL =
  "https://integrate.api.nvidia.com/v1/chat/completions"

const NVIDIA_MODEL =
  "meta/llama-3.2-11b-vision-instruct"

function getMimeType(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase()

  if (ext === ".png") return "image/png"
  if (ext === ".webp") return "image/webp"

  return "image/jpeg"
}

export async function analyzeCmeImageWithNvidia(
  imagePath: string,
) {
  const apiKey = process.env.NVIDIA_API_KEY

  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured")
  }

  const imageBuffer = await fs.readFile(imagePath)
  const base64Image = imageBuffer.toString("base64")
  const mimeType = getMimeType(imagePath)

  const response = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      max_tokens: 2200,
      temperature: 0,

      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
Transcribe the visible text and numbers from this CME Group / QuikStrike screenshot.

This is an OCR task, NOT an analysis task.

IMPORTANT:
- Output ONLY the transcription.
- Do NOT explain the screenshot.
- Do NOT summarize.
- Do NOT calculate.
- Do NOT infer.
- Do NOT guess.
- Do NOT assign numbers to CALL, PUT, OI, settlement, strike, or other fields unless that relationship is visibly written.
- Preserve numbers exactly as visible.
- Preserve labels exactly as visible.
- Keep reading/spatial order as much as possible.
- For tables, keep headers and rows in visible order.
- If something cannot be read, write [UNREADABLE].
- If something is cropped, write [CROPPED].

Pay special attention to visible labels and values in the Vol2Vol panel, especially:
Future Stl
Vol Stl
Puts
Calls
Expected Range
ATM
+1
+2
+3
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

For Expected Range / SD information:
- Preserve every visible SD label and number exactly as shown.
- Keep paired values such as Low/High together on the same line.
- Preserve the spatial/row relationship between Expected Range, ATM, +1, +2, +3 and SD values.
- Do NOT convert +1/+2/+3 into 1SD/2SD/3SD.
- Do NOT calculate SD levels.
- Do NOT infer missing SD values.
- If an SD value cannot be read, write [UNREADABLE].
Return plain text only.

Do not return JSON.
Do not return Markdown.
Do not add an introduction.
Do not add a conclusion.
`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    }),
  })

  const raw = await response.text()

  if (!response.ok) {
    throw new Error(
      `NVIDIA Vision HTTP ${response.status}: ${raw.slice(0, 1000)}`,
    )
  }

  let payload: any

  try {
    payload = JSON.parse(raw)
  } catch {
    throw new Error(
      "NVIDIA Vision returned invalid HTTP JSON",
    )
  }

  const content =
    payload?.choices?.[0]?.message?.content ?? ""

  if (!content) {
    throw new Error(
      "NVIDIA Vision returned an empty response",
    )
  }

  return {
    screenshot_type: "CME Options / Vol2Vol",
    raw_text: String(content).trim(),
    unreadable_or_missing_information: [],
  }
}
