# VELOX - Vite + React + TypeScript Migration

## What changed

### Build tooling

| Before | After |
|--------|-------|
| Raw ES modules served from `velox.html` | Vite 5 dev server and production bundling |
| Hand-authored HTML UI | React owns panels, overlays, menus, charts, and controls |
| No type checking | Strict TypeScript |
| CDN Socket.IO and SimplePeer scripts | npm dependencies bundled by Vite |
| Main-thread-only heavy calculations | Worker-backed route, telemetry, and chart services |

Leaflet and Mapillary still load from CDN because the renderer expects their global objects (`L` and `mapillary`).

## Project layout

```text
velox/
  index.html
  vite.config.ts
  tsconfig.json
  package.json
  public/
    routes/
  server/
    index.ts
    stravaConfig.ts
    tsconfig.server.json
  src/
    main.tsx
    App.tsx
    style.css
    types.ts
    utils.ts
    bluetooth/
    config/
    export/
    live/
    physics/
    route/
    state/
    strava/
    ui/
    workers/
    workout/
```

## Runtime Boundaries

- React renders the app shell from `src/App.tsx`.
- Existing control modules still wire behavior through stable DOM IDs.
- Bluetooth and browser APIs stay on the main thread.
- Workers return derived data only; app state and DOM updates stay on the main thread.
- The backend proxy lives in `server/index.ts` and is started by `npm run dev:backend`.

## Worker Threads

Initial worker support lives under `src/workers/`:

- `routeWorker.ts` builds routes and answers cached position/grade queries.
- `telemetryWorker.ts` handles per-sample speed, grade, and distance calculations.
- `chartWorker.ts` handles history downsampling for ride charts.
- `workerRpc.ts` provides the request/response wrapper used by worker clients.

Next good worker targets:

- Move Strava segment matching and nearest-point queries into `routeWorker`.
- Move power-duration calculations and eventually `OffscreenCanvas` rendering into `chartWorker`.
- Move rolling averages, calorie accumulation, and ride-record preparation into `telemetryWorker`.

## Environment

Do not commit real secrets. Local secrets belong in `.env`, which is ignored by git.

```env
STRAVA_CLIENT_ID=105048
STRAVA_CLIENT_SECRET=your_client_secret
MAPILLARY_TOKEN=your_mapillary_access_token
```

The browser defaults to Strava client ID `105048`, so `VITE_STRAVA_CLIENT_ID` is optional unless you need to override it.

## Commands

```bash
npm install
npm run dev
npm run dev:backend
npm run type-check
npm run build
npm run preview
```

## GitHub Push Checklist

1. Keep `dist/`, `node_modules/`, and `.env` out of git.
2. Run `npm run type-check`.
3. Run `npm run build`.
4. Run `npm audit --omit=dev`.
5. Commit source, config templates, lockfile, and docs.

## Recommended Next Steps

1. Add ESLint with TypeScript and React rules.
2. Add Vitest coverage for route geometry, workout parsing, physics, and worker-pure functions.
3. Install Leaflet as an npm dependency and remove the CDN/global workaround.
4. Expand worker coverage as described above.
