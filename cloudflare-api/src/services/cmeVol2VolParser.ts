export type CmeVol2VolParsed = {
  futureSettlement?: number
  volatilitySettlement?: number
  putVolume?: number
  callVolume?: number

expectedRange?: {
  minus3?: number
  minus2?: number
  minus1?: number
  atm?: number
  plus1?: number
  plus2?: number
  plus3?: number
}

}

function parseDecimal(value: string): number | undefined {
  const normalized = value.replace(/,/g, '').trim()
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : undefined
}

function parseCount(value: string): number | undefined {
  const normalized = value.trim()

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
  console.log('=== PARSER INPUT START ===')
  console.log(text)
  console.log('=== PARSER INPUT END ===')

  const result: CmeVol2VolParsed = {}

  // ------------------------------------------------------------
  // Future Settlement
  // ------------------------------------------------------------

  const futureMatch = text.match(
    /Future\s+Stl\s*\(\s*([\d,.]+)\s*\)/i,
  )

  if (futureMatch) {
    result.futureSettlement = parseDecimal(
      futureMatch[1],
    )
  }

  // ------------------------------------------------------------
  // Volatility Settlement
  // ------------------------------------------------------------

  const volMatch = text.match(
    /Vol\s+Stl\s*\(\s*([\d,.]+)\s*\)/i,
  )

  if (volMatch) {
    result.volatilitySettlement = parseDecimal(
      volMatch[1],
    )
  }

  // ------------------------------------------------------------
  // Put Volume
  // ------------------------------------------------------------

  const putsMatch = text.match(
    /Puts\s*\(\s*([\d,.]+)\s*\)/i,
  )

  if (putsMatch) {
    result.putVolume = parseCount(
      putsMatch[1],
    )
  }

  // ------------------------------------------------------------
  // Call Volume
  // ------------------------------------------------------------

  const callsMatch = text.match(
    /Calls\s*\(\s*([\d,.]+)\s*\)/i,
  )

  if (callsMatch) {
    result.callVolume = parseCount(
      callsMatch[1],
    )
  }

  // ------------------------------------------------------------
  // Fallback: Future Stl : 4537.1
  // ------------------------------------------------------------

  if (result.futureSettlement === undefined) {
    const match = text.match(
      /Future\s+Stl\s*[:\-]\s*([\d,.]+)/i,
    )

    if (match) {
      result.futureSettlement = parseDecimal(
        match[1],
      )
    }
  }

  // ------------------------------------------------------------
  // Fallback: Vol Stl : 29.80
  // ------------------------------------------------------------

  if (result.volatilitySettlement === undefined) {
    const match = text.match(
      /Vol\s+Stl\s*[:\-]\s*([\d,.]+)/i,
    )

    if (match) {
      result.volatilitySettlement = parseDecimal(
        match[1],
      )
    }
  }

  // ------------------------------------------------------------
  // Fallback: Puts : 5,535
  // ------------------------------------------------------------

  if (result.putVolume === undefined) {
    const match = text.match(
      /Puts\s*[:\-]\s*([\d,.]+)/i,
    )

    if (match) {
      result.putVolume = parseCount(
        match[1],
      )
    }
  }

  // ------------------------------------------------------------
  // Fallback: Calls : 6.124
  // ------------------------------------------------------------

  if (result.callVolume === undefined) {
    const match = text.match(
      /Calls\s*[:\-]\s*([\d,.]+)/i,
    )

    if (match) {
      result.callVolume = parseCount(
        match[1],
      )
    }
  }

  // ------------------------------------------------------------
  // Expected Range
  //
  // NVIDIA Vision may return Markdown:
  // **ATM**: 4537.1
  // **+1**: 4580.8
  // ------------------------------------------------------------

  const expectedRangeText = text.replace(/\*\*/g, '')

  const atmMatch = expectedRangeText.match(
    /ATM\s*[:\-]\s*([\d,.]+)/i,
  )

  const plus1Match = expectedRangeText.match(
    /\+1\s*[:\-]\s*([\d,.]+)/i,
  )

  const plus2Match = expectedRangeText.match(
    /\+2\s*[:\-]\s*([\d,.]+)/i,
  )

  const plus3Match = expectedRangeText.match(
    /\+3\s*[:\-]\s*([\d,.]+)/i,
  )

const minus1Match = expectedRangeText.match(
  /-1\s*[:\-]\s*([\d,.]+)/i,
)

const minus2Match = expectedRangeText.match(
  /-2\s*[:\-]\s*([\d,.]+)/i,
)

const minus3Match = expectedRangeText.match(
  /-3\s*[:\-]\s*([\d,.]+)/i,
)

if (
  minus1Match ||
  minus2Match ||
  minus3Match ||
  atmMatch ||
  plus1Match ||
  plus2Match ||
  plus3Match
) {
  result.expectedRange = {
    minus3: minus3Match
      ? parseDecimal(minus3Match[1])
      : undefined,

    minus2: minus2Match
      ? parseDecimal(minus2Match[1])
      : undefined,

    minus1: minus1Match
      ? parseDecimal(minus1Match[1])
      : undefined,

    atm: atmMatch
      ? parseDecimal(atmMatch[1])
      : undefined,

    plus1: plus1Match
      ? parseDecimal(plus1Match[1])
      : undefined,

    plus2: plus2Match
      ? parseDecimal(plus2Match[1])
      : undefined,

    plus3: plus3Match
      ? parseDecimal(plus3Match[1])
      : undefined,
  }
}
  return result
}
