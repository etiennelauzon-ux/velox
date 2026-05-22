const globalServer = (globalThis as unknown as Record<string, string | undefined>)['VELOX_SERVER'];

export const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)
  || (import.meta.env.VITE_VELOX_SERVER as string | undefined)
  || globalServer
  || window.location.origin;

export function backendUrl(path: string): string {
  const base = BACKEND_BASE.endsWith('/') ? BACKEND_BASE : `${BACKEND_BASE}/`;
  return new URL(path.replace(/^\//, ''), base).toString();
}
