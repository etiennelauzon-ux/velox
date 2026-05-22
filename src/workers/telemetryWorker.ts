import { clamp, solveSpeedFromPower, smoothSpeed } from '../physics/physicsEngine';
import { getSmoothedGradeFromGPX } from '../route/routeGeometry';
import type { PhysicsConfig, RoutePoint } from '../types';

interface StepRequest {
  id: number;
  type: 'step';
  dt: number;
  power: number;
  routeDistance: number;
  vMps: number;
  physics: PhysicsConfig;
}

type TelemetryWorkerRequest =
  | { id: number; type: 'setRoute'; route: RoutePoint[]; routeLen: number }
  | StepRequest;

type TelemetryWorkerResponse =
  | { id: number; ok: true; type: 'setRoute'; result: true }
  | { id: number; ok: true; type: 'step'; result: { meters: number; grade: number; targetMps: number; vMps: number; speed: number } }
  | { id: number; ok: false; error: string };

let route: RoutePoint[] = [];
let routeLen = 0;

function stepTelemetry(msg: StepRequest): { meters: number; grade: number; targetMps: number; vMps: number; speed: number } {
  const safeDt = clamp(Number(msg.dt) || 1, 0.05, 3);
  const grade = getSmoothedGradeFromGPX(msg.routeDistance, route, routeLen, msg.physics.gradeWindowM);
  const targetMps = solveSpeedFromPower({
    powerW: msg.power,
    gradeDecimal: grade / 100,
    currentMps: msg.vMps,
    riderWeightKg: msg.physics.riderWeightKg,
    bikeWeightKg: msg.physics.bikeWeightKg,
    rho: msg.physics.rho,
    g: msg.physics.g,
    crr: msg.physics.crr,
    cda: msg.physics.cda,
    drivetrainEfficiency: msg.physics.drivetrainEfficiency,
    tau: msg.physics.tau,
    minTargetMps: msg.physics.minTargetMps,
    maxTargetMps: msg.physics.maxTargetMps,
    dtSec: safeDt,
  });
  const vMps = smoothSpeed(msg.vMps, targetMps, msg.physics.tau, safeDt);
  return {
    meters: vMps * safeDt,
    grade,
    targetMps,
    vMps,
    speed: clamp(vMps * 3.6, 0, msg.physics.maxTargetMps * 3.6),
  };
}

self.onmessage = (event: MessageEvent<TelemetryWorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === 'setRoute') {
      route = msg.route;
      routeLen = msg.routeLen;
      postMessage({ id: msg.id, ok: true, type: msg.type, result: true } satisfies TelemetryWorkerResponse);
      return;
    }
    postMessage({ id: msg.id, ok: true, type: msg.type, result: stepTelemetry(msg) } satisfies TelemetryWorkerResponse);
  } catch (e) {
    postMessage({ id: msg.id, ok: false, error: (e as Error).message } satisfies TelemetryWorkerResponse);
  }
};
