// src/ui/domHelpers.ts — typed DOM query and update helpers

export function getEl(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function setNum(id: string, v: string | number): void {
  const el = document.getElementById(id);
  if (el) el.textContent = String(v);
}

export function status(msg: string): void {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

export function log(msg: string): void {
  const t  = new Date().toLocaleTimeString();
  const el = document.getElementById('log');
  if (el) el.textContent = `[${t}] ${msg}\n` + el.textContent;
}

export function setBusy(id: string, busy: boolean, label?: string): void {
  const el = document.getElementById(id) as HTMLButtonElement | null;
  if (!el) return;
  el.disabled = busy;
  if (label) el.textContent = label;
}

let renderQueued = false;
export function scheduleUI(callback: () => void): void {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    callback();
  });
}
