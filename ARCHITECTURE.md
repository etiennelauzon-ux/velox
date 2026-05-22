# VELOX Architecture (current)

Summary: a modern TypeScript React single-page app (Vite) with a small Node/Express backend used for proxying Strava/Mapillary and WebRTC/STUN/TURN discovery. The app uses Zustand for UI state, plain domain state files for runtime data, and Web Workers for heavy parsing/telemetry.

Stack overview
- React 19 + TypeScript (strict)
- Vite 5 build system
- Backend: Node (Express) with Socket.IO for signaling
- State: Zustand (`useAppStore`) for persisted preferences and UI settings, plus explicit domain state modules for runtime data
- Workers: Web Workers for GPX/FIT parsing and telemetry stepping

Module map (src/)
- `src/` — top-level app entry (`main.tsx`, `App.tsx`) and shared CSS
- `src/components/` — small React components such as `ErrorBoundary`
- `src/state/` — explicit domain state modules and store utilities (`routeState.ts`, `liveState.ts`, `physicsState.ts`, `rideState.ts`, `recordingState.ts`, `uiState.ts`, `useAppStore.ts`, etc.)
- `src/ui/` — UI helpers and feature code (mapillary, charts, controls)
- `src/route/` — route parsing, geometry, rendering, and controllers
- `src/workers/` — worker clients and worker code for parsing/telemetry
- `src/workout/` — workout parsing, state, and controller
- `src/strava/` — Strava auth client logic
- `src/bluetooth/` — Web Bluetooth integration (trainer/HRM)

State ownership
- `useAppStore` (Zustand): persistent rider settings, trainer preferences, UI preferences, saved routes, workout history, and errors.
- Domain state files: `routeState`, `liveState`, `physicsState`, `rideState`, `recordingState`, `uiState`, `bluetoothState` own narrow runtime data for their respective domains.
- `main.tsx`: bootstraps the React app and wires domain state into UI rendering and feature lifecycle.

Worker threads
- `routeWorker` / `routeWorkerClient`: route parsing and heavy geometry operations
- `telemetryWorker` / `telemetryWorkerClient`: telemetry stepping and physics calculations off main thread
- `gpxWorker` / `gpxWorkerClient`: GPX/FIT parsing off-thread

Runtime boundaries
- Main thread: React UI, canvas drawing, DOM interactions, small glue logic
- Workers: heavy parsing and deterministic telemetry simulation
- Backend: token exchange (Strava), Mapillary proxy, WebRTC/STUN/TURN config and Socket.IO signaling

Deployment
- Static frontend can be hosted on GitHub Pages or static hosts; backend is expected to run on Render/Heroku/Vercel for proxying and TURN integration. The build uses `VITE_BACKEND_URL` to point the frontend at the backend when hosted statically.

Notes
- The codebase has been migrated away from the legacy global `S`; focused state modules like `bluetoothState` and `recordingState` now own narrow runtime concerns and reduce coupling.
