// src/live/liveNetwork.ts — Socket.IO connection and room management

import { io } from 'socket.io-client';
import { status } from '@/ui/domHelpers';
import {
  liveState, addOrUpdatePeer, removePeer, clearPeers,
  clearWebRTCPeers, removeWebRTCPeer,
} from '@/state/liveState';
import { renderLivePanel, colorFor } from './liveUI';
import { createWebRTCPeer, handleOffer, handleAnswer, handleIce, broadcastRTC } from './liveRTC';
import { removeLiveMarker } from './liveMarkers';
import { routeState } from '@/state/routeState';
import { rideState } from '@/state/rideState';
import { getRoutePositionSync } from '@/workers/routeWorkerClient';
import { appStoreApi } from '@/state/useAppStore';
import recordingState from '@/state/recordingState';
import { livePeerArraySchema, livePeerSchema } from '@/validation';
import { Store } from '@/state/store';
import { BACKEND_BASE, backendUrl } from '@/config/backend';
import type { ApiIceConfig, LivePeer } from '@/types';

export const DEFAULT_SERVER = BACKEND_BASE;

export const makeId = (): string => Math.random().toString(36).slice(2, 8).toUpperCase();

async function loadIceConfig(): Promise<void> {
  try {
    const res = await fetch(backendUrl('/api/webrtc-config'));
    if (!res.ok) return;
    const data = await res.json() as ApiIceConfig;
    if (Array.isArray(data.iceServers) && data.iceServers.length) {
      liveState.iceServers = data.iceServers;
    }
  } catch {
    // keep default ICE servers
  }
}

export const normalizeRoom = (value: string): string =>
  (value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 32) || 'team-ride';

export function snapshot() {
  const { routeLen, routeDistance, routeName } = routeState;
  const p = getRoutePositionSync(routeDistance);
  return {
    lat: p.lat, lon: p.lon, ele: p.ele,
    routeDistance, routeLen,
    speed: rideState.speed,
    power: rideState.power,
    hr: rideState.hr,
    cadence: rideState.cadence,
    elapsed: recordingState.elapsed,
    routeName,
    recording: recordingState.recording,
    updatedAt: Date.now(),
  };
}

function wireRTCCallbacks() {
  return {
    onPeerData:  () => renderLivePanel(),
    onPeerClose: (id: string) => { _removePeerFull(id); renderLivePanel(); },
  };
}

function _removePeerFull(id: string): void {
  removePeer(id);
  removeWebRTCPeer(id);
  removeLiveMarker(id, liveState.markers as Map<string, unknown>);
}

export async function joinRoom(): Promise<void> {
  const roomEl = document.getElementById('liveRoom') as HTMLInputElement | null;
  const nameEl = document.getElementById('liveName') as HTMLInputElement | null;

  const serverUrl = DEFAULT_SERVER;
  const room      = normalizeRoom(roomEl?.value || 'team-ride');
  const name      = (nameEl?.value.trim() || 'Rider').slice(0, 32);

  liveState.room  = room;
  liveState.name  = name;
  liveState.color = colorFor(liveState.clientId || makeId());
  const roomBtn = null as HTMLButtonElement | null;

  if (roomBtn) { roomBtn.textContent = 'Joining…'; roomBtn.disabled = true; }

  try {
    await loadIceConfig();
    const socket = io(serverUrl, { transports: ['websocket'], forceNew: true });
    liveState.socket = socket;

    socket.on('connect', () => {
      liveState.connected = true;
      liveState.joined = true;
      liveState.clientId  = socket.id ?? makeId();
      clearPeers();

      socket.emit('room:join', { room, name, color: liveState.color, state: snapshot() });
      Store.emit({ type: 'live-room' });
      status(`Live room joined: ${room}`);
      renderLivePanel();
      share(true);
    });

    socket.on('connect_error', (err: Error) => {
      appStoreApi.getState().reportError('multiplayer', err);
      status('Live connection failed: ' + err.message);
    });
    socket.on('room:peers',  (peers: LivePeer[]) => {
      clearPeers();
      try {
        const validated = livePeerArraySchema.parse(peers || []);
        validated.forEach(peer => { if (peer.id !== liveState.clientId) addOrUpdatePeer(peer.id, peer); });
      } catch (e) {
        appStoreApi.getState().reportError('multiplayer', e);
      }
      renderLivePanel();
    });
    socket.on('peer:joined', (peer: LivePeer) => {
      const parsed = livePeerSchema.safeParse(peer);
      if (!parsed.success) {
        console.warn('[Live] invalid peer joined payload:', parsed.error.format());
        return;
      }
      const validated = parsed.data;
      try {
        addOrUpdatePeer(validated.id, validated);
        createWebRTCPeer(validated, wireRTCCallbacks());
        renderLivePanel();
      } catch (e) {
        appStoreApi.getState().reportError('multiplayer', e);
      }
    });
    socket.on('peer:update', (peer: LivePeer) => {
      if (peer?.id === liveState.clientId) return;
      const parsed = livePeerSchema.safeParse(peer);
      if (!parsed.success) {
        console.warn('[Live] invalid peer update payload:', parsed.error.format());
        return;
      }
      const validated = parsed.data;
      try {
        addOrUpdatePeer(validated.id, validated);
        renderLivePanel();
      } catch (e) {
        appStoreApi.getState().reportError('multiplayer', e);
      }
    });
    socket.on('peer:left',   ({ id }: { id: string }) => { _removePeerFull(id); renderLivePanel(); });
    socket.on('webrtc:offer',  ({ from, offer }: { from: string; offer: never })         => handleOffer(from, offer));
    socket.on('webrtc:answer', ({ from, answer }: { from: string; answer: never })       => handleAnswer(from, answer));
    socket.on('webrtc:ice',    ({ from, candidate }: { from: string; candidate: never }) => handleIce(from, candidate));
    socket.on('disconnect', () => {
      liveState.connected = false;
      liveState.joined = false;
      Store.emit({ type: 'live-room' });
      renderLivePanel();
    });
  } catch (e) {
    appStoreApi.getState().reportError('multiplayer', e);
    status((e as Error).message);
    liveState.connected = false;
    liveState.joined = false;
    Store.emit({ type: 'live-room' });
  }
}

export function leaveRoom(): void {
  liveState.socket?.disconnect();
  liveState.connected = false;
  liveState.joined = false;
  liveState.peers.forEach((_, id) => _removePeerFull(id));
  clearPeers(); clearWebRTCPeers();
  Store.emit({ type: 'live-room' });
  renderLivePanel();
  status('Live room left');
}

export function share(force = false): void {
  if (!liveState.connected) return;
  const now = Date.now();
  if (!force && now - liveState.lastSent < liveState.rateMs) return;
  liveState.lastSent = now;

  const data = { ...snapshot(), id: liveState.clientId, name: liveState.name, color: liveState.color };
  broadcastRTC(data);
  if (liveState.socket?.connected) liveState.socket.emit('location:update', data);
}

export const LiveShare = {
  join:          joinRoom,
  leave:         leaveRoom,
  share,
  snapshot,
  defaultServer: () => DEFAULT_SERVER,
};
