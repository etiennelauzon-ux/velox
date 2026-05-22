// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { parseErg, parseMrc, parseZwo, parseWorkoutFile } from './workoutParsers';

describe('workoutParsers', () => {
  it('parses .erg text using watts', () => {
    const erg = `
[COURSE HEADER]
Filename=example.erg
Description=Example workout
Minutes Watts=1
[END COURSE HEADER]
0 100
1 150
2 150
`;
    const plan = parseErg(erg);
    expect(plan.name).toBe('example');
    expect(plan.description).toBe('Example workout');
    expect(plan.ftpPct).toBe(false);
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]).toMatchObject({ durationSec: 60, powerW: 100, powerEndW: 150 });
  });

  it('parses .mrc text using percent', () => {
    const mrc = `
[COURSE HEADER]
Filename=ftp-example.mrc
Description=FTP workout
Minutes Percent=1
[END COURSE HEADER]
0 50
2 75
4 75
`;
    const plan = parseMrc(mrc);
    expect(plan.name).toBe('ftp-example');
    expect(plan.ftpPct).toBe(true);
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]).toMatchObject({ powerW: 0.5, powerEndW: 0.75, ftpPct: true });
  });

  it('parses a ZWO warmup and steady state workout', () => {
    const zwo = `<?xml version="1.0" encoding="UTF-8"?>
<workout>
  <name>Test ZWO</name>
  <description>Simple workout</description>
  <Warmup Duration="300" PowerLow="0.5" PowerHigh="0.75" />
  <SteadyState Duration="600" Power="0.9" />
  <Cooldown Duration="120" PowerLow="0.4" PowerHigh="0.5" />
</workout>`;

    const plan = parseZwo(zwo);
    expect(plan.name).toBe('Test ZWO');
    expect(plan.description).toBe('Simple workout');
    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[0]).toMatchObject({ durationSec: 300, powerW: 0.5, powerEndW: 0.75, isRamp: true });
    expect(plan.steps[1]).toMatchObject({ durationSec: 600, powerW: 0.9, powerEndW: 0.9, ftpPct: true });
    expect(plan.steps[2]).toMatchObject({ durationSec: 120, ftpPct: true });
  });

  it('dispatches by extension in parseWorkoutFile', () => {
    const text = `
[COURSE HEADER]
Minutes Watts=1
[END COURSE HEADER]
0 100
1 100
`;
    const plan = parseWorkoutFile(text, 'foo.erg');
    expect(plan.ftpPct).toBe(false);
  });

  it('throws for unsupported workout extensions', () => {
    expect(() => parseWorkoutFile('x', 'workout.txt')).toThrow(/Unsupported workout format/);
  });
});
