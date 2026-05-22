import { describe, it, expect } from 'vitest';
import {
  buildRoutePoints,
  getSmoothedGrade,
  getSmoothedGradeFromGPX,
  positionAt,
  decodePolyline,
  getNearestRouteDistance,
} from '@/route/routeGeometry';
import type { RoutePoint } from '@/types';

describe('routeGeometry', () => {
  it('builds route points with distance, climb, grade, and smoothed grade for normal input', () => {
    const result = buildRoutePoints([
      { lat: 0, lon: 0, ele: 100 },
      { lat: 0, lon: 0.001, ele: 105 },
      { lat: 0, lon: 0.002, ele: 95 },
    ], 200);

    expect(result.points.length).toBe(3);
    expect(result.totalLen).toBeGreaterThan(200);
    expect(result.totalClimb).toBe(5);
    expect(result.points[0].dist).toBe(0);
    expect(result.points[1].dist).toBeGreaterThan(0);
    expect(result.points[1].grade).toBeGreaterThan(0);
    expect(result.points[2].grade).toBeLessThan(0);
    expect(result.points.every(pt => Number.isFinite(pt.smoothedGrade))).toBe(true);
  });

  it('buildRoutePoints throws for empty and single-point input', () => {
    expect(() => buildRoutePoints([], 100)).toThrow('Course needs at least two GPS points');
    expect(() => buildRoutePoints([{ lat: 0, lon: 0, ele: 0 }], 100)).toThrow('Course needs at least two GPS points');
  });

  it('handles identical points and negative elevation during route building', () => {
    const result = buildRoutePoints([
      { lat: 0, lon: 0, ele: 100 },
      { lat: 0, lon: 0, ele: 90 },
      { lat: 0, lon: 0, ele: 90 },
    ], 100);

    expect(result.totalLen).toBe(0);
    expect(result.totalClimb).toBe(0);
    expect(result.points[1].dist).toBe(0);
    expect(result.points[1].grade).toBe(-20);
    expect(result.points[2].grade).toBe(0);
  });

  it('returns 0 smoothed grade for empty route and handles single-point input', () => {
    expect(getSmoothedGrade(50, [], 0, 100)).toBe(0);

    const route: RoutePoint[] = [{ lat: 0, lon: 0, ele: 0, dist: 0, grade: 7 }];
    expect(getSmoothedGrade(0, route, 0, 100)).toBe(7);
  });

  it('averages grades in a centered window and returns 0 for zero window', () => {
    const route: RoutePoint[] = [
      { lat: 0, lon: 0, ele: 0, dist: 0, grade: 2 },
      { lat: 0, lon: 0.001, ele: 0, dist: 100, grade: 4 },
      { lat: 0, lon: 0.002, ele: 0, dist: 200, grade: 6 },
    ];

    expect(getSmoothedGrade(100, route, 200, 200)).toBeCloseTo(4, 6);
    expect(getSmoothedGrade(100, route, 200, 0)).toBe(0);
  });

  it('aliases getSmoothedGradeFromGPX to getSmoothedGrade', () => {
    const route: RoutePoint[] = [
      { lat: 0, lon: 0, ele: 0, dist: 0, grade: 2 },
      { lat: 0, lon: 0.001, ele: 0, dist: 100, grade: 4 },
    ];
    expect(getSmoothedGradeFromGPX(50, route, 100, 100)).toBe(getSmoothedGrade(50, route, 100, 100));
  });

  it('interpolates position normally and wraps distance beyond route length', () => {
    const route: RoutePoint[] = [
      { lat: 0, lon: 0, ele: 0, dist: 0, grade: 0 },
      { lat: 1, lon: 1, ele: 10, dist: 100, grade: 5 },
      { lat: 2, lon: 2, ele: 20, dist: 200, grade: 10 },
    ];

    const pos = positionAt(50, route, 200);
    expect(pos.lat).toBeCloseTo(0.5, 6);
    expect(pos.lon).toBeCloseTo(0.5, 6);
    expect(pos.ele).toBeCloseTo(5, 6);
    expect(pos.grade).toBeCloseTo(2.5, 6);

    const wrapped = positionAt(250, route, 200);
    expect(wrapped.lat).toBeCloseTo(0.5, 6);
  });

  it('returns zeros for empty route and exact values for single-point positionAt', () => {
    expect(positionAt(10, [], 0)).toEqual({ lat: 0, lon: 0, ele: 0, grade: 0 });

    const route: RoutePoint[] = [{ lat: 1, lon: 2, ele: 3, dist: 0, grade: 4 }];
    expect(positionAt(10, route, 0)).toEqual({ lat: 1, lon: 2, ele: 3, grade: 4 });
  });

  it('decodes an encoded polyline and returns an empty array for empty input', () => {
    const decoded = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(decoded).toEqual([
      { lat: 38.5, lon: -120.2 },
      { lat: 40.7, lon: -120.95 },
      { lat: 43.252, lon: -126.453 },
    ]);

    expect(decodePolyline('')).toEqual([]);
  });

  it('finds the nearest route distance for normal, empty, and single-point routes', () => {
    const route: RoutePoint[] = [
      { lat: 0, lon: 0, ele: 0, dist: 0, grade: 0 },
      { lat: 0, lon: 1, ele: 0, dist: 100, grade: 0 },
      { lat: 1, lon: 1, ele: 0, dist: 200, grade: 0 },
    ];

    expect(getNearestRouteDistance(0, 0.1, route)).toBe(0);
    expect(getNearestRouteDistance(1, 1, route)).toBe(200);
    expect(getNearestRouteDistance(0, 0, [])).toBe(0);

    const singlePoint: RoutePoint[] = [{ lat: 10, lon: 10, ele: 0, dist: 500, grade: 0 }];
    expect(getNearestRouteDistance(10, 10, singlePoint)).toBe(500);
  });
});
