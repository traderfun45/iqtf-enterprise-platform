import "dotenv/config"
import fs from "node:fs/promises"

async function main() {
  const imagePath =
    process.argv[2] ?? "./test-cme.png"

  const key = process.env.OPENAI_API_KEY

  const imageBuffer = await fs.readFile(imagePath)
  const base64Image = Buffer.from(imageBuffer).toString("base64")

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
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `
Look carefully at this CME Group screenshot.

This is an OCR / table-reading test.

IMPORTANT:
Do NOT try to identify "concentrations" first.

FIRST, inspect the visible OPTION TABLE.

Find every clearly readable row containing:
- strike
- option series
- CALL value
- PUT value

The table may be cropped. Read whatever rows are actually visible.

Do NOT calculate.
Do NOT estimate.
Do NOT invent.

Return ONLY valid JSON in exactly this structure:

{
  "table_visible": true,
  "rows": [
    {
      "strike": 4560,
      "series": "OG3Q6",
      "call": 123,
      "put": 456
    }
  ]
}

Rules:

- "strike" must be a number.
- "series" must be the visible option series.
- "call" must be a number or null.
- "put" must be a number or null.
- NEVER omit call.
- NEVER omit put.
- If CALL is unreadable, use null.
- If PUT is unreadable, use null.
- Only include rows where the strike and at least one CALL or PUT value are actually readable.
- Return at most 30 rows.
- Do not return explanations.
- Do not use markdown.
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

  const text = await response.text()
  console.log(text)
}

main().catch(console.error)
