# Socket.IO events (server: `server/index.ts`)

This document lists the socket.io events in the backend and the expected payload shapes.

1) `room:join` (client → server)
  interface RoomJoin {
    room: string; // 1-32 chars, alphanumeric, underscore, hyphen
    name: string; // 1-32 chars
    color: string; // hex color like "#aabbcc"
    state: Record<string, unknown>; // plain object representing client snapshot
  }
  - Server validation: room/name/color/state are validated. On success, server adds client to room and emits `room:peers` and broadcasts `peer:joined` to others.

2) `room:peers` (server → client)
  interface PeerInfo {
    id: string;
    room: string;
    name: string;
    color: string;
    // ...plus any fields from the peer's `state` snapshot
  }

3) `peer:joined` (server → client)
  payload: PeerInfo — informs room members that a peer joined

4) `peer:update` (server → client)
  payload: Partial peer snapshot — server forwards sanitized `location:update` payloads to other peers in the room

5) `peer:left` (server → client)
  payload: { id: string } — informs peers that a client left

6) `location:update` (client → server)
  interface LocationUpdate {
    id?: string;
    lat: number; // -90..90
    lon: number; // -180..180
    ele?: number;
    speed: number; // clamped to 0..120
    power: number; // clamped to 0..3000
    cadence: number; // clamped to 0..200
    hr: number; // clamped to 0..250
    elapsed: number;
  }
  - The server validates types and clamps numeric ranges, strips extra fields, and forwards sanitized payloads to other peers in the room as `peer:update`.

7) `webrtc:offer` / `webrtc:answer` / `webrtc:ice` (client → server → other client)
  interface WebRTCSignal { to: string; /* id of recipient */ signal: unknown }
  - The server requires a non-empty `to` string and non-null signal; then relays the payload to the recipient with `from` set to sender id.

8) `disconnect` (socket event)
  - Server broadcasts `peer:left` to other members of the room and cleans up client state.
