// src/live/liveMarkers.ts — Leaflet marker management for live peers
// Explicit parameters only. No hidden globals. One update path = no blinking.

import L from 'leaflet';
import { escapeHtml } from '@/utils';
import type { LivePeer } from '@/types';

function buildPeerIcon(peer: LivePeer, colorFor: (id: string) => string): ReturnType<typeof L.divIcon> {
  const color = peer.color || colorFor(peer.id);
  const label = (peer.name || '?').trim().slice(0, 1).toUpperCase() || '?';
  return L.divIcon({
    className: '',
    html: `<div class="liveMarker" style="background:${color}">${escapeHtml(label)}</div>`,
    iconSize:   [24, 24],
    iconAnchor: [12, 12],
  });
}

export function removeLiveMarker(id: string, markers: Map<string, unknown>): void {
  const marker = markers.get(id) as { remove?: () => void } | undefined;
  if (marker) { marker.remove?.(); markers.delete(id); }
}

export function diffUpdatePeerMarkers(
  map: unknown,
  peers: Map<string, LivePeer>,
  markers: Map<string, unknown>,
  colorFor: (id: string) => string,
): void {
  if (!map) return;

  const seen = new Set<string>();

  peers.forEach((peer, id) => {
    if (!Number.isFinite(peer.lat) || !Number.isFinite(peer.lon)) return;
    seen.add(id);

    let marker = markers.get(id) as ReturnType<typeof L.marker> | undefined;
    if (!marker) {
      marker = L.marker([peer.lat, peer.lon], {
        icon:  buildPeerIcon(peer, colorFor),
        title: peer.name || id,
      }).addTo(map as ReturnType<typeof L.map>);
      markers.set(id, marker);
    } else {
      marker.setLatLng([peer.lat, peer.lon]);
    }
  });

  // Remove stale markers
  markers.forEach((marker, id) => {
    if (!seen.has(id)) {
      (marker as ReturnType<typeof L.marker>).remove();
      markers.delete(id);
    }
  });
}
