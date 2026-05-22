// src/workout/workoutParsers.ts — pure workout file parsers (.erg, .mrc, .zwo)

import type { WorkoutStep, WorkoutPlan } from '@/types';

function makeStep(
  durationSec: number,
  powerStart: number | null,
  powerEnd: number | null,
  ftpPct: boolean,
  label = '',
): WorkoutStep {
  return {
    durationSec,
    powerW:    powerStart,
    powerEndW: powerEnd,
    isRamp:    powerStart !== null && powerEnd !== null && powerStart !== powerEnd,
    ftpPct,
    label,
  };
}

// ── .erg / .mrc ──────────────────────────────────────────────────────────────

function parseErgMrc(text: string, isFtpPct: boolean): WorkoutPlan {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let inData = false;
  let name = '', description = '';
  const points: Array<{ t: number; v: number }> = [];

  for (const rawLine of lines) {
    const line  = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    const lower = line.toLowerCase();

    if (lower === '[course data]' || lower === '[end course header]') { inData = true; continue; }
    if (lower === '[end course data]')  { inData = false; continue; }
    if (lower.startsWith('['))          { inData = false; continue; }

    if (!inData) {
      const eqIdx = line.indexOf('=');
      if (eqIdx >= 0) {
        const key = line.slice(0, eqIdx).trim().toLowerCase();
        const val = line.slice(eqIdx + 1).trim();
        if (key === 'description')    description = val;
        if (key === 'filename' && !name) name = val.replace(/\.(erg|mrc)$/i, '');
        if (key === 'minutes percent') isFtpPct = true;
        if (key === 'minutes watts')   isFtpPct = false;
      }
      continue;
    }

    const parts = line.split(/[\s\t]+/);
    if (parts.length >= 2) {
      const t = parseFloat(parts[0]);
      const v = parseFloat(parts[1]);
      if (Number.isFinite(t) && Number.isFinite(v)) points.push({ t, v });
    }
  }

  if (points.length < 2) throw new Error('Workout has fewer than 2 data points');

  const steps: WorkoutStep[] = [];
  for (let i = 1; i < points.length; i++) {
    const durationSec = Math.round((points[i].t - points[i - 1].t) * 60);
    if (durationSec <= 0) continue;
    const pStart = isFtpPct ? points[i - 1].v / 100 : points[i - 1].v;
    const pEnd   = isFtpPct ? points[i].v     / 100 : points[i].v;
    steps.push(makeStep(durationSec, pStart, pEnd, isFtpPct));
  }

  if (!steps.length) throw new Error('No steps found in workout file');
  const totalSec = steps.reduce((s, st) => s + st.durationSec, 0);
  return { name: name || 'Workout', description, steps, totalSec, ftpPct: isFtpPct };
}

export const parseErg = (text: string): WorkoutPlan => parseErgMrc(text, false);
export const parseMrc = (text: string): WorkoutPlan => parseErgMrc(text, true);

// ── .zwo ─────────────────────────────────────────────────────────────────────

function za(el: Element, name: string, fallback = 0): number {
  return parseFloat(el.getAttribute(name) ?? String(fallback)) || fallback;
}

export function parseZwo(text: string): WorkoutPlan {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('Invalid ZWO XML: ' + (err.textContent ?? '').slice(0, 80));

  const name        = doc.querySelector('name')?.textContent?.trim() ?? 'Workout';
  const description = doc.querySelector('description')?.textContent?.trim() ?? '';
  const workoutEl   = doc.querySelector('workout');
  if (!workoutEl) throw new Error('No <workout> element found in ZWO');

  const steps: WorkoutStep[] = [];

  for (const el of Array.from(workoutEl.children)) {
    const tag = el.tagName;
    const dur = Math.round(za(el, 'Duration', 60));

    switch (tag) {
      case 'SteadyState':
      case 'FlatRoad': {
        const p = za(el, 'Power', 1.0);
        steps.push(makeStep(dur, p, p, true, tag === 'SteadyState' ? 'Steady' : 'Flat'));
        break;
      }
      case 'Warmup':
      case 'Ramp': {
        const lo = za(el, 'PowerLow', 0.45), hi = za(el, 'PowerHigh', 0.75);
        steps.push(makeStep(dur, lo, hi, true, 'Warmup'));
        break;
      }
      case 'Cooldown': {
        const lo = za(el, 'PowerLow', 0.35), hi = za(el, 'PowerHigh', 0.75);
        steps.push(makeStep(dur, hi, lo, true, 'Cooldown'));
        break;
      }
      case 'IntervalsT': {
        const repeat = Math.max(1, parseInt(el.getAttribute('Repeat') ?? '1'));
        const onDur  = Math.round(za(el, 'OnDuration', 30));
        const offDur = Math.round(za(el, 'OffDuration', 60));
        const onP    = za(el, 'OnPower', 1.2);
        const offP   = za(el, 'OffPower', 0.5);
        for (let i = 0; i < repeat; i++) {
          steps.push(makeStep(onDur,  onP,  onP,  true, `Interval ${i + 1}/${repeat}`));
          steps.push(makeStep(offDur, offP, offP, true, 'Recovery'));
        }
        break;
      }
      case 'MaxEffort':
        steps.push(makeStep(dur, 1.5, 1.5, true, 'Max Effort'));
        break;
      case 'FreeRide':
        steps.push({ durationSec: dur, powerW: null, powerEndW: null, isRamp: false, ftpPct: true, label: 'Free Ride' });
        break;
      default:
        break; // unknown segment — forward-compat skip
    }
  }

  if (!steps.length) throw new Error('ZWO workout contains no recognised steps');
  const totalSec = steps.reduce((s, st) => s + st.durationSec, 0);
  return { name, description, steps, totalSec, ftpPct: true };
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export function parseWorkoutFile(text: string, filename: string): WorkoutPlan {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'erg') return parseErg(text);
  if (ext === 'mrc') return parseMrc(text);
  if (ext === 'zwo') return parseZwo(text);
  throw new Error(`Unsupported workout format: .${ext}. Use .erg, .mrc, or .zwo`);
}
