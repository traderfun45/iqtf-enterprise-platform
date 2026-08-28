import "dotenv/config"
import OpenAI from "openai"

async function main() {
  const key = process.env.OPENAI_API_KEY

  console.log("KEY PREFIX:", key?.slice(0, 12))
  console.log("KEY LENGTH:", key?.length)

  const client = new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
  })

  const response = await client.chat.completions.create({
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "user",
        content: "Reply with exactly: OK",
      },
    ],
    max_tokens: 20,
  })

  console.dir(response, { depth: 5 })
}

main().catch((err) => {
  console.error("===== SDK ERROR =====")
  console.error(err)
})
