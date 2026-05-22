// src/live/liveRTC.ts — WebRTC peer lifecycle

import { log } from '@/ui/domHelpers';
import { addOrUpdatePeer, addWebRTCPeer, removeWebRTCPeer, liveState } from '@/state/liveState';
import { livePeerSchema } from '@/validation';
import SimplePeer from 'simple-peer';
import type { LivePeer } from '@/types';

export interface RTCCallbacks {
  onPeerData:  (update: LivePeer) => void;
  onPeerClose: (id: string) => void;
}

export function createWebRTCPeer(peer: { id: string; name?: string }, callbacks: RTCCallbacks): void {
  if (liveState.webRTCpeers.has(peer.id)) return;

  const p = new SimplePeer({
    initiator: peer.id < liveState.clientId,
    trickle:   false,
    config: {
      iceServers: liveState.iceServers,
    },
  });
  addWebRTCPeer(peer.id, p);

  p.on('signal', data => {
    if (!liveState.socket) return;
    const d = data as { type?: string; candidate?: unknown };
    if (d.type === 'offer')      liveState.socket.emit('webrtc:offer',  { to: peer.id, offer: data });
    else if (d.type === 'answer') liveState.socket.emit('webrtc:answer', { to: peer.id, answer: data });
    else if (d.candidate)        liveState.socket.emit('webrtc:ice',    { to: peer.id, candidate: data });
  });

  p.on('connect', () => { log('WebRTC connected to ' + peer.id); });

  p.on('data', (raw: Uint8Array | string) => {
    try {
      const update = livePeerSchema.parse(JSON.parse(raw.toString()));
      if (update.id !== liveState.clientId) {
        addOrUpdatePeer(update.id, update);
        callbacks.onPeerData(update);
      }
    } catch (e) { log('Invalid peer data: ' + (e as Error).message); }
  });

  p.on('error', (err: Error) => { log(`WebRTC error with ${peer.id}: ${err.message}`); });

  p.on('close', () => {
    removeWebRTCPeer(peer.id);
    callbacks.onPeerClose(peer.id);
  });
}

export const handleOffer  = (from: string, offer: SimplePeer.SignalData):     void => { liveState.webRTCpeers.get(from)?.signal(offer); };
export const handleAnswer = (from: string, answer: SimplePeer.SignalData):    void => { liveState.webRTCpeers.get(from)?.signal(answer); };
export const handleIce    = (from: string, candidate: SimplePeer.SignalData): void => { liveState.webRTCpeers.get(from)?.signal(candidate); };

export function broadcastRTC(data: object): void {
  const str = JSON.stringify(data);
  liveState.webRTCpeers.forEach(p => { if (p.connected) p.send(str); });
}
