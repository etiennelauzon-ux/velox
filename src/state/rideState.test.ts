import { describe, it, expect, beforeEach } from 'vitest';
import { rideState, setTelemetry, setDemoMode, setErgMode } from '@/state/rideState';

describe('rideState', () => {
  const initial = {
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

  beforeEach(() => {
    Object.assign(rideState, initial);
  });

  it('initializes with zeroed and falsy values', () => {
    expect(rideState).toMatchObject({
      power: 0,
      cadence: 0,
      speed: 0,
      hr: 0,
      demo: false,
      erg: false,
    });
  });

  it('setTelemetry updates only the provided fields', () => {
    setTelemetry({ power: 250 });
    expect(rideState.power).toBe(250);
    expect(rideState.cadence).toBe(0);
    expect(rideState.speed).toBe(0);
  });

  it('setDemoMode(true) enables demo mode', () => {
    setDemoMode(true);
    expect(rideState.demo).toBe(true);
  });

  it('setErgMode(true, 300) enables ERG and updates ergWatts', () => {
    setErgMode(true, 300);
    expect(rideState.erg).toBe(true);
    expect(rideState.ergWatts).toBe(300);
  });

  it('setErgMode(false) disables ERG without changing ergWatts', () => {
    rideState.ergWatts = 275;
    setErgMode(false);
    expect(rideState.erg).toBe(false);
    expect(rideState.ergWatts).toBe(275);
  });
});
