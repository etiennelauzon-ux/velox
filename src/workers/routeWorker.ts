import { buildRoutePoints, getSmoothedGradeFromGPX, positionAt } from '../route/routeGeometry';
import type { RawPoint, RoutePoint } from '../types';

type RouteWorkerRequest =
  | { id: number; type: 'buildRoute'; rawPoints: RawPoint[]; gradeWindowM: number }
  | { id: number; type: 'setRoute'; route: RoutePoint[]; routeLen: number }
  | { id: number; type: 'position'; dist: number }
  | { id: number; type: 'grade'; dist: number; windowM: number };

type RouteWorkerResponse =
  | { id: number; ok: true; type: 'buildRoute'; result: ReturnType<typeof buildRoutePoints> }
  | { id: number; ok: true; type: 'setRoute'; result: true }
  | { id: number; ok: true; type: 'position'; result: ReturnType<typeof positionAt> }
  | { id: number; ok: true; type: 'grade'; result: number }
  | { id: number; ok: false; error: string };

let route: RoutePoint[] = [];
let routeLen = 0;

self.onmessage = (event: MessageEvent<RouteWorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === 'buildRoute') {
      const result = buildRoutePoints(msg.rawPoints, msg.gradeWindowM);
      route = result.points;
      routeLen = result.totalLen;
      postMessage({ id: msg.id, ok: true, type: msg.type, result } satisfies RouteWorkerResponse);
      return;
    }
    if (msg.type === 'setRoute') {
      route = msg.route;
      routeLen = msg.routeLen;
      postMessage({ id: msg.id, ok: true, type: msg.type, result: true } satisfies RouteWorkerResponse);
      return;
    }
    if (msg.type === 'position') {
      postMessage({ id: msg.id, ok: true, type: msg.type, result: positionAt(msg.dist, route, routeLen) } satisfies RouteWorkerResponse);
      return;
    }
    postMessage({ id: msg.id, ok: true, type: msg.type, result: getSmoothedGradeFromGPX(msg.dist, route, routeLen, msg.windowM) } satisfies RouteWorkerResponse);
  } catch (e) {
    postMessage({ id: msg.id, ok: false, error: (e as Error).message } satisfies RouteWorkerResponse);
  }
};
