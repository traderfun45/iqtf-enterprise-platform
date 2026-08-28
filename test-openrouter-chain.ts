import "dotenv/config"
import fs from "node:fs/promises"

async function main() {
  const imagePath =
    process.argv[2] ?? "./cme-options-chain.jpg"

  const key = process.env.OPENAI_API_KEY

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
This is a CME Group Options Chain screenshot.

This is a TABLE READING TEST.

FIRST inspect the visible option table carefully.

Find clearly readable rows containing:

- strike
- option series
- CALL value
- PUT value

Do NOT identify concentrations first.

Read the numbers directly from the image.

Do NOT calculate.
Do NOT estimate.
Do NOT invent.

If CALL is unreadable, use null.
If PUT is unreadable, use null.

Return ONLY valid JSON:

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

- strike must be a number
- series must be visible
- call must be number or null
- put must be number or null
- NEVER omit call
- NEVER omit put
- Include rows where strike and at least one CALL or PUT value are clearly readable
- Return at most 30 rows
- No explanation
- No markdown
- No code fences
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
