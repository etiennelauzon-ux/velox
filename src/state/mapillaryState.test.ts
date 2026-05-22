import { beforeEach, describe, expect, it } from 'vitest';
import { BUILTIN_MAPILLARY_TOKEN, mapillaryState } from './mapillaryState';

describe('mapillaryState', () => {
  beforeEach(() => {
    Object.assign(mapillaryState, {
      enabled: true,
      token: BUILTIN_MAPILLARY_TOKEN,
      useProxy: true,
      viewer: null,
      lastImageId: null,
      lastSequenceId: null,
      lastMeta: null,
      lastScore: null,
      lastPickMs: 0,
      sequenceBuffer: [],
      preload: [],
      moving: false,
      refreshMs: 2000,
      radiusM: 60,
      maxCandidates: 30,
      passEpsilonM: 3,
    });
  });

  it('exports the default Mapillary state object', () => {
    expect(mapillaryState.enabled).toBe(true);
    expect(mapillaryState.token).toBe(BUILTIN_MAPILLARY_TOKEN);
    expect(mapillaryState.useProxy).toBe(true);
    expect(mapillaryState.refreshMs).toBe(2000);
    expect(mapillaryState.radiusM).toBe(60);
    expect(mapillaryState.maxCandidates).toBe(30);
  });

  it('can be updated at runtime', () => {
    mapillaryState.enabled = false;
    mapillaryState.radiusM = 120;
    mapillaryState.lastImageId = 'abc123';

    expect(mapillaryState.enabled).toBe(false);
    expect(mapillaryState.radiusM).toBe(120);
    expect(mapillaryState.lastImageId).toBe('abc123');
  });
});
