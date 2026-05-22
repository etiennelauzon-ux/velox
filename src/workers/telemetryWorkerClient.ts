import { clamp, solveSpeedFromPower, smoothSpeed } from '@/physics/physicsEngine';
import { getSmoothedGradeFromGPX } from '@/route/routeGeometry';
import type { PhysicsConfig, RoutePoint } from '@/types';
import { WorkerRpc } from './workerRpc';

export interface TelemetryStepInput {
  dt: number;
  power: number;
  routeDistance: number;
  vMps: number;
  physics: PhysicsConfig;
  route: RoutePoint[];
  routeLen: number;
}

export interface TelemetryStepResult {
  meters: number;
  grade: number;
  targetMps: number;
  vMps: number;
  speed: number;
}

let rpc: WorkerRpc | null | undefined;
let route: RoutePoint[] = [];
let routeLen = 0;

function getRpc(): WorkerRpc | null {
  if (rpc !== undefined) return rpc;
  try {
    rpc = new WorkerRpc(new Worker(new URL('./telemetryWorker.ts', import.meta.url), { type: 'module' }));
  } catch {
    rpc = null;
  }
  return rpc;
}

function stepTelemetryOnMainThread(input: TelemetryStepInput): TelemetryStepResult {
  const safeDt = clamp(Number(input.dt) || 1, 0.05, 3);
  const grade = getSmoothedGradeFromGPX(input.routeDistance, input.route, input.routeLen, input.physics.gradeWindowM);
  const targetMps = solveSpeedFromPower({
    powerW: input.power,
    gradeDecimal: grade / 100,
    currentMps: input.vMps,
    riderWeightKg: input.physics.riderWeightKg,
    bikeWeightKg: input.physics.bikeWeightKg,
    rho: input.physics.rho,
    g: input.physics.g,
    crr: input.physics.crr,
    cda: input.physics.cda,
    drivetrainEfficiency: input.physics.drivetrainEfficiency,
    tau: input.physics.tau,
    minTargetMps: input.physics.minTargetMps,
    maxTargetMps: input.physics.maxTargetMps,
    dtSec: safeDt,
  });
  const vMps = smoothSpeed(input.vMps, targetMps, input.physics.tau, safeDt);
  return {
    meters: vMps * safeDt,
    grade,
    targetMps,
    vMps,
    speed: clamp(vMps * 3.6, 0, input.physics.maxTargetMps * 3.6),
  };
}

export function setTelemetryRoute(nextRoute: RoutePoint[], nextRouteLen: number): void {
  route = nextRoute;
  routeLen = nextRouteLen;
  void getRpc()?.request<boolean>({ type: 'setRoute', route, routeLen }).catch(() => {});
}

export async function stepTelemetryOffThread(input: Omit<TelemetryStepInput, 'route' | 'routeLen'>): Promise<TelemetryStepResult> {
  const workerInput: TelemetryStepInput = { ...input, route, routeLen };
  const worker = getRpc();
  if (!worker) return stepTelemetryOnMainThread(workerInput);
  try {
    return await worker.request<TelemetryStepResult>({
      type: 'step',
      dt: input.dt,
      power: input.power,
      routeDistance: input.routeDistance,
      vMps: input.vMps,
      physics: input.physics,
    });
  } catch {
    return stepTelemetryOnMainThread(workerInput);
  }
}
