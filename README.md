# VELOX

VELOX is a browser-based cycling trainer app built with Vite, React, TypeScript, and Zustand.
It supports local GPX/FIT route loading, workout builder and playback, trainer ERG control, live pace sharing, and Strava integration.

## Features

- Route playback from GPX/FIT files with elevation and map rendering
- Workout file import and custom workout builder
- ERG mode and FTP/rider configuration
- Live room sharing for synced rider state
- Strava OAuth support and token refresh
- Hybrid React + Web Worker architecture for responsive UI

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:4173` in your browser.

## Build

```bash
npm run build
```

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — architecture overview and design decisions
- [`MIGRATION.md`](MIGRATION.md) — migration notes and upgrade guidance
- [`MODULE_MAP.md`](MODULE_MAP.md) — module layout and path alias map
- [`SOCKET_EVENTS.md`](SOCKET_EVENTS.md) — socket event schema and live sync protocol
- [`SECURITY.md`](SECURITY.md) — security policy and reporting

## Scripts

- `npm run dev` — start the app and backend server locally
- `npm run build` — compile TypeScript and build the production bundle
- `npm run type-check` — run `tsc --noEmit`
- `npm run lint` — run ESLint against `src`
- `npm test` — run unit tests with Vitest
- `npm run test:e2e` — run Playwright end-to-end tests

## Community

- `SECURITY.md` defines the security policy for the project.
- `CONTRIBUTING.md` explains how to contribute.
- `PULL_REQUEST_TEMPLATE.md` provides guidance for new pull requests.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
