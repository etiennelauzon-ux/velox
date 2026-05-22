// src/route/routeController.ts — route lifecycle orchestration

import { routeState, setRoute, clearRoute } from '@/state/routeState';
import { rideState } from '@/state/rideState';
import { liveState } from '@/state/liveState';
import { status, setNum } from '@/ui/domHelpers';
import { mapState, setMapRider } from '@/state/mapState';
import { physicsState } from '@/state/physicsState';
import { drawRoute } from './routeRenderer';
import { updateUINow } from '@/ui/uiLoop';
import { setBusy } from '@/utils';
import { buildRoutePointsOffThread, setRouteWorkerData } from '@/workers/routeWorkerClient';
import { parseGpxPointsOffThread, parseFitPointsOffThread } from '@/workers/gpxWorkerClient';
import { setTelemetryRoute } from '@/workers/telemetryWorkerClient';
import { appStoreApi } from '@/state/useAppStore';
import type { RawPoint } from '@/types';

async function finalizeRoute(points: RawPoint[], name: string): Promise<void> {
  const { points: built, totalLen, totalClimb } = await buildRoutePointsOffThread(points, physicsState.gradeWindowM);
  setRoute(built, name || 'Uploaded course', totalLen);
  setRouteWorkerData(routeState.route, routeState.routeLen);
  setTelemetryRoute(routeState.route, routeState.routeLen);

  // Reset route progress for the new course (legacy physics fields kept on S)
  routeState.routeDistance = 0;
  rideState.vMps = 0;
  rideState.speed = 0;
  routeState.stravaSegments = [];
  routeState.activeSegment = null;
  routeState.segmentTimes = {};

  setNum('lapDist', (totalLen / 1000).toFixed(1));
  setNum('lapElev', Math.round(totalClimb).toString());
  appStoreApi.getState().rememberRoute({
    name: routeState.routeName,
    source: name || 'Uploaded course',
    totalLen,
    savedAt: Date.now(),
  });

  const note = document.getElementById('courseNote');
  if (note) note.textContent = `Loaded ${routeState.routeName} from file.`;

  const segContainer = document.getElementById('stravaSegments');
  if (segContainer) segContainer.innerHTML = '';

  drawRoute();
  updateUINow();
  status(`Course loaded: ${routeState.routeName} · ${(totalLen / 1000).toFixed(1)} km`);
}

export async function uploadCourse(): Promise<boolean> {
  const fileInput = document.getElementById('courseFile') as HTMLInputElement | null;
  const file = fileInput?.files?.[0];
  if (!file) { status('Choose a GPX or FIT file first'); return false; }

  setBusy('importBtn', true, 'Importing...');
  const note = document.getElementById('courseNote');
  if (note) note.textContent = `Loading ${file.name}...`;

  try {
    const nameLower = file.name.toLowerCase();
    if (nameLower.endsWith('.gpx')) {
      const { points, detectedName } = await parseGpxPointsOffThread(await file.text());
      await finalizeRoute(points, detectedName || file.name.replace(/\.gpx$/i, ''));
      return true;
    } else if (nameLower.endsWith('.fit')) {
      const points = await parseFitPointsOffThread(await file.arrayBuffer());
      await finalizeRoute(points, file.name.replace(/\.fit$/i, ''));
      return true;
    } else {
      status('Unsupported file. Use GPX or FIT.');
      return false;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    appStoreApi.getState().reportError('route', e);
    if (note) note.textContent = `Course load failed: ${msg}`;
    status(`Course load failed: ${msg}`);
    return false;
  } finally {
    setBusy('importBtn', false, 'Import');
  }
}

export async function loadPresetRoute(): Promise<boolean> {
  const sel = document.getElementById('presetRoutes') as HTMLSelectElement | null;
  const val = sel?.value ?? '';
  if (!val) return false;

  status('Loading preset route...');
  try {
    const res = await fetch(`routes/${val}.gpx`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { points, detectedName } = await parseGpxPointsOffThread(await res.text());
    await finalizeRoute(points, detectedName || `${val.toUpperCase()} Route`);
    status(`Loaded preset: ${val}`);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    appStoreApi.getState().reportError('route', e);
    status(`Failed to load preset: ${msg}`);
    return false;
  }
}

export function clearCourse(): void {
  clearRoute();
  setRouteWorkerData([], 0);
  setTelemetryRoute([], 0);

  routeState.route = []; routeState.routeLen = 0; routeState.routeDistance = 0;
  rideState.vMps = 0; rideState.speed = 0; routeState.routeName = 'No course';
  routeState.stravaSegments = []; routeState.activeSegment = null; routeState.segmentTimes = {};

  const line  = mapState.line  as { remove?: () => void } | null;
  const rider = mapState.rider as { remove?: () => void } | null;
  if (line?.remove)  line.remove();
  if (rider?.remove) rider.remove();
  setMapRider(null);

  // Clean up live session data
  (liveState.markers as Map<string, { remove?: () => void }>).forEach(m => m.remove?.());
  liveState.markers.clear();
  liveState.webRTCpeers.forEach(p => p.destroy());
  liveState.webRTCpeers.clear();

  document.getElementById('map')?.classList.add('hidden');
  document.getElementById('courseEmpty')?.classList.remove('hidden');

  setNum('lapDist', '0.0');    setNum('lapElev', '0');
  setNum('gradeNow', '0.0%');  setNum('laps', '0');
  setNum('segmentTime', '--:--'); setNum('segmentName', 'No segment');

  const segContainer = document.getElementById('stravaSegments');
  if (segContainer) segContainer.innerHTML = '';
  const note = document.getElementById('courseNote');
  if (note) note.textContent = 'Upload a GPX/FIT course to ride the real track.';

  status('Course cleared');
}
