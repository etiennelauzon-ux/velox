import { Store } from '@/state/store';
import recordingState, { pushRecord } from '@/state/recordingState';
import { routeState } from '@/state/routeState';
import { rideState } from '@/state/rideState';
import { physicsState } from '@/state/physicsState';
import { clamp, smoothSpeed, solveSpeedFromPower } from '@/physics/physicsEngine';
import { getSmoothedGradeFromGPX } from '@/route/routeGeometry';
import { getRoutePositionSync } from '@/workers/routeWorkerClient';
import { stepTelemetryOffThread } from '@/workers/telemetryWorkerClient';
import { updateStreetview } from '@/ui/mapillary';
import { updateSegmentChronometer } from '@/route/segments';
import { workoutState } from '@/workout/workoutState';
import { tickWorkout } from '@/workout/workoutController';
import { bluetoothState } from '@/state/bluetoothState';
import { sendErg, gradeWatts } from './control';

export function stepSimulation(dt: number): { meters: number; grade: number; targetMps: number } {
  const safeDt = clamp(Number(dt) || 1, 0.05, 3);
  const grade = getSmoothedGradeFromGPX(routeState.routeDistance, routeState.route, routeState.routeLen, physicsState.gradeWindowM);
  const target = solveSpeedFromPower({
    powerW: rideState.power,
    gradeDecimal: grade / 100,
    currentMps: rideState.vMps,
    riderWeightKg: physicsState.riderWeightKg,
    bikeWeightKg: physicsState.bikeWeightKg,
    rho: physicsState.rho,
    g: physicsState.g,
    crr: physicsState.crr,
    cda: physicsState.cda,
    drivetrainEfficiency: physicsState.drivetrainEfficiency,
    tau: physicsState.tau,
    minTargetMps: physicsState.minTargetMps,
    maxTargetMps: physicsState.maxTargetMps,
    dtSec: safeDt,
  });
  rideState.vMps = smoothSpeed(rideState.vMps, target, physicsState.tau, safeDt);
  rideState.speed = clamp(rideState.vMps * 3.6, 0, physicsState.maxTargetMps * 3.6);
  return { meters: rideState.vMps * safeDt, grade, targetMps: target };
}

export async function sample(): Promise<void> {
  const now = Date.now();
  const dt = recordingState.lastTs ? (now - recordingState.lastTs) / 1000 : 1;
  recordingState.lastTs = now;

  if (workoutState.active) {
    const targetW = tickWorkout(dt);
    if (targetW !== null) {
      if (rideState.demo) {
        rideState.power = clamp(targetW + (Math.random() - 0.5) * 10, 0, 1500);
      } else {
        await sendErg(targetW);
      }
    }
  }

  const sim = await stepTelemetryOffThread({
    dt,
    power: rideState.power,
    routeDistance: routeState.routeDistance,
    vMps: rideState.vMps,
    physics: physicsState,
  });

  rideState.vMps = sim.vMps;
  rideState.speed = sim.speed;
  const prevDist = routeState.routeDistance;
  routeState.routeDistance += sim.meters;
  rideState.distance += sim.meters;

  updateSegmentChronometer(prevDist, routeState.routeDistance, now);

  if (recordingState.recording) {
    recordingState.elapsed = Math.floor((now - recordingState.startMs) / 1000);
    rideState.calories += Math.max(0, rideState.power) * dt / 1000 * 0.86;
    pushRecord({
      ts: now,
      power: Math.round(rideState.power),
      cadence: Math.round(rideState.cadence) || 0,
      speed: rideState.speed,
      hr: Math.round(rideState.hr) || 0,
      distance: rideState.distance,
      elapsed: recordingState.elapsed,
    });
    if (rideState.gradeErg && bluetoothState.ctrlChar && rideState.erg) {
      await sendErg(gradeWatts(sim.grade));
    }
  }

  const pos = getRoutePositionSync(routeState.routeDistance);
  updateStreetview(pos, routeState.routeDistance).catch(() => {});

  Store.emit({ type: 'sample' });
}
