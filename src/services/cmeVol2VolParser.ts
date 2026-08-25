export type CmeVol2VolParsed = {
  futureSettlement?: number
  volatilitySettlement?: number
  putVolume?: number
  callVolume?: number
}

function parseDecimal(value: string): number | undefined {
  const normalized = value.replace(/,/g, '').trim()
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : undefined
}

function parseCount(value: string): number | undefined {
  const normalized = value.trim()

  // OCR may read 1,029 or 1.029 for a four-digit count.
  if (/^\d{1,3}[.,]\d{3}$/.test(normalized)) {
    const parsed = Number(normalized.replace(/[.,]/g, ''))
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const parsed = Number(normalized.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

export function parseCmeVol2Vol(
  text: string,
): CmeVol2VolParsed {
  const result: CmeVol2VolParsed = {}

  const futureMatch = text.match(
    /Future\s+Stl\s*\(\s*([\d,.]+)\s*\)/i,
  )

  const volMatch = text.match(
    /Vol\s+Stl\s*\(\s*([\d,.]+)\s*\)/i,
  )

  const putsMatch = text.match(
    /Puts\s*\(\s*([\d,.]+)\s*\)/i,
  )

  const callsMatch = text.match(
    /Calls\s*\(\s*([\d,.]+)\s*\)/i,
  )

  if (futureMatch) {
    result.futureSettlement = parseDecimal(futureMatch[1])
  }

  if (volMatch) {
    result.volatilitySettlement = parseDecimal(volMatch[1])
  }

  if (putsMatch) {
    result.putVolume = parseCount(putsMatch[1])
  }

  if (callsMatch) {
    result.callVolume = parseCount(callsMatch[1])
  }

  return result
}
