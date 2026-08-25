export type CmeImageType =
  | 'VOL2VOL_INTRADAY'
  | 'VOL2VOL_OI_CHANGE'
  | 'VOL2VOL_TOTAL_OI'
  | 'OPTIONS_CHAIN'
  | 'POSITIONING'
  | 'UNKNOWN'

export function detectCmeImageType(text: string): CmeImageType {
  const normalized = text
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()

  // 1. Vol2Vol Intraday Volume
  if (normalized.includes('INTRADAY VOLUME')) {
    return 'VOL2VOL_INTRADAY'
  }

  // 2. Vol2Vol OI Change / Volume
  // OCR may read OI as "Ol"
  if (
    normalized.includes('OI CHANGE') ||
    normalized.includes('OL CHANGE') ||
    normalized.includes('OI CHANGE / VOLUME') ||
    normalized.includes('OL CHANGE / VOLUME') ||
    normalized.includes('EXPECTED RANGE OI CHANGE') ||
    normalized.includes('EXPECTED RANGE OL CHANGE')
  ) {
    return 'VOL2VOL_OI_CHANGE'
  }

  // 3. Vol2Vol Total Open Interest
  if (
    normalized.includes('EXPECTED RANGE TOTAL OPEN INTEREST') ||
    normalized.includes('TOTAL OPEN INTEREST')
  ) {
    return 'VOL2VOL_TOTAL_OI'
  }

  // 4. CME Options Chain - header page
  const hasCall = normalized.includes('CALL')
  const hasPut = normalized.includes('PUT')
  const hasGcContract =
    normalized.includes('GCV6') ||
    normalized.includes('GCZ6') ||
    normalized.includes('GCG7')

  if (hasCall && hasPut && hasGcContract) {
    return 'OPTIONS_CHAIN'
  }

  // 5. CME Options Chain - continuation page
  // A continuation page may contain only Strike rows and
  // the Call/Put numeric matrix, without the header.
  const strikeRows = text.match(
    /^\s*4\d{3}\s+(?:[\d.,]+\s+){3,}[\d.,]+\s*$/gmi,
  )

  if (strikeRows && strikeRows.length >= 3) {
    return 'OPTIONS_CHAIN'
  }

  // 6. CME Positioning
  if (
    normalized.includes('TOTAL OI') &&
    (
      normalized.includes('MANAGED') ||
      normalized.includes('NONRET')
    )
  ) {
    return 'POSITIONING'
  }

  return 'UNKNOWN'
}
