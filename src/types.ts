// src/types.ts — shared domain types for the entire app

// ── Route ────────────────────────────────────────────────────────────────────

export interface RawPoint {
  lat: number;
  lon: number;
  ele: number;
}

export interface RoutePoint extends RawPoint {
  dist: number;
  grade: number;
  smoothedGrade?: number;
}

// ── Physics ──────────────────────────────────────────────────────────────────

export interface PhysicsConfig {
  riderWeightKg: number;
  bikeWeightKg: number;
  rho: number;
  g: number;
  crr: number;
  cda: number;
  drivetrainEfficiency: number;
  tau: number;
  minTargetMps: number;
  maxTargetMps: number;
  gradeWindowM: number;
}

/** [label, cssVar, pct] */
export type PowerZone = [string, string, number];

// ── Live / multiplayer ───────────────────────────────────────────────────────

export interface LivePeer {
  id: string;
  room?: string;
  name: string;
  color: string;
  lat: number;
  lon: number;
  ele: number;
  speed: number;
  power: number;
  cadence: number;
  hr: number;
  elapsed: number;
  routeDistance: number;
  routeLen: number;
  routeName: string;
  recording: boolean;
  updatedAt: number;
}

export interface ApiIceConfig {
  iceServers: RTCIceServer[];
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: {
    firstname?: string;
    lastname?: string;
  };
}

export interface MapillaryTokenResponse {
  token: string | null;
}

// ── Workout ──────────────────────────────────────────────────────────────────

export interface WorkoutStep {
  durationSec: number;
  /** Absolute watts or FTP factor; null = free ride */
  powerW: number | null;
  powerEndW: number | null;
  isRamp: boolean;
  /** true  → powerW is an FTP multiplier, false → absolute watts */
  ftpPct: boolean;
  label: string;
}

export interface WorkoutPlan {
  name: string;
  description: string;
  steps: WorkoutStep[];
  totalSec: number;
  ftpPct: boolean;
}

export interface WorkoutProgress {
  active: boolean;
  stepIndex: number;
  stepCount: number;
  stepLabel: string;
  stepRemainingSec: number;
  totalElapsedSec: number;
  totalSec: number;
  plan: WorkoutPlan;
}

// ── App state ────────────────────────────────────────────────────────────────

export interface RampTestState {
  active: boolean;
  stage: 'idle' | 'warmup' | 'ramp';
  step: number;
  targetPower: number;
  lastStepMs: number;
}

/** Persisted settings keys */
export type PersistedKey = 'ftp' | 'lthr' | 'ergWatts' | 'riderWeightKg';

// ── Strava segments ──────────────────────────────────────────────────────────

export interface StravaSegment {
  id: string;
  name: string;
  startDist: number;
  endDist: number;
  [key: string]: unknown;
}

// ── Record ───────────────────────────────────────────────────────────────────

export interface RideRecord {
  ts: number;
  power: number;
  hr: number;
  speed: number;
  cadence: number;
  distance: number;
  elapsed: number;
}

declare global {
  const __GIT_HASH__: string;

  interface ImportMetaEnv {
    readonly VITE_SENTRY_DSN?: string;
  }
}
