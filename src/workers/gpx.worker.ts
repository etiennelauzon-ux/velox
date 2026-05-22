import { parseGpxPoints, parseFitPoints } from '../route/routeParsers';
import { rawPointArraySchema } from '@/validation';
import type { RawPoint } from '../types';

type GpxWorkerRequest =
  | { id: number; type: 'parseGpx'; text: string }
  | { id: number; type: 'parseFit'; buffer: ArrayBuffer };

type GpxWorkerResponse =
  | { id: number; ok: true; type: 'parseGpx'; result: { points: RawPoint[]; detectedName: string } }
  | { id: number; ok: true; type: 'parseFit'; result: RawPoint[] }
  | { id: number; ok: false; error: string };

self.onmessage = async (event: MessageEvent<GpxWorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === 'parseGpx') {
      const parsed = parseGpxPoints(msg.text);
      const validation = rawPointArraySchema.safeParse(parsed.points);
      if (!validation.success) {
        postMessage({ id: msg.id, ok: false, error: validation.error.message } satisfies GpxWorkerResponse);
        return;
      }
      postMessage({ id: msg.id, ok: true, type: msg.type, result: { points: validation.data, detectedName: parsed.detectedName } } satisfies GpxWorkerResponse);
      return;
    }

    if (msg.type === 'parseFit') {
      const result = await parseFitPoints(msg.buffer);
      postMessage({ id: msg.id, ok: true, type: msg.type, result } satisfies GpxWorkerResponse);
      return;
    }

    postMessage({ id: (msg as any)?.id ?? -1, ok: false, error: 'Unsupported worker action' } as unknown as GpxWorkerResponse);
  } catch (e) {
    postMessage({ id: msg.id, ok: false, error: (e as Error).message } satisfies GpxWorkerResponse);
  }
};
