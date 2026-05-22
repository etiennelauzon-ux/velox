// src/ui/chart.ts — ride chart rendering

import recordingState from '@/state/recordingState';
import { zoneColor } from '@/physics/physicsEngine';
import { getDownsampledHistory } from '@/workers/chartWorkerClient';
import { routeState } from '@/state/routeState';
import { appStoreApi } from '@/state/useAppStore';
import type { RoutePoint, WorkoutPlan } from '@/types';

const elevationHoverState = new WeakMap<HTMLCanvasElement, { tooltip: HTMLDivElement; routePoints: RoutePoint[] }>();

function getDistanceLabel(dist: number, units: 'metric' | 'imperial'): string {
  if (!Number.isFinite(dist)) return '--';
  return units === 'imperial'
    ? `${(dist / 1609.344).toFixed(2)} mi`
    : `${(dist / 1000).toFixed(2)} km`;
}

function getElevationLabel(ele: number, units: 'metric' | 'imperial'): string {
  if (!Number.isFinite(ele)) return '--';
  return units === 'imperial'
    ? `${(ele * 3.28084).toFixed(0)} ft`
    : `${ele.toFixed(0)} m`;
}

function getGradeLabel(grade: number): string {
  if (!Number.isFinite(grade)) return '--';
  return `${grade.toFixed(1)} %`;
}

function getUnitsPreference(): 'metric' | 'imperial' {
  const rider = appStoreApi.getState().rider as unknown as { units?: string };
  return rider.units === 'imperial' ? 'imperial' : 'metric';
}

