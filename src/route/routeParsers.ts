// src/route/routeParsers.ts — pure GPX and FIT parsing (no DOM, no state)

import FitParser from 'fit-file-parser';
import type { RawPoint } from '@/types';
import { parsedGpxSchema, rawPointArraySchema } from '@/validation';

const fitParser = new FitParser({ force: true, mode: 'list' });

const fitSemicirclesToDegrees = (value: number): number =>
  Math.abs(value) <= 180 ? value : value * 180 / 2_147_483_648;

const fitRecordsFromParsed = (fit: unknown): Array<Record<string, unknown>> => {
  const raw = fit as Record<string, unknown>;
  const results: Array<Record<string, unknown>> = [];

  const pushRecords = (candidate: unknown): void => {
    if (!Array.isArray(candidate)) return;
    for (const item of candidate) {
      if (!item || typeof item !== 'object') continue;
      const itemObj = item as Record<string, unknown>;
      if (typeof itemObj.position_lat === 'number' || typeof itemObj.position_long === 'number') {
        results.push(itemObj);
      }
      pushRecords(itemObj.records);
      pushRecords(itemObj.laps);
      pushRecords(itemObj.sessions);
    }
  };

  if (Array.isArray(raw.records)) pushRecords(raw.records);
  pushRecords(raw.sessions);
  pushRecords(raw.laps);
  pushRecords(raw.activity);

  return results;
};

/** Haversine distance between two lat/lon points in metres */
export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6_371_000, p = Math.PI / 180,
    d1 = (b.lat - a.lat) * p,
    d2 = (b.lon - a.lon) * p,
    x  = Math.sin(d1 / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(d2 / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export interface ParsedGpx {
  points: RawPoint[];
  detectedName: string;
}

/** Parse a GPX string and return raw points */
export function parseGpxPoints(text: string): ParsedGpx {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid GPX XML');

  const textOf = (node: Element | Document, name: string): string => {
    const found = Array.from(node.getElementsByTagName('*')).find(x => x.localName === name);
    return found?.textContent ?? '';
  };

  const nameEl = textOf(doc, 'name');
  const pts = Array.from(doc.getElementsByTagName('trkpt')).map(n => ({
    lat: Number(n.getAttribute('lat')),
    lon: Number(n.getAttribute('lon')),
    ele: Number(textOf(n, 'ele')) || 0,
  })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  return parsedGpxSchema.parse({ points: pts, detectedName: nameEl });
}

/** Parse a FIT ArrayBuffer and return raw points */
export async function parseFitPoints(buf: ArrayBuffer): Promise<RawPoint[]> {
  const parsed = await fitParser.parseAsync(buf);
  const rawRecords = fitRecordsFromParsed(parsed);

  const points = rawRecords
    .map(record => {
      const lat = record.position_lat;
      const lon = record.position_long;
      const rawAlt = record.enhanced_altitude ?? record.altitude;

      if (typeof lat !== 'number' || typeof lon !== 'number') return null;

      return {
        lat: fitSemicirclesToDegrees(lat),
        lon: fitSemicirclesToDegrees(lon),
        ele: typeof rawAlt === 'number' && Number.isFinite(rawAlt) ? rawAlt : 0,
      } as RawPoint;
    })
    .filter((point): point is RawPoint => point !== null);

  return rawPointArraySchema.parse(points);
}
