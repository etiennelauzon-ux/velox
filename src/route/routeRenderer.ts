// src/route/routeRenderer.ts — Leaflet map rendering

import L from 'leaflet';
import { routeState } from '@/state/routeState';
import { appStoreApi } from '@/state/useAppStore';
import { getRoutePositionSync, getRoutePositionOffThread } from '@/workers/routeWorkerClient';
import { mapState, setMap, setMapLine, setMapRider, setMapTile as setMapStateTile } from '@/state/mapState';

export function drawRoute(): void {
  document.getElementById('courseEmpty')?.classList.add('hidden');
  document.getElementById('map')?.classList.remove('hidden');

  if (!mapState.map) {
    const initializedMap = L.map('map', { zoomControl: true }).setView([45.5019, -73.5674], 13);
    setMap(initializedMap);
    setMapTile(mapState.mapTile || 'osm');

    const stored = appStoreApi.getState();
    if (stored.mapCenter) {
      initializedMap.setView(stored.mapCenter, stored.mapZoom);
    }

    let moveEndTimeout: number | null = null;
    initializedMap.on('moveend', () => {
      if (moveEndTimeout) {
        window.clearTimeout(moveEndTimeout);
      }
      moveEndTimeout = window.setTimeout(() => {
        appStoreApi.getState().setMapView(
          [initializedMap.getCenter().lat, initializedMap.getCenter().lng],
          initializedMap.getZoom(),
        );
      }, 500);
    });
  }

  const map   = mapState.map as ReturnType<typeof L.map>;
  const line  = mapState.line as ReturnType<typeof L.polyline> | null;
  const rider = mapState.rider as ReturnType<typeof L.circleMarker> | null;

  line?.remove();
  rider?.remove();
  setMapRider(null);

  const latlng = routeState.route.map(p => [p.lat, p.lon] as [number, number]);
  setMapLine(L.polyline(latlng, { color: '#19d3ef', weight: 4 }).addTo(map));
  map.fitBounds((mapState.line as ReturnType<typeof L.polyline>).getBounds(), { padding: [20, 20] });

  setTimeout(() => {
    map.invalidateSize();
    map.fitBounds((mapState.line as ReturnType<typeof L.polyline>).getBounds(), { padding: [20, 20] });
    updateRouteReadout();
  }, 60);
}

export function updateRouteReadout(): void {
  const { routeLen, routeDistance } = routeState;
  const p = getRoutePositionSync(routeDistance);

  const set = (id: string, v: string | number) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v);
  };

  set('gradeNow', (p.grade || 0).toFixed(1) + '%');
  set('laps', routeLen ? String(Math.floor(routeDistance / routeLen)) : '0');

  if (mapState.map && routeLen) {
    const map = mapState.map as ReturnType<typeof L.map>;
    if (!mapState.rider) {
      setMapRider(L.circleMarker([p.lat, p.lon], {
        radius: 7, color: '#19d3ef', fillColor: '#19d3ef', fillOpacity: 1,
      }).addTo(map));
    } else {
      (mapState.rider as ReturnType<typeof L.circleMarker>).setLatLng([p.lat, p.lon]);
    }
  }

  void getRoutePositionOffThread(routeDistance).then(workerPosition => {
    if (!routeState.routeLen) return;
    set('gradeNow', (workerPosition.grade || 0).toFixed(1) + '%');
  }).catch(() => {});
}

const TILE_CONFIGS: Record<string, { url: string; attribution: string; maxZoom: number }> = {
  osm: {
    url:         'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'OpenStreetMap',
    maxZoom:     19,
  },
  satellite: {
    url:         'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri Satellite',
    maxZoom:     19,
  },
  topo: {
    url:         'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'OpenTopoMap',
    maxZoom:     17,
  },
};

export function setMapTile(type: string): void {
  if (!mapState.map) return;
  const map    = mapState.map as ReturnType<typeof L.map>;
  const config = TILE_CONFIGS[type] ?? TILE_CONFIGS['osm'];
  const tileLayer = mapState.mapTileLayer as ReturnType<typeof L.tileLayer> | null;
  if (tileLayer) map.removeLayer(tileLayer);
  setMapStateTile(type, L.tileLayer(config.url, { maxZoom: config.maxZoom, attribution: config.attribution }).addTo(map));
}
