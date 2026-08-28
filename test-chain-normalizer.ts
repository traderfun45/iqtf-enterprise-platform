import "dotenv/config"
import fs from "node:fs/promises"

import { normalizeCmeVision } from "./src/services/cmeVisionNormalizer.js"

async function main() {
  const imagePath =
    process.argv[2] ?? "./cme-options-chain.jpg"

  const key = process.env.OPENAI_API_KEY

  if (!key) {
    throw new Error("OPENAI_API_KEY is not loaded")
  }

  const imageBuffer = await fs.readFile(imagePath)
  const base64Image = imageBuffer.toString("base64")

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `
Read the CME Options Chain table in this image.

Extract clearly readable rows only.

Return ONLY JSON:

{
  "screenshot_type": "CME Options / Vol2Vol",
  "option_series": [],
  "rows": []
}

Each row MUST contain:

{
  "strike": number,
  "series": string,
  "call": number | null,
  "put": number | null
}

Rules:
- Read directly from the image.
- Do not calculate.
- Do not estimate.
- Do not invent.
- Never omit call.
- Never omit put.
- Return at most 30 rows.
`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
      }),
    },
  )

  console.log("HTTP STATUS:", response.status)

  const raw = await response.text()

  if (response.status !== 200) {
    console.error(raw)
    process.exit(1)
  }

  const data = JSON.parse(raw)

  let content = data.choices?.[0]?.message?.content ?? ""

  content = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  const visionResult = JSON.parse(content)

  console.log("\n===== TABLE RESULT =====")
  console.dir(visionResult, { depth: null })

  console.log("\n===== NORMALIZED RESULT =====")

  const normalized = normalizeCmeVision(visionResult)

  console.dir(normalized, { depth: null })
}

main().catch((error) => {
  console.error("\n===== ERROR =====")
  console.error(error)
  process.exit(1)
})
