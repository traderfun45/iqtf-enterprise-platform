import type { CmeVisionNormalized } from './cmeVisionNormalizer.js'

export type CmeVisionValidation = {
  valid: boolean
  warnings: string[]
  errors: string[]
}

export function validateCmeVision(
  data: CmeVisionNormalized,
): CmeVisionValidation {
  const warnings: string[] = []
  const errors: string[] = []

  // Futures
  for (const future of data.underlyingFutures) {
    if (!future.symbol) {
      errors.push('Futures symbol is missing')
    }

    if (
      future.dte !== undefined &&
      future.dte < 0
    ) {
      errors.push(
        `Invalid DTE for ${future.symbol}: ${future.dte}`,
      )
    }

    if (
      future.settlement !== undefined &&
      future.settlement <= 0
    ) {
      errors.push(
        `Invalid settlement for ${future.symbol}: ${future.settlement}`,
      )
    }
  }

  // Option series
  for (const option of data.optionSeries) {
    if (!option.symbol) {
      errors.push('Option series symbol is missing')
    }

    if (
      option.dte !== undefined &&
      option.dte < 0
    ) {
      errors.push(
        `Invalid DTE for option ${option.symbol}: ${option.dte}`,
      )
    }
  }

  // Concentrations
  for (const item of data.notableConcentrations) {
    if (item.strike <= 0) {
      errors.push(
        `Invalid strike: ${item.strike}`,
      )
    }

    if (item.value < 0) {
      errors.push(
        `Invalid concentration value at ${item.strike} ${item.series}`,
      )
    }

    if (
      item.type !== 'CALL' &&
      item.type !== 'PUT'
    ) {
      errors.push(
        `Invalid option type at ${item.strike} ${item.series}`,
      )
    }
  }

  // Missing / cropped information is a warning,
  // not a fatal OCR error.
  if (data.unreadableOrMissingInformation) {
    warnings.push(
      data.unreadableOrMissingInformation,
    )
  }

  if (data.underlyingFutures.length === 0) {
    warnings.push(
      'No underlying futures were detected',
    )
  }

  if (data.optionSeries.length === 0) {
    warnings.push(
      'No option series were detected',
    )
  }

  if (data.notableConcentrations.length === 0) {
    warnings.push(
      'No option concentrations were detected',
    )
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  }
}
