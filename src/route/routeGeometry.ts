// src/route/routeGeometry.ts — pure route geometry functions (no DOM, no state)

import { clamp } from '@/physics/physicsEngine';
import { haversine } from './routeParsers';
import type { RawPoint, RoutePoint } from '@/types';

export interface BuildRouteResult {
  points: RoutePoint[];
  totalLen: number;
  totalClimb: number;
}

/** Build a full RoutePoint array from raw parsed points */
export function buildRoutePoints(rawPoints: RawPoint[], gradeWindowM: number): BuildRouteResult {
  if (rawPoints.length < 2) throw new Error('Course needs at least two GPS points');

  let total = 0, climb = 0;
  let prev: RoutePoint | null = null;

  const points: RoutePoint[] = rawPoints.map(p => {
    const point: RoutePoint = {
      lat:   p.lat,
      lon:   p.lon,
      ele:   Number.isFinite(p.ele) ? p.ele : 0,
      dist:  0,
      grade: 0,
    };
    if (prev) {
      total      += haversine(prev, point);
      point.dist  = total;
      const rise  = point.ele - prev.ele;
      if (rise > 0) climb += rise;
      const dd    = Math.max(1, point.dist - prev.dist);
      point.grade = clamp((rise / dd) * 100, -20, 20);
    }
    prev = point;
    return point;
  });

  // Smooth grades with a sliding window
  points.forEach(pt => {
    pt.smoothedGrade = getSmoothedGrade(pt.dist, points, total, gradeWindowM);
  });

  return { points, totalLen: total, totalClimb: climb };
}

/** Weighted-average grade over a window centred on `dist` */
export function getSmoothedGrade(
  dist: number,
  route: RoutePoint[],
  _routeLen: number,
  windowM: number,
): number {
  const half = windowM / 2;
  let sumGrade = 0, sumWeight = 0;
  for (const pt of route) {
    const d = Math.abs(pt.dist - dist);
    if (d > half) continue;
    const w = 1 - d / half;
    sumGrade  += pt.grade * w;
    sumWeight += w;
  }
  return sumWeight > 0 ? sumGrade / sumWeight : 0;
}

export interface InterpolatedPosition {
  lat: number;
  lon: number;
  ele: number;
  grade: number;
}

/** Interpolate position along the route at a given distance */
export function positionAt(dist: number, route: RoutePoint[], routeLen: number): InterpolatedPosition {
  if (!route.length) return { lat: 0, lon: 0, ele: 0, grade: 0 };
  const d = ((dist % routeLen) + routeLen) % routeLen;

  let lo = 0, hi = route.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (route[mid].dist <= d) lo = mid; else hi = mid;
  }

  const a = route[lo], b = route[hi];
  const span = b.dist - a.dist;
  if (span < 1e-9) return { lat: a.lat, lon: a.lon, ele: a.ele, grade: a.grade };
  const t = (d - a.dist) / span;
  return {
    lat:   a.lat   + t * (b.lat   - a.lat),
    lon:   a.lon   + t * (b.lon   - a.lon),
    ele:   a.ele   + t * (b.ele   - a.ele),
    grade: a.grade + t * (b.grade - a.grade),
  };
}

/** Return smoothed grade at a given distance (used by bluetooth tick) */
export function getSmoothedGradeFromGPX(dist: number, route: RoutePoint[], routeLen: number, windowM: number): number {
  return getSmoothedGrade(dist, route, routeLen, windowM);
}

/** Decode a Google encoded polyline into lat/lon pairs */
export function decodePolyline(encoded: string): Array<{ lat: number; lon: number }> {
  const pts: Array<{ lat: number; lon: number }> = [];
  let idx = 0, lat = 0, lon = 0;
  while (idx < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; }
    while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; }
    while (b >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;
    pts.push({ lat: lat / 1e5, lon: lon / 1e5 });
  }
  return pts;
}

/** Return the nearest route distance to a lat/lon point */
export function getNearestRouteDistance(lat: number, lon: number, route: RoutePoint[]): number {
  let best = 0, bestDist = Infinity;
  for (const pt of route) {
    const d = haversine({ lat, lon }, pt);
    if (d < bestDist) { bestDist = d; best = pt.dist; }
  }
  return best;
}
