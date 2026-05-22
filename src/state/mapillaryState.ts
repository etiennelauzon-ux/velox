export const PROXY_BASE = (import.meta.env.VITE_VELOX_SERVER as string | undefined)
  || ((globalThis as Record<string, unknown>)['VELOX_SERVER'] as string | undefined)
  || '';
export const BUILTIN_MAPILLARY_TOKEN = (import.meta.env.VITE_MAPILLARY_TOKEN as string | undefined) || '';

export interface MapillaryState {
  enabled:        boolean;
  token:          string;
  useProxy:       boolean;
  viewer:         unknown;
  lastImageId:    string | null;
  lastSequenceId: string | null;
  lastMeta:       unknown;
  lastScore:      number | null;
  lastPickMs:     number;
  sequenceBuffer: unknown[];
  preload:        unknown[];
  moving:         boolean;
  refreshMs:      number;
  radiusM:        number;
  maxCandidates:  number;
  passEpsilonM:   number;
}

export const mapillaryState: MapillaryState = {
  enabled:        true,
  token:          BUILTIN_MAPILLARY_TOKEN,
  useProxy:       true,
  viewer:         null,
  lastImageId:    null,
  lastSequenceId: null,
  lastMeta:       null,
  lastScore:      null,
  lastPickMs:     0,
  sequenceBuffer: [],
  preload:        [],
  moving:         false,
  refreshMs:      2000,
  radiusM:        60,
  maxCandidates:  30,
  passEpsilonM:   3,
};
