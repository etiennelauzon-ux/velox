// src/state/appState.ts — global app state, event bus, and persistence

let renderQueued = false;

export function scheduleUI(callback: () => void): void {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    callback();
  });
}

export function saveSetting(key: string, value: number | string): void {
  localStorage.setItem('velox_' + key, String(value));
}
