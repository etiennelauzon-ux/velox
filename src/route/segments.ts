// src/route/segments.ts — Strava segment matching and chronometer

import { status, setNum } from '@/ui/domHelpers';
import { escapeHtml, fmtDuration, setBusy } from '@/utils';
import { decodePolyline } from './routeGeometry';
import { routeState } from '@/state/routeState';
import { backendUrl } from '@/config/backend';
import type { StravaSegment } from '@/types';

interface NearestResult { dist: number; meters: number }

function getNearestFull(
  point: { lat: number; lon: number },
  route: typeof routeState.route,
): NearestResult {
  let best = 0, bestDist = Infinity;
  for (const pt of route) {
    const d = Math.hypot((point.lat - pt.lat) * 111320, (point.lon - pt.lon) * 111320 * Math.cos(pt.lat * Math.PI / 180));
    if (d < bestDist) { bestDist = d; best = pt.dist; }
  }
  return { dist: best, meters: bestDist };
}

interface SegmentMatch {
  matched:      boolean;
  startDist:    number;
  endDist:      number;
  startMeters:  number;
  endMeters:    number;
  avgDeviation: number;
  sameDirection: boolean;
}

export function segmentRouteMatch(segment: Record<string, unknown>): SegmentMatch | null {
  const { route } = routeState;
  const start = (segment['start_latlng'] as number[] | undefined) || [];
  const end   = (segment['end_latlng']   as number[] | undefined) || [];
  if (start.length < 2 || end.length < 2) return null;

  const startPt = { lat: start[0], lon: start[1] };
  const endPt   = { lat: end[0],   lon: end[1] };
  const startHit = getNearestFull(startPt, route);
  const endHit   = getNearestFull(endPt,   route);

  if (startHit.meters > 120 || endHit.meters > 120) return null;

  const encoded = ((segment['map'] as Record<string, string> | undefined)?.['polyline'])
                || ((segment['map'] as Record<string, string> | undefined)?.['summary_polyline']);
  let avgDeviation = Math.max(startHit.meters, endHit.meters);

  if (encoded) {
    try {
      const pts = decodePolyline(encoded);
      if (pts.length) {
        avgDeviation = pts.reduce((sum, p) => sum + getNearestFull(p, route).meters, 0) / pts.length;
      }
    } catch { /* ignore */ }
  }

  const routeLength = Math.max(1, endHit.dist - startHit.dist);
  const segmentLength = Number(segment['distance']) || routeLength;
  const projectedEnd = Math.abs(routeLength - segmentLength) > Math.max(80, segmentLength * 0.25)
    ? startHit.dist + segmentLength
    : endHit.dist;

  return {
    matched:       startHit.meters <= 140 && avgDeviation <= 90 && endHit.dist >= startHit.dist,
    startDist:     startHit.dist,
    endDist:       projectedEnd,
    startMeters:   startHit.meters,
    endMeters:     endHit.meters,
    avgDeviation,
    sameDirection: endHit.dist >= startHit.dist,
  };
}

