import { downsampleHistory } from '@/ui/chartMath';
import { WorkerRpc } from './workerRpc';

let rpc: WorkerRpc | null | undefined;
let pendingKey = '';
let cacheKey = '';
let cache: number[] = [];

function getRpc(): WorkerRpc | null {
  if (rpc !== undefined) return rpc;
  try {
    rpc = new WorkerRpc(new Worker(new URL('./chartWorker.ts', import.meta.url), { type: 'module' }));
  } catch {
    rpc = null;
  }
  return rpc;
}

export function getDownsampledHistory(values: number[], limit: number): number[] {
  const key = `${values.length}:${limit}:${values[values.length - 1] ?? 0}`;
  if (cacheKey === key) return cache;
  const worker = getRpc();
  if (!worker) return downsampleHistory(values, limit);
  if (pendingKey !== key) {
    pendingKey = key;
    void worker.request<number[]>({ type: 'downsampleHistory', values: [...values], limit })
      .then(result => {
        cacheKey = key;
        cache = result;
      })
      .catch(() => {
        cacheKey = key;
        cache = downsampleHistory(values, limit);
      })
      .finally(() => {
        if (pendingKey === key) pendingKey = '';
      });
  }
  return cache.length ? cache : downsampleHistory(values, limit);
}