function createElevationTooltip(el: HTMLCanvasElement): HTMLDivElement {
  const tooltip = document.createElement('div');
  tooltip.className = 'chartTooltip';
  tooltip.style.cssText = 'position:absolute;display:none;pointer-events:none;';
  const parent = el.parentElement;
  if (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(tooltip);
  } else {
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function drawElevationHoverLine(el: HTMLCanvasElement, x: number): void {
  const ctx = el.getContext('2d');
  if (!ctx) return;
  const h = el.clientHeight;
  const pad = 16;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, pad);
  ctx.lineTo(x, h - pad);
  ctx.stroke();
  ctx.restore();
}

function updateElevationTooltipPosition(tooltip: HTMLDivElement, event: MouseEvent): void {
  const offset = 12;
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  const parent = tooltip.parentElement || document.body;
  const parentRect = parent.getBoundingClientRect();
  let left = event.clientX - parentRect.left + offset;
  let top = event.clientY - parentRect.top + offset;
  if (left + width > parentRect.width - offset) {
    left = event.clientX - parentRect.left - width - offset;
  }
  if (top + height > parentRect.height - offset) {
    top = event.clientY - parentRect.top - height - offset;
  }
  tooltip.style.left = `${Math.max(0, left)}px`;
  tooltip.style.top = `${Math.max(0, top)}px`;
}

function handleElevationMouseLeave(el: HTMLCanvasElement): void {
  const state = elevationHoverState.get(el);
  if (!state) return;
  state.tooltip.style.display = 'none';
  drawElevationProfile(el, state.routePoints);
}

function handleElevationMouseMove(el: HTMLCanvasElement, event: MouseEvent): void {
  const state = elevationHoverState.get(el);
  if (!state || state.routePoints.length < 2) return;

  const rect = el.getBoundingClientRect();
  const xCss = event.clientX - rect.left;
  const pad = 16;
  const w = el.clientWidth;
  const plotWidth = w - pad * 2;
  if (xCss < pad || xCss > w - pad) {
    state.tooltip.style.display = 'none';
    drawElevationProfile(el, state.routePoints);
    return;
  }

  const dpr = devicePixelRatio || 1;
  const x = xCss * dpr;
  const ratio = Math.max(0, Math.min(1, x / el.width));
  const index = Math.round(ratio * (state.routePoints.length - 1));
  const point = state.routePoints[Math.min(state.routePoints.length - 1, Math.max(0, index))];
  if (!point) return;

  drawElevationProfile(el, state.routePoints);
  const hoverX = pad + ratio * plotWidth;
  drawElevationHoverLine(el, hoverX);

  const units = getUnitsPreference();
  const distanceText = getDistanceLabel(Number(point.dist) || 0, units);
  const elevationText = getElevationLabel(Number(point.ele) || 0, units);
  const gradeText = getGradeLabel(Number(point.grade) || 0);

  state.tooltip.innerHTML = `<div><strong>${distanceText}</strong></div><div>${elevationText}</div><div>${gradeText}</div>`;
  state.tooltip.style.display = 'block';
  updateElevationTooltipPosition(state.tooltip, event);
}

function setupElevationHover(el: HTMLCanvasElement, routePoints: RoutePoint[]): void {
  const existing = elevationHoverState.get(el);
  if (existing) {
    existing.routePoints = routePoints;
    return;
  }

  const tooltip = createElevationTooltip(el);
  elevationHoverState.set(el, { tooltip, routePoints });

  el.addEventListener('mousemove', event => handleElevationMouseMove(el, event));
  el.addEventListener('mouseleave', () => handleElevationMouseLeave(el));
}

export function drawChart(): void {
  const c = document.getElementById('chart') as HTMLCanvasElement | null;
  if (!c) return;
  const ctx = c.getContext('2d');
  if (!ctx) return;

  const dpr = devicePixelRatio || 1;
  const w = c.clientWidth, h = c.clientHeight;
  if (!w || !h) return;
  c.width = w * dpr; c.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0b1118';
  ctx.fillRect(0, 0, w, h);

  const pad = 26, pw = w - pad - 8, ph = h - pad - 8;
  const rawHistory = recordingState.records.map(r => Math.max(0, r.power));
  const history = getDownsampledHistory(rawHistory, Math.max(60, Math.floor(pw / 2)));
  const ftp = appStoreApi.getState().rider.ftp;
  const max = Math.max(ftp * 1.5, 100, ...(history.length ? history : rawHistory)) + 20;

  ctx.strokeStyle = '#223246'; ctx.lineWidth = 1;
  ctx.font = '10px Consolas'; ctx.fillStyle = '#607993';
  [0, 0.5, 1, 1.5].forEach(f => {
    const y = 8 + ph - (ftp * f / max) * ph;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - 8, y); ctx.stroke();
    ctx.fillText(String(Math.round(ftp * f)), 4, y + 3);
  });

  if (history.length < 2) return;
  ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1], b = history[i];
    const den = Math.max(1, history.length - 1);
    const x1 = pad + ((i - 1) / den) * pw, y1 = 8 + ph - (a / max) * ph;
    const x2 = pad + (i / den) * pw,        y2 = 8 + ph - (b / max) * ph;
    ctx.strokeStyle = zoneColor(b, ftp);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
}

function drawElevationProfile(el: HTMLCanvasElement, route: RoutePoint[]): void {
  const routePoints = route;
  if (routePoints.length < 2) {
    const ctx = el.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, el.width, el.height);
    }
    return;
  }

  const dpr = devicePixelRatio || 1;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (!w || !h) return;
  el.width = w * dpr;
  el.height = h * dpr;
  const ctx = el.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const elevations = routePoints.map(p => Number(p.ele) || 0);
  const minEle = Math.min(...elevations);
  const maxEle = Math.max(...elevations);
  const range = Math.max(1, maxEle - minEle);
  const pad = 16;
  const plotWidth = w - pad * 2;
  const plotHeight = h - pad * 2;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0b1118';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#223246';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + (plotHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#19d3ef';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  routePoints.forEach((point, index) => {
    const x = pad + (index / (routePoints.length - 1)) * plotWidth;
    const y = pad + plotHeight - ((Number(point.ele) - minEle) / range) * plotHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = 'rgba(25,211,239,0.16)';
  ctx.lineTo(w - pad, h - pad);
  ctx.lineTo(pad, h - pad);
  ctx.closePath();
  ctx.fill();
}

