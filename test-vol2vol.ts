import { readFile } from 'node:fs/promises'
import { runCmeOcr } from './src/services/cmeOcr.js'
import { parseCmeVol2Vol } from './src/services/cmeVol2VolParser.js'

async function main() {
  const imagePath = process.argv[2]

  if (!imagePath) {
    throw new Error(
      'กรุณาระบุ path ของภาพ เช่น: npx tsx test-vol2vol.ts "~/storage/downloads/image.jpg"',
    )
  }

  console.log('OCR FILE:', imagePath)

  const image = await readFile(imagePath)
  const text = await runCmeOcr(image)
  const parsed = parseCmeVol2Vol(text)

  console.log('===== PARSED RESULT =====')
  console.log(JSON.stringify(parsed, null, 2))

  console.log('===== RAW OCR =====')
  console.log(text)
}

main().catch((error) => {
  console.error('VOL2VOL TEST FAILED')
  console.error(error)
  process.exit(1)
})
