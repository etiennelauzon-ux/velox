// src/utils.ts — shared utility helpers (no dependencies)
// DOM helpers re-exported for backward compat.
export { getEl, setNum, status, log, setBusy } from './ui/domHelpers';

export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch] ?? ch));
}

export function fmtTime(s: number): string {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60 | 0).padStart(2, '0');
}

export function formatDuration(sec: number): string {
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60 | 0).padStart(2, '0');
}

export function fmtDuration(ms: number): string {
  const total  = Math.max(0, Math.floor(ms / 1000));
  const min    = Math.floor(total / 60);
  const sec    = total % 60;
  const tenths = Math.floor((Math.max(0, ms) % 1000) / 100);
  return String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0') + '.' + tenths;
}
