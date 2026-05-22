// src/physics/physicsEngine.ts — pure physics functions (no DOM, no state)

import type { PowerZone } from '@/types';

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function fmtTime(s: number): string {
  const seconds = Math.max(0, Math.floor(s));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/** Returns [label, cssVar, pct]. If ftp=0 (not set), returns placeholder zone. */
export function powerZone(w: number, ftp: number): PowerZone {
  if (!ftp) return ['--', 'var(--muted)', 0];
  const p = (w / ftp) * 100;
  if (p < 55)  return ['Z1 Recovery',   'var(--blue)',   p];
  if (p < 76)  return ['Z2 Endurance',  'var(--green)',  p];
  if (p < 88)  return ['Z3 Tempo',      'var(--yellow)', p];
  if (p < 101) return ['Z4 Threshold',  'var(--orange)', p];
  if (p < 120) return ['Z5 VO2 Max',    'var(--red)',    p];
  if (p < 151) return ['Z6 Anaerobic',  'var(--mag)',    p];
  return             ['Z7 Sprint',      'var(--cyan)',   p];
}

export function zoneColor(w: number, ftp: number): string {
  if (!ftp) return '#56708a';
  const p = (w / ftp) * 100;
  if (p < 55)  return '#5d8cff';
  if (p < 76)  return '#44d07b';
  if (p < 88)  return '#e9c54a';
  if (p < 101) return '#ff8738';
  if (p < 120) return '#ef4d4d';
  if (p < 151) return '#c65cff';
  return '#19d3ef';
}

/** HR zone based on LTHR (Coggan/Allen model). Returns '--' when no HR or no LTHR. */
export function lthrZone(hr: number, lthr: number): string {
  if (!hr || !lthr) return '--';
  const p = (hr / lthr) * 100;
  if (p < 81)  return 'Z1';
  if (p < 89)  return 'Z2';
  if (p < 94)  return 'Z3';
  if (p < 100) return 'Z4';
  if (p < 106) return 'Z5a';
  return 'Z5b';
}

/** HR zone based on Max HR (5-zone Karvonen-style). Returns '--' when no HR or no maxhr. */
export function maxhrZone(hr: number, maxhr: number): string {
  if (!hr || !maxhr) return '--';
  const p = (hr / maxhr) * 100;
  if (p < 60)  return 'Z1';
  if (p < 70)  return 'Z2';
  if (p < 80)  return 'Z3';
  if (p < 90)  return 'Z4';
  return 'Z5';
}

/** Generic HR zone dispatcher based on current mode */
export function hrZone(hr: number, mode: 'lthr' | 'maxhr' | '', lthr: number, maxhr: number): string {
  if (mode === 'lthr')  return lthrZone(hr, lthr);
  if (mode === 'maxhr') return maxhrZone(hr, maxhr);
  return '--';
}

export interface SpeedSolverParams {
  powerW: number;
  gradeDecimal: number;
  currentMps: number;
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
  dtSec: number;
}

export function solveSpeedFromPower(p: SpeedSolverParams): number {
  const totalMass = p.riderWeightKg + p.bikeWeightKg;
  const grade     = clamp(p.gradeDecimal, -0.2, 0.2);

  let v = clamp(p.currentMps, p.minTargetMps, p.maxTargetMps);
  for (let i = 0; i < 5; i++) {
    const fGrav  = totalMass * p.g * grade;
    const fRoll  = totalMass * p.g * p.crr * Math.sign(v);
    const fAero  = 0.5 * p.rho * p.cda * v * v * Math.sign(v);
    const fTotal = fGrav + fRoll + fAero;
    const vNew   = (p.powerW * p.drivetrainEfficiency) / Math.max(fTotal, 0.1);
    v = clamp(vNew, p.minTargetMps, p.maxTargetMps);
  }

  const alpha = 1 - Math.exp(-p.dtSec / p.tau);
  return p.currentMps + alpha * (v - p.currentMps);
}

export function smoothSpeed(current: number, target: number, tau: number, dt: number): number {
  const alpha = 1 - Math.exp(-dt / tau);
  return current + alpha * (target - current);
}
