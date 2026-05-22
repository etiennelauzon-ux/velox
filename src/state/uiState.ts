// src/state/uiState.ts — UI-only flags

import type { RampTestState } from '@/types';

export const uiState = {
  summaryOpen: false as boolean,
  rampTest: {
    active:       false,
    stage:        'idle',
    step:         0,
    targetPower:  100,
    lastStepMs:   0,
  } as RampTestState,
};
