// src/ui/features.ts — summary overlay, FTP ramp test, app init

import { status } from '@/ui/domHelpers';
import { Store } from '@/state/store';
import { mapState }           from '@/state/mapState';
import { bluetoothState }     from '@/state/bluetoothState';
import { rideState }             from '@/state/rideState';
import recordingState from '@/state/recordingState';
import { routeState } from '@/state/routeState';
import { uiState }              from '@/state/uiState';
import { formatDuration }       from '@/utils';
import { sendErg, bluetoothDiagnostic } from '@/bluetooth/bluetooth';
import { setMapTile }           from '@/route/routeRenderer';
import type { RoutePoint }      from '@/types';

// ── Summary overlay ───────────────────────────────────────────────────────────

export function updateSummaryOverlay(): void {
  document.getElementById('summaryOverlay')?.classList.toggle('hidden', !uiState.summaryOpen);
}

export function renderSummary(): void {
  if (!uiState.summaryOpen) return;

  const avgPower = recordingState.records.length
    ? Math.round(recordingState.records.reduce((s, r) => s + r.power, 0) / recordingState.records.length)
    : 0;
  const maxPower = recordingState.records.length ? Math.max(...recordingState.records.map(r => r.power)) : 0;
  const avgHr    = recordingState.records.length
    ? Math.round(recordingState.records.reduce((s, r) => s + (r.hr || 0), 0) / recordingState.records.length)
    : 0;
  const route    = routeState.route as RoutePoint[];
  const climb    = route.length
    ? route.reduce((sum, p, i) => i ? sum + Math.max(0, p.ele - route[i - 1].ele) : sum, 0)
    : 0;

  const set = (id: string, v: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  set('summaryDuration', formatDuration(recordingState.elapsed));
  set('summaryDistance', (rideState.distance / 1000).toFixed(2) + ' km');
  set('summaryAvgPower', avgPower + ' W');
  set('summaryMaxPower', maxPower + ' W');
  set('summaryClimb',    Math.round(climb) + ' m');
  set('summaryAvgHr',    (avgHr || '--') + ' bpm');
}

export function openSummary(): void {
  uiState.summaryOpen = true;
  Store.emit({ summaryOpen: true });
  updateSummaryOverlay();
  renderSummary();
}

export function closeSummary(): void {
  uiState.summaryOpen = false;
  Store.emit({ summaryOpen: false });
  updateSummaryOverlay();
}

// ── FTP Ramp Test ─────────────────────────────────────────────────────────────

export function startFtpRampTest(): void {
  uiState.rampTest = { active: true, stage: 'warmup', step: 0, targetPower: 100, lastStepMs: Date.now() };
  Store.emit({ type: 'rampTest' });
  const btn = document.getElementById('ftpRampBtn');
  if (btn) btn.textContent = 'Stop Ramp';
  status('FTP ramp test started');
}

export function stopFtpRampTest(): void {
  uiState.rampTest = { active: false, stage: 'idle', step: 0, targetPower: 100, lastStepMs: 0 };
  Store.emit({ type: 'rampTest' });
  const btn = document.getElementById('ftpRampBtn');
  if (btn) btn.textContent = 'FTP Ramp Test';
  status('FTP ramp test stopped');
}

export function updateRampTest(): void {
  if (!uiState.rampTest.active) return;
  const now     = Date.now();
  const elapsed = (now - uiState.rampTest.lastStepMs) / 1000;
  let { step, targetPower } = uiState.rampTest;
  if (elapsed >= 30) {
    step++;
    targetPower = Math.min(600, 100 + step * 20);
    uiState.rampTest = { ...uiState.rampTest, step, targetPower, lastStepMs: now };
    Store.emit({ type: 'rampTest' });
    status('Ramp target ' + targetPower + ' W');
  }
  rideState.power = uiState.rampTest.targetPower;
  if (rideState.erg && bluetoothState.ctrlChar) void sendErg(rideState.power);
}

// ── Feature init ──────────────────────────────────────────────────────────────

export function initFeatureUI(): void {
  const tiles = document.getElementById('tileSelector') as HTMLSelectElement | null;
  if (tiles) {
    tiles.value    = mapState.mapTile || 'osm';
    tiles.onchange = e => setMapTile((e.target as HTMLSelectElement).value || 'osm');
  }
  // Topo option is declared in HTML; nothing extra needed here
  const ftpRamp = document.getElementById('ftpRampBtn');
  if (ftpRamp) {
    ftpRamp.onclick = () => uiState.rampTest.active ? stopFtpRampTest() : startFtpRampTest();
  }
  updateSummaryOverlay();
}

export function initApp(): void {
  status('Ready. Upload a GPX/FIT course or start demo.');
  const prob  = bluetoothDiagnostic();
  const logEl = document.getElementById('log');
  if (logEl) logEl.textContent = `[init] Bluetooth: ${prob || 'available'}\n` + logEl.textContent;
}
