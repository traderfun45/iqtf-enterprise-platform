import { createWorker } from 'tesseract.js'

export async function runCmeOcr(
  image: Buffer,
): Promise<string> {
  const worker = await createWorker('eng')

  try {
    const {
      data: { text },
    } = await worker.recognize(image)

    return text
  } finally {
    await worker.terminate()
  }
}
