import { WorkerRpc } from './workerRpc';
import { parseGpxPoints, parseFitPoints } from '../route/routeParsers';
import type { ParsedGpx } from '../route/routeParsers';
import type { RawPoint } from '../types';

let rpc: WorkerRpc | null | undefined;

function getRpc(): WorkerRpc | null {
  if (rpc !== undefined) return rpc;
  try {
    rpc = new WorkerRpc(new Worker(new URL('./gpx.worker.ts', import.meta.url), { type: 'module' }));
  } catch {
    rpc = null;
  }
  return rpc;
}

export async function parseGpxPointsOffThread(text: string): Promise<ParsedGpx> {
  const worker = getRpc();
  if (!worker) return parseGpxPoints(text);
  try {
    return await worker.request<ParsedGpx>({ type: 'parseGpx', text });
  } catch {
    return parseGpxPoints(text);
  }
}

export async function parseFitPointsOffThread(buf: ArrayBuffer): Promise<RawPoint[]> {
  const worker = getRpc();
  if (!worker) return parseFitPoints(buf);
  try {
    return await worker.request<RawPoint[]>({ type: 'parseFit', buffer: buf });
  } catch {
    return parseFitPoints(buf);
  }
}
