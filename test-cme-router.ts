import { readFile } from 'node:fs/promises'
import { runCmeOcr } from './src/services/cmeOcr.js'
import { detectCmeImageType } from './src/services/cmeImageTypeDetector.js'
import { parseCmeByImageType } from './src/services/cmeParserRouter.js'

async function main() {
  const imagePath = process.argv[2]

  if (!imagePath) {
    throw new Error('กรุณาระบุ path ของภาพ')
  }

  const image = await readFile(imagePath)
  const text = await runCmeOcr(image)

  const imageType = detectCmeImageType(text)
  const result = parseCmeByImageType(imageType, text)

  console.log('===== CME ROUTER RESULT =====')
  console.log(JSON.stringify(result, null, 2))
  console.log('=============================')
}

main().catch((error) => {
  console.error('CME ROUTER TEST FAILED')
  console.error(error)
  process.exit(1)
})
