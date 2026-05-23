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

Open `http://localhost:5173` in your browser.

## GitHub Pages

The production frontend is served from GitHub Pages:

https://etiennelauzon.github.io/velox/

Pages is deployed by GitHub Actions from `main`, using `.github/workflows/deploy.yml`.
The workflow builds the Vite app into `dist` and publishes that artifact with `actions/deploy-pages`.
The repository Pages source should stay set to **GitHub Actions**.

The backend is not served by GitHub Pages. It only provides `/api/*` endpoints and Socket.IO for:

- Live room signaling and peer updates
- WebRTC ICE configuration
- Strava OAuth token exchange and refresh
- Strava starred segment proxying
- Mapillary proxy/token routes

For the hosted frontend to reach the backend, set the repository or environment secret:

```text
VITE_BACKEND_URL=https://your-backend-host.example.com
```

Optional frontend build secrets:

```text
VITE_MAPILLARY_TOKEN=your_public_mapillary_token_if_used
```

Backend secrets belong only on the backend host, never in the GitHub Pages build:

```text
STRAVA_CLIENT_SECRET=...
MAPILLARY_TOKEN=...
TURN_URL=...
TURN_USERNAME=...
TURN_CREDENTIAL=...
ALLOWED_ORIGINS=https://etiennelauzon.github.io,http://localhost:5173
```

To deploy a change:

```bash
git push origin main
```

Then check the "Deploy to GitHub Pages" workflow. A successful run updates the live site.

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
