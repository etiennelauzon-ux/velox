export function downsampleHistory(values: number[], limit: number): number[] {
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
