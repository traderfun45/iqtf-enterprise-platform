import type {
  Vol2VolSignal,
  Vol2VolConfidence,
} from './vol2vol.js'

export type Vol2VolState =
  | 'NO_POSITION'
  | 'LONG_ACTIVE'
  | 'SHORT_ACTIVE'

export type Vol2VolStateResult = {
  previousState: Vol2VolState
  state: Vol2VolState

  signal: Vol2VolSignal
  confidence: Vol2VolConfidence

  action:
    | 'ENTER_LONG'
    | 'ENTER_SHORT'
    | 'HOLD_LONG'
    | 'HOLD_SHORT'
    | 'EXIT_LONG'
    | 'EXIT_SHORT'
    | 'WAIT'
}

export function resolveVol2VolState(params: {
  previousState: Vol2VolState
  signal: Vol2VolSignal
  confidence: Vol2VolConfidence
}): Vol2VolStateResult {
  const {
    previousState,
    signal,
    confidence,
  } = params

  let state = previousState

  let action:
    | 'ENTER_LONG'
    | 'ENTER_SHORT'
    | 'HOLD_LONG'
    | 'HOLD_SHORT'
    | 'EXIT_LONG'
    | 'EXIT_SHORT'
    | 'WAIT' = 'WAIT'

  /*
   * NO POSITION
   */

  if (previousState === 'NO_POSITION') {
    if (signal === 'LONG_ENTRY') {
      state = 'LONG_ACTIVE'
      action = 'ENTER_LONG'
    } else if (signal === 'SHORT_ENTRY') {
      state = 'SHORT_ACTIVE'
      action = 'ENTER_SHORT'
    }
  }

  /*
   * LONG POSITION
   */

  else if (previousState === 'LONG_ACTIVE') {
    if (
      signal === 'LONG_EXIT' ||
      signal === 'SHORT_ENTRY' ||
      signal === 'SHORT_EXIT'
    ) {
      state = 'NO_POSITION'
      action = 'EXIT_LONG'
    } else {
      state = 'LONG_ACTIVE'
      action = 'HOLD_LONG'
    }
  }

  /*
   * SHORT POSITION
   */

  else if (previousState === 'SHORT_ACTIVE') {
    if (
      signal === 'SHORT_EXIT' ||
      signal === 'LONG_ENTRY' ||
      signal === 'LONG_EXIT'
    ) {
      state = 'NO_POSITION'
      action = 'EXIT_SHORT'
    } else {
      state = 'SHORT_ACTIVE'
      action = 'HOLD_SHORT'
    }
  }

  return {
    previousState,
    state,
    signal,
    confidence,
    action,
  }
}
