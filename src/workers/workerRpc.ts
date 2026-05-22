export interface WorkerFailure {
  ok: false;
  error: string;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

export class WorkerRpc {
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor(private readonly worker: Worker) {
    worker.onmessage = event => {
      const msg = event.data as { id?: number; ok?: boolean; result?: unknown; error?: string };
      if (typeof msg.id !== 'number') return;
      const pending = this.pending.get(msg.id);
      if (!pending) return;
      this.pending.delete(msg.id);
      if (msg.ok) pending.resolve(msg.result);
      else pending.reject(new Error(msg.error || 'Worker request failed'));
    };
    worker.onerror = event => {
      const error = new Error(event.message || 'Worker error');
      appStoreApi.getState().reportError('worker', error);
      this.pending.forEach(p => p.reject(error));
      this.pending.clear();
    };
  }

  request<T>(message: Record<string, unknown>): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.worker.postMessage({ id, ...message });
    });
  }
}
import { appStoreApi } from '@/state/useAppStore';
