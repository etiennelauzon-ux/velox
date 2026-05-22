// src/ui/mapillary.ts — Mapillary street-view follow integration
// Full port from js/ui/mapillary.js

import { Viewer } from 'mapillary-js';
import 'mapillary-js/dist/mapillary.css';
import { routeState } from '@/state/routeState';
import { mapillaryState, PROXY_BASE, BUILTIN_MAPILLARY_TOKEN } from '@/state/mapillaryState';
import type { MapillaryTokenResponse, RoutePoint } from '@/types';

function setMlyStatus(txt: string): void {
  const el = document.getElementById('mlyStatus');
  if (el) el.textContent = txt;
}

function showFallback(on: boolean): void {
  document.getElementById('mlyFallback')?.classList.toggle('hidden', !on);
}

const rad = (d: number): number => (d * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;

function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const phi1 = rad(a.lat), phi2 = rad(b.lat), dLam = rad(b.lon - a.lon);
  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

function angDiff(a: number, b: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return Math.abs(d);
}

function haversineM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6_371_000, p = Math.PI / 180;
  const d1 = (b.lat - a.lat) * p, d2 = (b.lon - a.lon) * p;
  const x  = Math.sin(d1 / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(d2 / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function apiFetch(path: string): Promise<unknown> {
  if (mapillaryState.useProxy) {
    const base = PROXY_BASE || '';
    try {
      const res = await fetch(base + '/api/mapillary' + path);
      if (!res.ok) throw new Error('Proxy ' + res.status);
      return res.json();
    } catch (error) {
      if (!mapillaryState.token) throw error;
      mapillaryState.useProxy = false;
      setMlyStatus('Using direct Mapillary access');
    }
  }
  if (!mapillaryState.token) throw new Error('No Mapillary token');
  const res = await fetch('https://graph.mapillary.com' + path + '&access_token=' + encodeURIComponent(mapillaryState.token));
  if (!res.ok) throw new Error('Mapillary ' + res.status);
  return res.json();
}

async function fetchNearby(lat: number, lon: number): Promise<unknown[]> {
  try {
    const data = await apiFetch(
      `/images?fields=id,sequence,compass_angle,computed_compass_angle,geometry,thumb_256_url&bbox=${(lon - 0.0006).toFixed(6)},${(lat - 0.0006).toFixed(6)},${(lon + 0.0006).toFixed(6)},${(lat + 0.0006).toFixed(6)}&limit=${mapillaryState.maxCandidates}`
    ) as { data?: unknown[] };
    return data?.data ?? [];
  } catch (error) {
    setMlyStatus((error as Error).message);
    return [];
  }
}

function pickBestImage(
  candidates: unknown[],
  pos: { lat: number; lon: number },
  routeDir: number,
): { id: string; score: number } | null {
  let best: { id: string; score: number } | null = null;
  for (const img of candidates) {
    const m = img as Record<string, unknown>;
    const geom = m['geometry'] as { coordinates?: [number, number] } | undefined;
    if (!geom?.coordinates) continue;
    const [iLon, iLat] = geom.coordinates;
    const dist = haversineM(pos, { lat: iLat, lon: iLon });
    if (dist > mapillaryState.radiusM) continue;
    const angle = (m['computed_compass_angle'] ?? m['compass_angle']) as number | undefined;
    const angleDiff = angle === undefined ? 0 : angDiff(routeDir, angle);
    if (routeDir && angleDiff > 140) continue;
    const score = (mapillaryState.radiusM - dist) * 2 - angleDiff * 0.5;
    if (!best || score > best.score) best = { id: m['id'] as string, score };
  }
  return best;
}

async function loadViewer(): Promise<void> {
  if (mapillaryState.viewer || !document.getElementById('mly')) return;
  mapillaryState.viewer = new Viewer({
    accessToken: mapillaryState.token || 'dummy',
    container: 'mly',
  });
}

export async function updateStreetview(
  pos: { lat: number; lon: number; ele?: number; grade?: number },
  routeDistance: number,
): Promise<void> {
  if (!mapillaryState.enabled) return;
  const now = Date.now();
  if (now - mapillaryState.lastPickMs < mapillaryState.refreshMs) return;
  mapillaryState.lastPickMs = now;

  const route = routeState.route as RoutePoint[];
  if (!route.length) return;

  const nextDist = Math.min(routeDistance + 20, (routeState.routeLen as number) || routeDistance + 20);
  let routeDir = 0;
  if (nextDist > routeDistance) {
    const from = pos;
    // Find approximate next point direction
    const nextPt = route.find(p => p.dist >= nextDist);
    if (nextPt) routeDir = bearing(from, nextPt);
  }

  const candidates = await fetchNearby(pos.lat, pos.lon);
  if (!candidates.length) {
    showFallback(true);
    setMlyStatus(`No images near ${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}`);
    return;
  }

  const pick = pickBestImage(candidates, pos, routeDir);
  if (!pick) {
    showFallback(true);
    setMlyStatus(`${candidates.length} image candidates outside filters`);
    return;
  }

  showFallback(false);

  if (pick.id !== mapillaryState.lastImageId) {
    mapillaryState.lastImageId = pick.id;
    mapillaryState.lastScore   = pick.score;
    await loadViewer();
    if (mapillaryState.viewer) {
      try {
        await (mapillaryState.viewer as { moveTo: (id: string) => Promise<void> }).moveTo(pick.id);
      } catch { /* viewer not ready */ }
    }
    setMlyStatus(`📍 ${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}`);
  }
}

async function fetchProxyToken(): Promise<void> {
  if (!mapillaryState.useProxy) return;
  try {
    const base = PROXY_BASE || '';
    const res = await fetch(base + '/api/mapillary/token');
    if (!res.ok) return;
    const data = await res.json() as MapillaryTokenResponse;
    if (data.token) mapillaryState.token = data.token;
  } catch {
    // Ignore missing backend token and fall back to built-in token
    mapillaryState.useProxy = false;
  }
}

export function initMapillary(): void {
  void fetchProxyToken();

  const tokenInput = document.getElementById('mlyToken') as HTMLInputElement | null;
  if (tokenInput) {
    tokenInput.addEventListener('change', () => {
      const token = tokenInput.value.trim();
      mapillaryState.token = token || BUILTIN_MAPILLARY_TOKEN;
      mapillaryState.useProxy = false;
    });
  }

  const refreshSelect = document.getElementById('mlyRefresh') as HTMLSelectElement | null;
  if (refreshSelect) {
    mapillaryState.refreshMs = Number(refreshSelect.value) || mapillaryState.refreshMs;
    refreshSelect.addEventListener('change', () => {
      mapillaryState.refreshMs = Number(refreshSelect.value) || mapillaryState.refreshMs;
    });
  }

  const radiusSelect = document.getElementById('mlyRadius') as HTMLSelectElement | null;
  if (radiusSelect) {
    mapillaryState.radiusM = Number(radiusSelect.value) || mapillaryState.radiusM;
    radiusSelect.addEventListener('change', () => {
      mapillaryState.radiusM = Number(radiusSelect.value) || mapillaryState.radiusM;
    });
  }

  const streetviewToggle = document.getElementById('streetviewToggle') as HTMLInputElement | null;
  const setStreetviewEnabled = (enabled: boolean): void => {
    mapillaryState.enabled = enabled;
    const wrap = document.getElementById('mlyWrap');
    if (wrap) wrap.classList.toggle('hidden', !enabled);
    setMlyStatus(enabled ? 'Street View enabled' : 'Inactive');
    if (enabled) {
      void loadViewer();
    } else {
      showFallback(false);
    }
  };

  if (streetviewToggle) {
    streetviewToggle.addEventListener('change', () => setStreetviewEnabled(streetviewToggle.checked));
    setStreetviewEnabled(streetviewToggle.checked);
  }
}
