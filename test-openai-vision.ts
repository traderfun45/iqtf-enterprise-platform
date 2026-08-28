import "dotenv/config"
import { analyzeCmeImage } from "./src/services/openaiVision.js"
import { normalizeCmeVision } from "./src/services/cmeVisionNormalizer.js"

async function main() {
  const imagePath = process.argv[2] ?? "./test-cme.png"

  console.log("===== OPENAI CME VISION TEST =====")
  console.log("Image:", imagePath)

  try {
    const visionResult = await analyzeCmeImage(imagePath)

    console.log("\n===== AI RESULT =====")
    console.dir(visionResult, { depth: null })
console.log("\n===== DEBUG CONCENTRATION FIELD =====")
console.dir(
  (visionResult as any).notable_call_put_concentrations,
  { depth: null },
)

    const normalizedResult = normalizeCmeVision(visionResult)

    console.log("\n===== NORMALIZED RESULT =====")
    console.dir(normalizedResult, { depth: null })
  } catch (error) {
    console.error("\n===== ERROR =====")
    console.error(error)
    process.exit(1)
  }
}

main()