function drawPowerDurationCurve(el: HTMLCanvasElement, records: unknown, ftp: number): void {
  const recs = Array.isArray(records) ? records as { ts: number; power: number }[] : [];
  if (recs.length < 2) {
    const ctx = el.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, el.width, el.height);
    return;
  }

  const durations = recs.map((rec, idx) => {
    const next = recs[idx + 1];
    return next ? Math.max(1, Math.round((next.ts - rec.ts) / 1000)) : 1;
  });
  const powerSamples = recs.map((rec, idx) => ({ power: Math.max(0, rec.power), duration: durations[idx] }));
  powerSamples.sort((a, b) => b.power - a.power);

  const points: Array<{ x: number; y: number }> = [];
  let cumulative = 0;
  for (const sample of powerSamples) {
    cumulative += sample.duration;
    points.push({ x: cumulative, y: sample.power });
  }
  if (points.length < 2) return;

  const dpr = devicePixelRatio || 1;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (!w || !h) return;
  el.width = w * dpr;
  el.height = h * dpr;
  const ctx = el.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const maxDuration = points[points.length - 1].x;
  const maxPower = Math.max(ftp, ...points.map(p => p.y));
  const pad = 16;
  const plotWidth = w - pad * 2;
  const plotHeight = h - pad * 2;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0b1118';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#223246';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + (plotHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#c65cff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = pad + (point.x / maxDuration) * plotWidth;
    const y = pad + plotHeight - (point.y / maxPower) * plotHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

export function drawElevationAndPdc(): void {
  const elevation = document.getElementById('elevationChart') as HTMLCanvasElement | null;
  const hasRoute = Array.isArray(routeState.route) && routeState.route.length > 1;
  if (elevation) elevation.classList.toggle('hidden', !hasRoute);
  if (hasRoute && elevation) {
    const routePoints = routeState.route as RoutePoint[];
    drawElevationProfile(elevation, routePoints);
    setupElevationHover(elevation, routePoints);
  } else if (elevation) {
    setupElevationHover(elevation, []);
  }

  const pdc = document.getElementById('pdcChart') as HTMLCanvasElement | null;
  const hasRecords = Array.isArray(recordingState.records) && recordingState.records.length > 1;
  if (pdc) pdc.classList.toggle('hidden', !hasRecords);
  if (hasRecords && pdc) {
    drawPowerDurationCurve(pdc, recordingState.records, appStoreApi.getState().rider.ftp);
  }
}

export function drawWorkoutChart(plan: WorkoutPlan | null): void {
  if (!plan) return;
  const canvas = document.getElementById('workoutChart') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = devicePixelRatio || 1;
  const W = canvas.offsetWidth || 400;
  const H = canvas.offsetHeight || 88;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const ftp = appStoreApi.getState().rider.ftp || 250;
  const totalSec = plan.totalSec || 1;
  const maxW = plan.steps.reduce((max, step) => {
    if (step.powerW === null) return max;
    const high = step.ftpPct
      ? Math.max(step.powerW, step.powerEndW ?? 0) * ftp
      : Math.max(step.powerW, step.powerEndW ?? 0);
    return Math.max(max, high);
  }, ftp * 1.3);

  let x = 0;
  for (const step of plan.steps) {
    const bw = (step.durationSec / totalSec) * W;
    if (step.powerW === null) {
      ctx.fillStyle = '#2a3a4a';
      ctx.fillRect(x, 0, bw, H);
      x += bw;
      continue;
    }

    const absStart = step.ftpPct ? step.powerW * ftp : step.powerW;
    const absEnd = step.ftpPct ? (step.powerEndW ?? step.powerW) * ftp : (step.powerEndW ?? step.powerW);
    const hStart = (absStart / maxW) * H;
    const hEnd = (absEnd / maxW) * H;

    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x, H - hStart);
    ctx.lineTo(x + bw, H - hEnd);
    ctx.lineTo(x + bw, H);
    ctx.closePath();
    ctx.fillStyle = zoneColor(absStart, ftp);
    ctx.globalAlpha = 0.82;
    ctx.fill();
    ctx.globalAlpha = 1;
    x += bw;
  }

  const ftpY = H - (ftp / maxW) * H;
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(0, ftpY);
  ctx.lineTo(W, ftpY);
  ctx.stroke();
  ctx.setLineDash([]);
}
