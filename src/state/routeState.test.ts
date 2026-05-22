import { describe, it, expect, beforeEach } from 'vitest';
import { routeState, setRoute, clearRoute } from '@/state/routeState';
import type { RoutePoint } from '@/types';

describe('routeState', () => {
  beforeEach(() => {
    clearRoute();
  });

  it('setRoute sets route metadata and resets runtime fields', () => {
    const route: RoutePoint[] = [
      { lat: 0, lon: 0, ele: 0, dist: 0, grade: 0 },
      { lat: 0.001, lon: 0.001, ele: 10, dist: 100, grade: 10 },
    ];
    setRoute(route, 'Test course', 100);

    expect(routeState.route).toEqual(route);
    expect(routeState.routeLen).toBe(100);
    expect(routeState.routeName).toBe('Test course');
    expect(routeState.routeDistance).toBe(0);
    expect(routeState.stravaSegments).toEqual([]);
    expect(routeState.activeSegment).toBeNull();
    expect(routeState.segmentTimes).toEqual({});
  });

  it('clearRoute resets all fields to initial empty values', () => {
    setRoute([
      { lat: 1, lon: 1, ele: 1, dist: 1, grade: 1 },
      { lat: 2, lon: 2, ele: 2, dist: 2, grade: 2 },
    ], 'Route', 2);
    clearRoute();

    expect(routeState.route).toEqual([]);
    expect(routeState.routeLen).toBe(0);
    expect(routeState.routeName).toBe('No course');
    expect(routeState.routeDistance).toBe(0);
    expect(routeState.stravaSegments).toEqual([]);
    expect(routeState.activeSegment).toBeNull();
    expect(routeState.segmentTimes).toEqual({});
  });

  it('calling setRoute twice replaces the previous route entirely', () => {
    setRoute([
      { lat: 0, lon: 0, ele: 0, dist: 0, grade: 0 },
      { lat: 0.001, lon: 0.001, ele: 1, dist: 100, grade: 1 },
    ], 'First', 100);
    setRoute([
      { lat: 1, lon: 1, ele: 1, dist: 0, grade: 0 },
      { lat: 1.001, lon: 1.001, ele: 11, dist: 100, grade: 11 },
    ], 'Second', 100);

    expect(routeState.routeName).toBe('Second');
    expect(routeState.route.length).toBe(2);
    expect(routeState.route[0].lat).toBe(1);
  });
});
