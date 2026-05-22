// Syncs Zustand persisted preferences into domain state singletons on startup and on every store change.
import { mapState } from './mapState';
import { rideState } from './rideState';
import { physicsState } from './physicsState';
import { appStoreApi } from './useAppStore';

export function syncPersistentStateToLegacyState(): void {
  const { rider, trainer, ui } = appStoreApi.getState();
  rideState.ergWatts = trainer.ergWatts;
  rideState.gradeErg = trainer.gradeErg;
  mapState.mapTile = ui.mapTile;
  physicsState.riderWeightKg = rider.riderWeightKg;
}

export function bindPersistentStateToLegacyState(): () => void {
  syncPersistentStateToLegacyState();
  return appStoreApi.subscribe(syncPersistentStateToLegacyState);
}
