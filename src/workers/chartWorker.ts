type ChartWorkerRequest =
  | { id: number; type: 'downsampleHistory'; values: number[]; limit: number };

type ChartWorkerResponse =
  | { id: number; ok: true; type: 'downsampleHistory'; result: number[] }
  | { id: number; ok: false; error: string };

function downsampleHistory(values: number[], limit: number): number[] {
  if (values.length <= limit) return values;
  const out: number[] = [];
  const bucket = values.length / limit;
  for (let i = 0; i < limit; i++) {
    const start = Math.floor(i * bucket);
    const end = Math.min(values.length, Math.floor((i + 1) * bucket));
    let max = 0;
    for (let j = start; j < end; j++) max = Math.max(max, values[j] || 0);
    out.push(max);
  }
  return out;
}

self.onmessage = (event: MessageEvent<ChartWorkerRequest>) => {
  const msg = event.data;
  try {
    postMessage({
      id: msg.id,
      ok: true,
      type: msg.type,
      result: downsampleHistory(msg.values, msg.limit),
    } satisfies ChartWorkerResponse);
  } catch (e) {
    postMessage({ id: msg.id, ok: false, error: (e as Error).message } satisfies ChartWorkerResponse);
  }
};
