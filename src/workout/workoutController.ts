// src/workout/workoutController.ts - workout execution engine
// Pure logic: no DOM. Reads plan from workoutState, reads FTP from appStoreApi.

import { workoutState } from './workoutState';
import { status } from '@/ui/domHelpers';
import { appStoreApi } from '@/state/useAppStore';
import { Store } from '@/state/store';
import type { WorkoutProgress } from '@/types';

function rememberWorkoutHistory(): void {
  if (!workoutState.plan || workoutState.totalElapsedSec <= 0) return;
  appStoreApi.getState().addWorkoutHistory({
    name: workoutState.plan.name,
    completedAt: Date.now(),
    durationSec: Math.round(workoutState.totalElapsedSec),
  });
}

export function startWorkout(): void {
  if (!workoutState.plan) { status('No workout loaded'); return; }
  workoutState.active = true;
  workoutState.stepIndex = 0;
  workoutState.elapsedInStepSec = 0;
  workoutState.totalElapsedSec = 0;
  status('Workout started: ' + workoutState.plan.name);
  Store.emit({ type: 'workout-change' });
}

export function stopWorkout(): void {
  rememberWorkoutHistory();
  workoutState.active = false;
  status('Workout stopped');
  Store.emit({ type: 'workout-change' });
}

/**
 * Advance workout by dt seconds.
 * Returns absolute target watts for this tick, or null for free-ride steps.
 */
export function tickWorkout(dt: number): number | null {
  const { plan, active } = workoutState;
  if (!active || !plan || !plan.steps.length) return null;

  workoutState.elapsedInStepSec += dt;
  workoutState.totalElapsedSec += dt;

  while (
    workoutState.stepIndex < plan.steps.length &&
    workoutState.elapsedInStepSec >= plan.steps[workoutState.stepIndex].durationSec
  ) {
    workoutState.elapsedInStepSec -= plan.steps[workoutState.stepIndex].durationSec;
    workoutState.stepIndex++;
  }

  if (workoutState.stepIndex >= plan.steps.length) {
    workoutState.active = false;
    workoutState.stepIndex = plan.steps.length - 1;
    workoutState.elapsedInStepSec = plan.steps[plan.steps.length - 1].durationSec;
    rememberWorkoutHistory();
    status('Workout complete!');
    Store.emit({ type: 'workout-change' });
    return null;
  }

  const step = plan.steps[workoutState.stepIndex];
  if (step.powerW === null) {
    Store.emit({ type: 'workout-progress' });
    return null;
  }

  const progress = step.durationSec > 0
    ? workoutState.elapsedInStepSec / step.durationSec
    : 0;

  const rawPower = step.isRamp && step.powerEndW !== null
    ? step.powerW + (step.powerEndW - step.powerW) * progress
    : step.powerW;

  const ftp = appStoreApi.getState().rider.ftp || 250;
  Store.emit({ type: 'workout-progress' });
  return Math.round(step.ftpPct ? rawPower * ftp : rawPower);
}

export function getWorkoutProgress(): WorkoutProgress | null {
  const { plan, active, stepIndex, elapsedInStepSec, totalElapsedSec } = workoutState;
  if (!plan) return null;

  const clampedIdx = Math.min(stepIndex, plan.steps.length - 1);
  const step = plan.steps[clampedIdx];
  const remaining = step ? Math.max(0, step.durationSec - elapsedInStepSec) : 0;

  return {
    active,
    stepIndex: clampedIdx,
    stepCount: plan.steps.length,
    stepLabel: step?.label || `Step ${clampedIdx + 1}`,
    stepRemainingSec: remaining,
    totalElapsedSec,
    totalSec: plan.totalSec,
    plan,
  };
}
