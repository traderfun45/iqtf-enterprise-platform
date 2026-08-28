require("dotenv/config")

const OpenAI = require("openai").default
const fs = require("node:fs/promises")

async function main() {
  const imagePath =
    process.argv[2] ??
    `${process.env.HOME}/storage/shared/Download/cme/vol2vol2.jpg`

  const imageBuffer = await fs.readFile(imagePath)
  const base64Image = imageBuffer.toString("base64")

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "x-goog-api-client": "iqtf-enterprise/1.0",
    },
  })

  const prompt = `
You are a STRICT OCR engine for a CME Options / Vol2Vol screenshot.

Your ONLY job is to read the VISIBLE OPTION TABLE.

Do NOT analyze the market.
Do NOT calculate anything.
Do NOT infer concentrations.
Do NOT summarize the screenshot.

Find the table containing:

STRIKE | CALL | PUT

Read the table ROW BY ROW.

For every row where the STRIKE and at least one CALL or PUT
number are clearly visible, return an object.

Use this exact JSON structure:

{
  "table_detected": true,
  "option_rows": [
    {
      "strike": 4500,
      "series": "OG3Q6",
      "call": 10694,
      "put": 1261
    }
  ]
}

Rules:
- Copy numbers directly from the image.
- Never calculate.
- Never estimate unreadable digits.
- Never invent values.
- CALL unreadable = null.
- PUT unreadable = null.
- Use OG3Q6 if that is the visible option series.
- Return every clearly readable row.
- Do not filter small values.
- Do not decide whether a row is important.
- Return [] ONLY if no strike plus CALL/PUT value is readable.

Return ONLY valid JSON.
`

  const response = await client.chat.completions.create({
    model: "google/gemini-2.5-flash",
    max_tokens: 3000,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
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
  })

  const content =
    response.choices[0]?.message?.content ?? ""

  console.log("===== RAW TABLE OCR =====")
  console.log(content)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
