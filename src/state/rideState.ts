// src/state/rideState.ts — telemetry ride state singleton

export interface RideTelemetry {
  power: number;
  cadence: number;
  speed: number;
  vMps: number;
  trainerSpeed: number;
  hr: number;
  distance: number;
  calories: number;
  demo: boolean;
  erg: boolean;
  gradeErg: boolean;
  ergWatts: number;
  demoTimer: ReturnType<typeof setInterval> | null;
}

export const rideState: RideTelemetry = {
  power: 0,
  cadence: 0,
  speed: 0,
  vMps: 0,
  trainerSpeed: 0,
  hr: 0,
  distance: 0,
  calories: 0,
  demo: false,
  erg: false,
  gradeErg: false,
  ergWatts: 200,
  demoTimer: null,
};

export function setTelemetry(patch: Partial<RideTelemetry>): void {
  Object.assign(rideState, patch);
}

export function setDemoMode(active: boolean): void {
  rideState.demo = active;
}

export function setErgMode(active: boolean, watts?: number): void {
  rideState.erg = active;
  if (typeof watts === 'number') rideState.ergWatts = watts;
}

export default rideState;
