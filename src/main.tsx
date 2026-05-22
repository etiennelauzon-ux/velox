// src/main.tsx - React UI bootstrap plus existing application wiring

import 'leaflet/dist/leaflet.css';
import './style.css';
import * as Sentry from '@sentry/react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { scheduleUI, getEl } from '@/ui/domHelpers';
import { Store } from './state/store';
import { mapState } from './state/mapState';
import { appStoreApi } from './state/useAppStore';
import { bindPersistentStateToLegacyState, syncPersistentStateToLegacyState } from './state/preferencesSync';
import { uiState } from './state/uiState';
import { updateUINow } from '@/ui/uiLoop';
import { share } from './live/liveNetwork';
import { updateRampTest, openSummary, closeSummary, initFeatureUI, initApp } from './ui/features';
import { initMapillary } from './ui/mapillary';
import { drawWorkoutChart } from './ui/chart';
import { workoutState } from './workout/workoutState';
import { handleOAuthCallback } from './strava/stravaAuth';


function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    release: __GIT_HASH__,
    environment: import.meta.env.MODE,
    ignoreErrors: ['ResizeObserver loop limit exceeded'],
  });
}

function initSummaryControls(): void {
  const on = (id: string, ev: string, fn: EventListener) => {
    getEl(id)?.addEventListener(ev, fn);
  };
  on('summaryBtn', 'click', () => openSummary());
  on('closeSummaryBtn', 'click', () => closeSummary());
  on('summaryOverlay', 'click', e => {
    if (e.target === getEl('summaryOverlay')) closeSummary();
  });
}

function connectFeatures(): void {
  Store.subscribe(() => {
    if (uiState.rampTest.active) updateRampTest();
    scheduleUI(updateUINow);
    if (appStoreApi.getState().featureFlags.liveShare) share(false);
  });
}

function mountReactUi(): void {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Missing #root element');
  const root = createRoot(rootEl);
  flushSync(() => {
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
    );
  });
}

async function bootstrap(): Promise<void> {
  const { featureFlags } = appStoreApi.getState();

  if (featureFlags.strava) {
    const oauthHandled = await handleOAuthCallback();
    if (oauthHandled) Store.emit({ type: 'strava-auth' });
  }

  bindPersistentStateToLegacyState();

  initSentry();
  initSummaryControls();

  initFeatureUI();
  if (featureFlags.mapillary) initMapillary();
  initApp();

  connectFeatures();
  updateUINow();

  window.addEventListener('resize', () => {
    updateUINow();
    if (mapState.map) {
      setTimeout(() => (mapState.map as { invalidateSize: () => void }).invalidateSize(), 50);
    }
    if (workoutState.plan) {
      drawWorkoutChart(workoutState.plan);
    }
  });
}

window.addEventListener('error', event => {
  appStoreApi.getState().reportError('runtime', event.error || event.message);
});

window.addEventListener('unhandledrejection', event => {
  appStoreApi.getState().reportError('promise', event.reason);
});

window.addEventListener('DOMContentLoaded', () => {
  void Promise.resolve(appStoreApi.persist.rehydrate()).finally(() => {
    syncPersistentStateToLegacyState();
    mountReactUi();
    void bootstrap();
  });
});
