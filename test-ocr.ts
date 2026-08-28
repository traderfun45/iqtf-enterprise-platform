import { readFile } from 'node:fs/promises'
import { runCmeOcr } from './src/services/cmeOcr.js'

async function main() {
  const imagePath = process.argv[2]

  if (!imagePath) {
    throw new Error('กรุณาระบุ path ของภาพ เช่น: npx tsx test-ocr.ts "~/storage/downloads/image.jpg"')
  }

  console.log('OCR FILE:', imagePath)

  const image = await readFile(imagePath)
  const text = await runCmeOcr(image)

  console.log('===== OCR RESULT =====')
  console.log(text)
  console.log('===== END OCR =====')
}

main().catch((error) => {
  console.error('OCR TEST FAILED')
  console.error(error)
  process.exit(1)
})
