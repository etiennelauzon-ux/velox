import { describe, it, expect } from 'vitest';
import {
  clamp,
  fmtTime,
  powerZone,
  zoneColor,
  lthrZone,
  maxhrZone,
  hrZone,
  solveSpeedFromPower,
  smoothSpeed,
} from '@/physics/physicsEngine';

describe('physicsEngine', () => {
  it('clamps values to min and max edges and leaves in-range values unchanged', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(12, 0, 10)).toBe(10);
  });

  it('formats seconds to mm:ss and h:mm:ss correctly', () => {
    expect(fmtTime(0)).toBe('0:00');
    expect(fmtTime(61)).toBe('1:01');
    expect(fmtTime(3599)).toBe('59:59');
    expect(fmtTime(3661)).toBe('1:01:01');
  });

  it('returns the placeholder power zone when ftp is zero', () => {
    expect(powerZone(100, 0)).toEqual(['--', 'var(--muted)', 0]);
  });

  it('maps power to each of the seven FTP power zones', () => {
    const ftp = 200;
    expect(powerZone(50, ftp)[0]).toBe('Z1 Recovery');
    expect(powerZone(110, ftp)[0]).toBe('Z2 Endurance');
    expect(powerZone(170, ftp)[0]).toBe('Z3 Tempo');
    expect(powerZone(190, ftp)[0]).toBe('Z4 Threshold');
    expect(powerZone(230, ftp)[0]).toBe('Z5 VO2 Max');
    expect(powerZone(270, ftp)[0]).toBe('Z6 Anaerobic');
    expect(powerZone(320, ftp)[0]).toBe('Z7 Sprint');
  });

  it('returns the correct color at each zone boundary', () => {
    const ftp = 200;
    expect(zoneColor(109.9, ftp)).toBe('#5d8cff');
    expect(zoneColor(110, ftp)).toBe('#44d07b');
    expect(zoneColor(151.9, ftp)).toBe('#44d07b');
    expect(zoneColor(152, ftp)).toBe('#e9c54a');
    expect(zoneColor(175.9, ftp)).toBe('#e9c54a');
    expect(zoneColor(176, ftp)).toBe('#ff8738');
    expect(zoneColor(200.9, ftp)).toBe('#ff8738');
    expect(zoneColor(202, ftp)).toBe('#ef4d4d');
    expect(zoneColor(239.9, ftp)).toBe('#ef4d4d');
    expect(zoneColor(240, ftp)).toBe('#c65cff');
    expect(zoneColor(301.9, ftp)).toBe('#c65cff');
    expect(zoneColor(302, ftp)).toBe('#19d3ef');
  });

  it('assigns correct LTHR zones and handles missing values', () => {
    expect(lthrZone(0, 180)).toBe('--');
    expect(lthrZone(150, 0)).toBe('--');
    expect(lthrZone(145, 180)).toBe('Z1');
    expect(lthrZone(160, 180)).toBe('Z2');
    expect(lthrZone(165, 180)).toBe('Z3');
    expect(lthrZone(176, 180)).toBe('Z4');
    expect(lthrZone(185, 180)).toBe('Z5a');
    expect(lthrZone(195, 180)).toBe('Z5b');
  });

  it('assigns correct MaxHR zones and handles missing values', () => {
    expect(maxhrZone(0, 200)).toBe('--');
    expect(maxhrZone(150, 0)).toBe('--');
    expect(maxhrZone(110, 200)).toBe('Z1');
    expect(maxhrZone(130, 200)).toBe('Z2');
    expect(maxhrZone(150, 200)).toBe('Z3');
    expect(maxhrZone(170, 200)).toBe('Z4');
    expect(maxhrZone(190, 200)).toBe('Z5');
  });

  it('dispatches hrZone correctly for lthr, maxhr, and empty mode', () => {
    expect(hrZone(165, 'lthr', 180, 200)).toBe('Z3');
    expect(hrZone(170, 'maxhr', 180, 200)).toBe('Z4');
    expect(hrZone(170, '', 180, 200)).toBe('--');
  });

  it('solves speed for flat, uphill, and downhill scenarios', () => {
    const base = {
      powerW: 250,
      currentMps: 5,
      riderWeightKg: 70,
      bikeWeightKg: 8,
      rho: 1.225,
      g: 9.81,
      crr: 0.004,
      cda: 0.33,
      drivetrainEfficiency: 0.95,
      tau: 5,
      minTargetMps: 0,
      maxTargetMps: 20,
      dtSec: 5,
    };

    const flatSpeed = solveSpeedFromPower({ ...base, gradeDecimal: 0 });
    const uphillSpeed = solveSpeedFromPower({ ...base, gradeDecimal: 0.1 });
    const downhillSpeed = solveSpeedFromPower({ ...base, gradeDecimal: -0.1 });

    expect(uphillSpeed).toBeLessThanOrEqual(flatSpeed);
    expect(flatSpeed).toBeLessThanOrEqual(downhillSpeed);
    expect(uphillSpeed).toBeGreaterThan(0);
  });

  it('applies exponential smoothing formula in smoothSpeed', () => {
    const current = 4;
    const target = 10;
    const tau = 2;
    const dt = 1;
    const alpha = 1 - Math.exp(-dt / tau);
    expect(smoothSpeed(current, target, tau, dt)).toBeCloseTo(current + alpha * (target - current), 10);
  });

  it('returns the fallback zone color when ftp is zero', () => {
    expect(zoneColor(100, 0)).toBe('#56708a');
  });

  it('maps one representative effort to each zone color', () => {
    const ftp = 200;
    expect(zoneColor(100, ftp)).toBe('#5d8cff');
    expect(zoneColor(120, ftp)).toBe('#44d07b');
    expect(zoneColor(160, ftp)).toBe('#e9c54a');
    expect(zoneColor(180, ftp)).toBe('#ff8738');
    expect(zoneColor(220, ftp)).toBe('#ef4d4d');
    expect(zoneColor(260, ftp)).toBe('#c65cff');
    expect(zoneColor(320, ftp)).toBe('#19d3ef');
  });

  it('assigns LTHR zones at each boundary for lthr 160', () => {
    expect(lthrZone(0, 160)).toBe('--');
    expect(lthrZone(100, 0)).toBe('--');
    expect(lthrZone(129.5, 160)).toBe('Z1');
    expect(lthrZone(129.6, 160)).toBe('Z2');
    expect(lthrZone(142.4, 160)).toBe('Z3');
    expect(lthrZone(150.4, 160)).toBe('Z4');
    expect(lthrZone(160, 160)).toBe('Z5a');
    expect(lthrZone(169.6, 160)).toBe('Z5b');
  });

  it('assigns MaxHR zones at each boundary for maxhr 200', () => {
    expect(maxhrZone(0, 200)).toBe('--');
    expect(maxhrZone(119.9, 200)).toBe('Z1');
    expect(maxhrZone(120, 200)).toBe('Z2');
    expect(maxhrZone(140, 200)).toBe('Z3');
    expect(maxhrZone(160, 200)).toBe('Z4');
    expect(maxhrZone(180, 200)).toBe('Z5');
  });

  it('moves smoothSpeed toward the target and converges with a large timestep', () => {
    const moved = smoothSpeed(5, 15, 3, 1);
    expect(moved).toBeGreaterThan(5);
    expect(moved).toBeLessThan(15);
    expect(smoothSpeed(5, 15, 3, 100)).toBeCloseTo(15, 10);
  });

  it('leaves smoothSpeed unchanged when current equals target', () => {
    expect(smoothSpeed(8, 8, 3, 1)).toBe(8);
  });
});
