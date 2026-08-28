import "dotenv/config"
import fs from "node:fs/promises"

async function main() {
  const imagePath =
    process.argv[2] ??
    "./test-cme.png"

  const key = process.env.OPENAI_API_KEY

  console.log("KEY:", key ? `LOADED ${key.length}` : "NOT_LOADED")

  const imageBuffer = await fs.readFile(imagePath)
  const base64Image = imageBuffer.toString("base64")

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Look at this image. Reply with exactly: IMAGE_OK",
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
