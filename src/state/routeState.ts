// src/state/routeState.ts — route state store

import type { RoutePoint, StravaSegment } from '@/types';

export interface RouteState {
  route: RoutePoint[];
  routeLen: number;
  routeName: string;
  routeDistance: number;
  stravaSegments: StravaSegment[];
  activeSegment: StravaSegment | null;
  segmentTimes: Record<string, { elapsedMs: number; finishedMs?: number }>;
}

export const routeState: RouteState = {
  route:          [],
  routeLen:       0,
  routeName:      'No course',
  routeDistance:  0,
  stravaSegments: [],
  activeSegment:  null,
  segmentTimes:   {},
};

export function setRoute(points: RoutePoint[], name: string, totalLen: number): void {
  routeState.route           = points;
  routeState.routeLen        = totalLen;
  routeState.routeName       = name;
  routeState.routeDistance   = 0;
  routeState.stravaSegments  = [];
  routeState.activeSegment   = null;
  routeState.segmentTimes    = {};
}

export function clearRoute(): void {
  routeState.route           = [];
  routeState.routeLen        = 0;
  routeState.routeName       = 'No course';
  routeState.routeDistance   = 0;
  routeState.stravaSegments  = [];
  routeState.activeSegment   = null;
  routeState.segmentTimes    = {};
}
