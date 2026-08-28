import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
})

async function main() {
  const response = await client.chat.completions.create({
    model: "gemini-3.6-flash",
    messages: [
      {
        role: "user",
        content: "Reply with exactly: GEMINI_OK",
      },
    ],
  })

  console.log(response.choices[0]?.message?.content)
}

main().catch((error) => {
  console.error("GEMINI TEST ERROR:")
  console.error(error)
})
