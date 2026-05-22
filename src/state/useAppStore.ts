import localforage from 'localforage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

localforage.config({
  name: 'velox',
  storeName: 'app',
  description: 'VELOX rider settings and local history',
});

const localForageStorage: StateStorage = {
  getItem: async name => {
    const value = await localforage.getItem<string>(name);
    return value ?? null;
  },
  setItem: async (name, value) => {
    await localforage.setItem(name, value);
  },
  removeItem: async name => {
    await localforage.removeItem(name);
  },
};

export interface RiderProfile {
  ftp: number;
  lthr: number;
  maxhr: number;
  hrMode: 'lthr' | 'maxhr' | '';
  riderWeightKg: number;
}

export interface TrainerPreferences {
  lastTrainerName: string;
  ergWatts: number;
  gradeErg: boolean;
}

export interface UiPreferences {
  controlsCollapsed: boolean;
  streetviewEnabled: boolean;
  mapillaryRefreshMs: number;
  mapillaryRadiusM: number;
  mapTile: string;
  liveRoom: string;
  liveName: string;
}

export interface FeatureFlags {
  mapillary: boolean;
  liveShare: boolean;
  strava: boolean;
}

const defaultFeatureFlags: FeatureFlags = {
  mapillary: (import.meta.env.VITE_FEATURE_MAPILLARY as string | undefined) !== 'false',
  liveShare: (import.meta.env.VITE_FEATURE_LIVE_SHARE as string | undefined) !== 'false',
  strava: (import.meta.env.VITE_FEATURE_STRAVA as string | undefined) !== 'false',
};

export interface SavedRouteMeta {
  name: string;
  source: string;
  totalLen: number;
  savedAt: number;
}

export interface WorkoutHistoryEntry {
  name: string;
  completedAt: number;
  durationSec: number;
}

export interface AppError {
  source: string;
  message: string;
  at: number;
}

interface AppStoreState {
  rider: RiderProfile;
  trainer: TrainerPreferences;
  ui: UiPreferences;
  featureFlags: FeatureFlags;
  theme: 'dark' | 'light';
  routes: SavedRouteMeta[];
  workoutHistory: WorkoutHistoryEntry[];
  errors: AppError[];
  hydrated: boolean;
  mapCenter: [number, number] | null;
  mapZoom: number;
  setRider: (patch: Partial<RiderProfile>) => void;
  setTrainer: (patch: Partial<TrainerPreferences>) => void;
  setUi: (patch: Partial<UiPreferences>) => void;
  setFeatureFlags: (patch: Partial<FeatureFlags>) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setMapView: (center: [number, number], zoom: number) => void;
  rememberRoute: (route: SavedRouteMeta) => void;
  addWorkoutHistory: (entry: WorkoutHistoryEntry) => void;
  reportError: (source: string, error: unknown) => void;
  clearErrors: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      rider: {
        ftp: 0,
        lthr: 0,
        maxhr: 0,
        hrMode: '',
        riderWeightKg: 72,
      },
      trainer: {
        lastTrainerName: '',
        ergWatts: 200,
        gradeErg: false,
      },
      ui: {
        controlsCollapsed: false,
        streetviewEnabled: false,
        mapillaryRefreshMs: 2000,
        mapillaryRadiusM: 60,
        mapTile: 'osm',
        liveRoom: 'team-ride',
        liveName: '',
      },
      featureFlags: defaultFeatureFlags,
      theme: 'dark',
      routes: [],
      workoutHistory: [],
      errors: [],
      hydrated: false,
      mapCenter: null,
      mapZoom: 13,
      setRider: patch => set(state => ({ rider: { ...state.rider, ...patch } })),
      setTrainer: patch => set(state => ({ trainer: { ...state.trainer, ...patch } })),
      setUi: patch => set(state => ({ ui: { ...state.ui, ...patch } })),
      setFeatureFlags: patch => set(state => ({ featureFlags: { ...state.featureFlags, ...patch } })),
      setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
      rememberRoute: route => {
        const routes = [route, ...get().routes.filter(item => item.name !== route.name)].slice(0, 10);
        set({ routes });
      },
      addWorkoutHistory: entry => {
        set(state => ({ workoutHistory: [entry, ...state.workoutHistory].slice(0, 25) }));
      },
      setTheme: theme => set({ theme }),
      reportError: (source, error) => {
        const message = error instanceof Error ? error.message : String(error);
        set(state => ({
          errors: [{ source, message, at: Date.now() }, ...state.errors].slice(0, 20),
        }));
      },
      clearErrors: () => set({ errors: [] }),
      setHydrated: hydrated => set({ hydrated }),
    }),
    {
      name: 'velox-app-store',
      storage: createJSONStorage(() => localForageStorage),
      partialize: state => ({
        rider: state.rider,
        trainer: state.trainer,
        ui: state.ui,
        featureFlags: state.featureFlags,
        theme: state.theme,
        routes: state.routes,
        workoutHistory: state.workoutHistory,
        mapCenter: state.mapCenter,
        mapZoom: state.mapZoom,
      }),
      onRehydrateStorage: () => state => {
        state?.setHydrated(true);
      },
    },
  ),
);

export const appStoreApi = useAppStore;

export function saveSetting(key: string, value: number | string): void {
  localStorage.setItem('velox_' + key, String(value));
}
