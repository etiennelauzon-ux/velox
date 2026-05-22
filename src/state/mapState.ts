// src/state/mapState.ts — Leaflet map object and UI state

declare const L: typeof import('leaflet');

export interface MapState {
  map: ReturnType<typeof L.map> | null;
  line: ReturnType<typeof L.polyline> | null;
  rider: ReturnType<typeof L.circleMarker> | null;
  mapTile: string;
  mapTileLayer: ReturnType<typeof L.tileLayer> | null;
  mly: unknown;
}

export const mapState: MapState = {
  map: null,
  line: null,
  rider: null,
  mapTile: 'osm',
  mapTileLayer: null,
  mly: null,
};

export function setMap(map: MapState['map']): void {
  mapState.map = map;
}

export function setMapLine(line: MapState['line']): void {
  mapState.line = line;
}

export function setMapRider(rider: MapState['rider']): void {
  mapState.rider = rider;
}

export function setMapTile(type: string, layer: MapState['mapTileLayer']): void {
  mapState.mapTile = type;
  mapState.mapTileLayer = layer;
}

export default mapState;
