// src/workout/workoutState.ts — workout session state store

import type { WorkoutPlan } from '@/types';
import { Store } from '@/state/store';

export interface WorkoutState {
  plan:              WorkoutPlan | null;
  active:            boolean;
  stepIndex:         number;
  elapsedInStepSec:  number;
  totalElapsedSec:   number;
}

export const workoutState: WorkoutState = {
  plan:             null,
  active:           false,
  stepIndex:        0,
  elapsedInStepSec: 0,
  totalElapsedSec:  0,
};

export function setWorkoutPlan(plan: WorkoutPlan): void {
  workoutState.plan             = plan;
  workoutState.active           = false;
  workoutState.stepIndex        = 0;
  workoutState.elapsedInStepSec = 0;
  workoutState.totalElapsedSec  = 0;
  Store.emit({ type: 'workout-plan' });
}

export function clearWorkoutPlan(): void {
  workoutState.plan             = null;
  workoutState.active           = false;
  workoutState.stepIndex        = 0;
  workoutState.elapsedInStepSec = 0;
  workoutState.totalElapsedSec  = 0;
  Store.emit({ type: 'workout-plan' });
}
