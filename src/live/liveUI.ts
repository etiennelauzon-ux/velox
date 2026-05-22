// src/live/liveUI.ts — live panel DOM rendering

import { escapeHtml } from '@/utils';
import { liveState } from '@/state/liveState';
import { diffUpdatePeerMarkers } from './liveMarkers';
import { mapState } from '@/state/mapState';
import { appStoreApi } from '@/state/useAppStore';
import { powerZone } from '@/physics/physicsEngine';
import type { LivePeer } from '@/types';

const COLORS = ['#19d3ef', '#44d07b', '#e9c54a', '#ff8738', '#c65cff', '#5d8cff', '#ef4d4d'];

export function colorFor(id: string): string {
  let n = 0;
  for (const ch of String(id || '')) n = (n + ch.charCodeAt(0)) % 997;
  return COLORS[n % COLORS.length];
}

export function renderLivePanel(): void {
  const dot   = document.getElementById('liveDot');
  const state = document.getElementById('liveStatus');
  const list  = document.getElementById('livePeers');
  const ftp   = appStoreApi.getState().rider.ftp || 0;

  if (dot) dot.classList.toggle('on', liveState.connected);

  if (state) {
    state.textContent = liveState.connected
      ? `Room ${liveState.room} · ${liveState.peers.size} peer${liveState.peers.size === 1 ? '' : 's'}`
      : 'Live sharing disconnected';
  }

  if (list) {
    const peers = Array.from(liveState.peers.values())
      .sort((a: LivePeer, b: LivePeer) => (a.name || '').localeCompare(b.name || ''));

    list.setAttribute('role', 'list');
    list.innerHTML = peers.map((peer: LivePeer) => {
      const km      = Number.isFinite(peer.routeDistance) ? (peer.routeDistance / 1000).toFixed(2) + ' km' : '--';
      const spd     = Number.isFinite(peer.speed) ? peer.speed.toFixed(1) + ' km/h' : '--';
      const hrLabel = peer.hr > 0 ? ` · ${peer.hr} bpm` : '';
      const zone    = powerZone(peer.power, ftp);
      const zoneColor = zone[1];
      const color   = peer.color || colorFor(peer.id);
      const age     = Math.max(0, Math.round((Date.now() - (peer.updatedAt || Date.now())) / 1000));
      return `<div role="listitem" class="livePeer">
        <i class="liveSwatch" style="background:${color}"></i>
        <b>${escapeHtml(peer.name || peer.id)}</b>
        <span>${km} · ${spd} · ${age}s</span>
        <span class="peerStats"><i class="liveZoneDot" style="background:${zoneColor}"></i>${peer.power} W${hrLabel}</span>
      </div>`;
    }).join('');
  }

  if (mapState.map) {
    diffUpdatePeerMarkers(
      mapState.map,
      liveState.peers,
      liveState.markers as Map<string, unknown>,
      colorFor,
    );
  }
}
