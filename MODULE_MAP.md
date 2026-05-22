# Module Map

This file documents the single responsibility of each file in `src/`.

## Root
- `src/App.tsx` — root React component that assembles the application UI and panels.
- `src/main.tsx` — application bootstrap and cross-cutting wiring for UI rendering, event listeners, and state initialization.
- `src/style.css` — global app styles and layout rules.
- `src/types.ts` — shared domain and runtime type definitions used across the app.
- `src/utils.ts` — small generic helper utilities with no external dependencies.

## Bluetooth
- `src/bluetooth/bluetooth.ts` — Web Bluetooth device discovery, FTMS/HRM characteristic handling, and trainer command flow.

## Components
- `src/components/ErrorBoundary.tsx` — React error boundary component for catching runtime errors in the UI.

## Config
- `src/config/strava.ts` — static Strava endpoint and parameter configuration.

## Export
- `src/export/export.ts` — GPX/FIT export helpers that serialize recorded ride sessions.

## Live
- `src/live/liveMarkers.ts` — Leaflet marker management for live peer positions.
- `src/live/liveNetwork.ts` — backend and signaling client code for live multiplayer room discovery.
- `src/live/liveRTC.ts` — WebRTC peer connection and data-channel coordination for live sessions.
- `src/live/liveUI.ts` — live room UI rendering and peer status updates.

## Physics
- `src/physics/physicsEngine.ts` — pure physics and performance math functions for power, HR zones, and speed solving.

## Route
- `src/route/routeController.ts` — route loading and lifecycle control, including route cleanup and live route resets.
- `src/route/routeGeometry.ts` — deterministic route geometry calculations, smoothed grade, and interpolation functions.
- `src/route/routeParsers.ts` — GPX/FIT route parsing and polyline decoding utilities.
- `src/route/routeRenderer.ts` — Leaflet route rendering and map visual updates.
- `src/route/segments.ts` — Strava segment matching and segment readout rendering.

## Server-side
- `src/strava/stravaAuth.ts` — Strava OAuth token exchange and auth callback handling.

## State
- `src/state/bluetoothState.ts` — isolated Bluetooth connection runtime state.
- `src/state/liveState.ts` — live session peer and room state.
- `src/state/mapState.ts` — map instance and renderer runtime state.
- `src/state/mapillaryState.ts` — Mapillary street-view runtime state and token/proxy settings.
- `src/state/physicsState.ts` — physics configuration values used by workers and the simulator.
- `src/state/recordingState.ts` — current ride recording state, record buffers, timer, and history handling.
- `src/state/rideState.ts` — current ride telemetry state and ride-mode setters.
- `src/state/routeState.ts` — loaded route metadata, current progress, and active Strava segment state.
- `src/state/store.ts` — lightweight event emitter for UI feature subscriptions.
- `src/state/uiState.ts` — small UI runtime state for flags like ramp tests and overlays.
- `src/state/useAppStore.ts` — persistent user preferences and app settings stored in Zustand.
- `src/state/preferencesSync.ts` — syncs persisted Zustand preferences into domain state singletons at startup and on preference changes.

## UI
- `src/ui/chart.ts` — ride chart rendering and elevation / power curve drawing.
- `src/ui/chartMath.ts` — chart math helpers for downsampling and plotting.
- `src/ui/domHelpers.ts` — DOM helpers for element lookup, text updates, status logging, and render scheduling.
- `src/ui/features.ts` — feature wiring for summary overlay, ramp test, and app init UI updates.
- `src/ui/mapillary.ts` — Mapillary street-view integration, candidate selection, and viewer updates.
- `src/ui/controls/exportControls.ts` — export button and download control wiring.
- `src/ui/controls/liveControls.ts` — live room UI wiring with join/leave controls.
- `src/ui/controls/rideControls.ts` — ride controls, GPX upload, Strava OAuth flow, and ride buttons.
- `src/ui/controls/trainerControls.ts` — trainer, HRM, ERG, and rider preference input wiring.
- `src/ui/controls/workoutControls.ts` — workout panel controls and workout chart wiring.
- `src/ui/panels/ControlsPanel.tsx` — React panel containing ride control widgets.
- `src/ui/panels/CoursePanel.tsx` — React panel for course and route selection details.
- `src/ui/panels/RidePanel.tsx` — React panel for ride metrics and status.
- `src/ui/panels/SummaryOverlay.tsx` — React overlay for ride summary and historical data.

## Workers
- `src/workers/chartWorker.ts` — worker-side chart math computations.
- `src/workers/chartWorkerClient.ts` — client interface to chart worker tasks.
- `src/workers/gpx.worker.ts` — Web Worker for GPX parsing.
- `src/workers/gpxWorkerClient.ts` — client interface for GPX worker operations.
- `src/workers/routeWorker.ts` — route parsing worker.
- `src/workers/routeWorkerClient.ts` — client interface for route worker operations.
- `src/workers/telemetryWorker.ts` — telemetry simulation worker using physics engine data.
- `src/workers/telemetryWorkerClient.ts` — client interface for telemetry worker calls.
- `src/workers/workerRpc.ts` — worker RPC wrapper for request/response messaging.
