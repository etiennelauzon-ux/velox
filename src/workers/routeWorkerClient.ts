import { buildRoutePoints, getSmoothedGradeFromGPX, positionAt } from '@/route/routeGeometry';
import type { RawPoint, RoutePoint } from '@/types';
import { WorkerRpc } from './workerRpc';

let rpc: WorkerRpc | null | undefined;
let route: RoutePoint[] = [];
let routeLen = 0;

function getRpc(): WorkerRpc | null {
  if (rpc !== undefined) return rpc;
  try {
    rpc = new WorkerRpc(new Worker(new URL('./routeWorker.ts', import.meta.url), { type: 'module' }));
  } catch {
    rpc = null;
  }
  return rpc;
}

export async function buildRoutePointsOffThread(rawPoints: RawPoint[], gradeWindowM: number): Promise<ReturnType<typeof buildRoutePoints>> {
  const worker = getRpc();
  if (!worker) return buildRoutePoints(rawPoints, gradeWindowM);
  try {
    const result = await worker.request<ReturnType<typeof buildRoutePoints>>({
      type: 'buildRoute',
      rawPoints,
      gradeWindowM,
    });
    route = result.points;
    routeLen = result.totalLen;
    return result;
  } catch {
    return buildRoutePoints(rawPoints, gradeWindowM);
  }
}

export function setRouteWorkerData(nextRoute: RoutePoint[], nextRouteLen: number): void {
  route = nextRoute;
  routeLen = nextRouteLen;
  void getRpc()?.request<boolean>({ type: 'setRoute', route, routeLen }).catch(() => {});
}

export function getRoutePositionSync(dist: number): ReturnType<typeof positionAt> {
  return positionAt(dist, route, routeLen);
}

export async function getRoutePositionOffThread(dist: number): Promise<ReturnType<typeof positionAt>> {
  try {
    return await getRpc()!.request<ReturnType<typeof positionAt>>({ type: 'position', dist });
  } catch {
    return positionAt(dist, route, routeLen);
  }
}

export async function getRouteGradeOffThread(dist: number, windowM: number): Promise<number> {
  try {
    return await getRpc()!.request<number>({ type: 'grade', dist, windowM });
  } catch {
    return getSmoothedGradeFromGPX(dist, route, routeLen, windowM);
  }
}
