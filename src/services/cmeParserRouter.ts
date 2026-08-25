import type { CmeImageType } from './cmeImageTypeDetector.js'
import { parseCmeVol2Vol } from './cmeVol2VolParser.js'
import { parseCmeOptionsChain } from './cmeOptionsChainParser.js'

export type CmeParsedResult = {
  imageType: CmeImageType
  data: Record<string, unknown>
}

export function parseCmeByImageType(
  imageType: CmeImageType,
  text: string,
): CmeParsedResult {
  switch (imageType) {
    case 'VOL2VOL_INTRADAY':
      return {
        imageType,
        data: parseCmeVol2Vol(text),
      }

    case 'VOL2VOL_OI_CHANGE':
      return {
        imageType,
        data: parseCmeVol2Vol(text),
      }

    case 'VOL2VOL_TOTAL_OI':
      return {
        imageType,
        data: parseCmeVol2Vol(text),
      }

    case 'POSITIONING':
      return {
        imageType,
        data: {},
      }

    case 'OPTIONS_CHAIN':
      return {
        imageType,
        data: parseCmeOptionsChain(text),
      }

    default:
      return {
        imageType: 'UNKNOWN',
        data: {},
      }
  }
}