export async function fetchStravaStarredSegments(token: string): Promise<unknown[]> {
  const all: unknown[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(backendUrl(`/api/strava/segments?page=${page}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Strava HTTP ${res.status}`);
    const batch = await res.json() as unknown[];
    if (!Array.isArray(batch) || !batch.length) break;
    all.push(...batch);
    if (batch.length < 200) break;
  }
  return all;
}

export function renderStravaSegments(matches: Array<{ segment: Record<string, unknown>; match: SegmentMatch }>): void {
  const box = document.getElementById('stravaSegments');
  if (!box) return;
  if (!matches.length) { box.innerHTML = '<div class="small">No starred ride segments matched this GPX.</div>'; return; }
  box.innerHTML = matches.map(({ segment, match }) => {
    const km0  = (match.startDist / 1000).toFixed(2);
    const km1  = (match.endDist   / 1000).toFixed(2);
    const len  = (Number(segment['distance']) / 1000).toFixed(2);
    const id   = String(segment['id'] ?? '');
    const segmentTimes = routeState.segmentTimes as Record<string, { elapsedMs: number }>;
    const state = routeState.activeSegment && (routeState.activeSegment as StravaSegment).id === id
      ? ' active'
      : segmentTimes[id] ? ' done' : '';
    const time = segmentTimes[id]
      ? fmtDuration(segmentTimes[id].elapsedMs)
      : Math.round(Number(segment['average_grade']) || 0) + '%';
    return `<div class="segmentItem${state}"><div><b>${escapeHtml(String(segment['name'] || 'Segment'))}</b><br><span>${len} km · route km ${km0}-${km1} · avg offset ${Math.round(match.avgDeviation)}m</span></div><span>${time}</span></div>`;
  }).join('');
}

export function updateSegmentReadout(): void {
  if (routeState.activeSegment) {
    setNum('segmentName', (routeState.activeSegment as StravaSegment).name);
    setNum('segmentTime', fmtDuration(Date.now() - ((routeState.activeSegment as StravaSegment & { startedMs: number }).startedMs)));
    return;
  }
  const times = Object.values(routeState.segmentTimes as Record<string, { finishedMs: number; elapsedMs: number }>);
  const last  = times.sort((a, b) => b.finishedMs - a.finishedMs)[0];
  setNum('segmentName', last ? 'Last: ' + fmtDuration(last.elapsedMs) : 'No segment');
  setNum('segmentTime', '--:--');
}

export function updateSegmentChronometer(prevDist: number, currDist: number, now: number): void {
  const segs = routeState.stravaSegments as Array<StravaSegment & { startDist: number; endDist: number }>;
  if (!segs.length) return;
  for (const seg of segs) {
    const active = routeState.activeSegment as (StravaSegment & { startDist: number; endDist: number; startedMs: number }) | null;
    if (active && active.id === seg.id) {
      if (currDist >= seg.endDist) {
        const elapsed = now - active.startedMs;
        routeState.segmentTimes[seg.id] = { elapsedMs: elapsed, finishedMs: now } as unknown as { elapsedMs: number; finishedMs: number };
        routeState.activeSegment = null;
        status(`Segment: ${seg.name} · ${fmtDuration(elapsed)}`);
        renderStravaSegments(routeState.stravaSegments.map(s => ({
          segment: s, match: segmentRouteMatch(s)!,
        })).filter(m => m.match?.matched));
      }
      return;
    }
    if (!routeState.activeSegment && prevDist < seg.startDist && currDist >= seg.startDist) {
      routeState.activeSegment = { ...seg, startedMs: now } as unknown as StravaSegment;
    }
  }
}

export async function loadStravaStarredSegments(): Promise<void> {
  const { getValidToken } = await import(/* @vite-ignore */ '@/strava/stravaAuth');
  const token = await getValidToken();
  if (!token) { status('Connect Strava first'); return; }
  setBusy('stravaSegmentsBtn', true, 'Loading…');
  try {
    const all = await fetchStravaStarredSegments(token);
    const matched = (all as Record<string, unknown>[]).map(seg => {
      const m = segmentRouteMatch(seg);
      return m && m.matched ? { segment: seg, match: m } : null;
    }).filter(Boolean) as Array<{ segment: Record<string, unknown>; match: SegmentMatch }>;

    routeState.stravaSegments = matched.map(({ segment, match }) => ({
      id:        String(segment['id']),
      name:      String(segment['name'] || ''),
      startDist: match.startDist,
      endDist:   match.endDist,
    })) as unknown as StravaSegment[];

    renderStravaSegments(matched);
    status(`${matched.length} matching segment${matched.length === 1 ? '' : 's'} found`);
  } catch (e) {
    status('Strava error: ' + (e as Error).message);
  } finally {
    setBusy('stravaSegmentsBtn', false, 'Load Segments');
  }
}
