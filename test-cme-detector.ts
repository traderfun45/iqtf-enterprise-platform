import { readFile } from 'node:fs/promises'
import { runCmeOcr } from './src/services/cmeOcr.js'
import { detectCmeImageType } from './src/services/cmeImageTypeDetector.js'

async function main() {
  const imagePath = process.argv[2]

  if (!imagePath) {
    throw new Error(
      'กรุณาระบุ path ของภาพ',
    )
  }

  const image = await readFile(imagePath)
  const text = await runCmeOcr(image)
  const type = detectCmeImageType(text)

  console.log('===== CME IMAGE TYPE =====')
  console.log(type)
  console.log('==========================')
}

main().catch((error) => {
  console.error('DETECTOR TEST FAILED')
  console.error(error)
  process.exit(1)
})
