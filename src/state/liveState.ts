// src/state/liveState.ts — live multiplayer state store

import type { LivePeer } from '@/types';
import type { Socket } from 'socket.io-client';
import type SimplePeer from 'simple-peer';

export interface LiveState {
  socket:      Socket | null;
  connected:   boolean;
  joined:      boolean;
  room:        string;
  name:        string;
  clientId:    string;
  color:       string;
  lastSent:    number;
  rateMs:      number;
  peers:       Map<string, LivePeer>;
  markers:     Map<string, unknown>;   // Leaflet marker instances
  webRTCpeers: Map<string, SimplePeer.Instance>;
  iceServers:  RTCIceServer[];
}

export const liveState: LiveState = {
  socket:      null,
  connected:   false,
  joined:      false,
  room:        '',
  name:        '',
  clientId:    '',
  color:       '#19d3ef',
  lastSent:    0,
  rateMs:      1000,
  peers:       new Map(),
  markers:     new Map(),
  webRTCpeers: new Map(),
  iceServers:  [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
};

export function addOrUpdatePeer(id: string, peer: LivePeer): void {
  liveState.peers.set(id, peer);
}

export function removePeer(id: string): void {
  liveState.peers.delete(id);
}

export function clearPeers(): void {
  liveState.peers.clear();
}

export function addWebRTCPeer(id: string, rtcPeer: SimplePeer.Instance): void {
  liveState.webRTCpeers.set(id, rtcPeer);
}

export function removeWebRTCPeer(id: string): void {
  const p = liveState.webRTCpeers.get(id);
  if (p) p.destroy();
  liveState.webRTCpeers.delete(id);
}

export function clearWebRTCPeers(): void {
  liveState.webRTCpeers.forEach(p => p.destroy());
  liveState.webRTCpeers.clear();
}
