import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import http from 'node:http';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Server as SocketIoServer } from 'socket.io';
import { DEFAULT_STRAVA_CLIENT_ID } from './stravaConfig';

interface ClientState {
  room: string;
  name: string;
  color: string;
  state: Record<string, unknown>;
}

const PORT = Number(process.env.PORT || 4000);
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID || DEFAULT_STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || '';
const MAPILLARY_TOKEN = process.env.MAPILLARY_TOKEN;
const TURN_URL = process.env.TURN_URL;
const TURN_USERNAME = process.env.TURN_USERNAME;
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL;

const app = express();

// CORS configuration: allowed origins are read from ALLOWED_ORIGINS (comma-separated)
const allowedFromEnv = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const devAllowed = ['http://localhost:5173', 'http://localhost:4000'];
function isOriginAllowed(origin: string | undefined | null): boolean {
  if (!origin) return true; // allow non-browser requests
  if (process.env.NODE_ENV !== 'production') return devAllowed.concat(allowedFromEnv).includes(origin) || allowedFromEnv.length === 0;
  if (allowedFromEnv.length === 0) return true; // permissive fallback if not configured
  return allowedFromEnv.includes(origin);
}

app.use(cors({
  origin: (origin, callback) => {
    try {
      if (isOriginAllowed(origin as string | undefined)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    } catch (e) {
      return callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Rate limiting middleware for API routes
const apiLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
// Apply limiter to all /api/* routes
app.use('/api', apiLimiter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, version: 'velox-backend' });
});

app.get('/api/webrtc-config', (_req: Request, res: Response) => {
  const iceServers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];

  if (TURN_URL && TURN_USERNAME && TURN_CREDENTIAL) {
    iceServers.push({
      urls: TURN_URL.split(',').map(s => s.trim()).filter(Boolean),
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    });
  }

  res.json({ iceServers });
});

app.get('/api/mapillary/token', (_req: Request, res: Response) => {
  if (!MAPILLARY_TOKEN) {
    return res.status(404).json({ token: null, error: 'Missing Mapillary token' });
  }
  res.json({ token: MAPILLARY_TOKEN });
});

app.all('/api/mapillary/*', async (req: Request, res: Response) => {
  if (!MAPILLARY_TOKEN) {
    return res.status(500).json({ error: 'Missing Mapillary token' });
  }

  const pathSuffix = req.path.replace(/^\/api\/mapillary/, '') || '/';
  const url = new URL(`https://graph.mapillary.com${pathSuffix}`);
  Object.entries(req.query).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach(v => url.searchParams.append(key, String(v)));
    } else {
      url.searchParams.set(key, String(value));
    }
  });
  url.searchParams.set('access_token', MAPILLARY_TOKEN);

  try {
    const upstream = await fetch(url.toString());
    const body = await upstream.arrayBuffer();
    res.status(upstream.status);
    upstream.headers.forEach((value, name) => {
      if (name.toLowerCase() === 'content-length') return;
      res.setHeader(name, value);
    });
    return res.send(Buffer.from(body));
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

app.post('/api/strava/token', async (req: Request, res: Response) => {
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Missing Strava client secret' });
  }

  const { code, redirect_uri } = req.body as { code?: string; redirect_uri?: string };
  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'Missing code or redirect_uri' });
  }

  try {
    const upstream = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri,
      }),
    });

    const body = await upstream.text();
    return res.status(upstream.status)
      .set('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .send(body);
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

app.post('/api/strava/refresh', async (req: Request, res: Response) => {
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Missing Strava client secret' });
  }

  const { refresh_token } = req.body as { refresh_token?: string };
  if (!refresh_token) {
    return res.status(400).json({ error: 'Missing refresh_token' });
  }

  try {
    const upstream = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token,
      }),
    });

    const body = await upstream.text();
    return res.status(upstream.status)
      .set('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .send(body);
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

app.get('/api/strava/segments', async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = auth.slice(7);
  const page = Number(req.query.page ?? '1');

  try {
    const upstream = await fetch(`https://www.strava.com/api/v3/segments/starred?page=${page}&per_page=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await upstream.text();
    return res.status(upstream.status)
      .set('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .send(body);
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

const server = http.createServer(app);
const io = new SocketIoServer(server, {
  cors: {
    origin: (origin, callback) => {
      try {
        if (isOriginAllowed(origin as string | undefined)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      } catch (e) {
        return callback(null, true);
      }
    },
    methods: ['GET', 'POST'],
  },
});

const clients = new Map<string, ClientState>();

io.on('connection', socket => {
  // Helper validators for socket event inputs
  const validateString = (v: unknown, maxLen = 32) => typeof v === 'string' && v.length > 0 && v.length <= maxLen;
  const validateNumber = (v: unknown, min = -Infinity, max = Infinity) => typeof v === 'number' && !Number.isNaN(v) && v >= min && v <= max;

  // NOTE: socket.io rate limiting should be done per-event — implement per-event quotas where needed

  socket.on('room:join', ({ room, name, color, state }) => {
    // validate inputs
    if (!validateString(room, 32) || !/^[a-zA-Z0-9_-]+$/.test(room)) {
      socket.emit('error', 'invalid room');
      return;
    }
    if (!validateString(name, 32)) { socket.emit('error', 'invalid name'); return; }
    if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) { socket.emit('error', 'invalid color'); return; }
    if (typeof state !== 'object' || state === null || Array.isArray(state)) { socket.emit('error', 'invalid state'); return; }
    const existing = clients.get(socket.id);
    if (existing?.room && existing.room !== room) {
      socket.leave(existing.room);
    }

    socket.join(room);
    clients.set(socket.id, { room, name, color, state });

    const peers = Array.from(clients.entries())
      .filter(([id, info]) => info.room === room && id !== socket.id)
      .map(([id, info]) => ({ id, room, name: info.name, color: info.color, ...info.state }));

    socket.emit('room:peers', peers);
    socket.to(room).emit('peer:joined', { id: socket.id, room, name, color, ...state });
  });

  socket.on('location:update', raw => {
    const client = clients.get(socket.id);
    if (!client?.room) return;
    try {
      const lat = Number((raw as any).lat);
      const lon = Number((raw as any).lon);
      const ele = Number((raw as any).ele);
      const speed = Math.max(0, Math.min(120, Number((raw as any).speed) || 0));
      const power = Math.max(0, Math.min(3000, Number((raw as any).power) || 0));
      const cadence = Math.max(0, Math.min(200, Number((raw as any).cadence) || 0));
      const hr = Math.max(0, Math.min(250, Number((raw as any).hr) || 0));
      const elapsed = Math.max(0, Number((raw as any).elapsed) || 0);
      if (!validateNumber(lat, -90, 90) || !validateNumber(lon, -180, 180)) return socket.emit('error', 'invalid location');

      const sanitized = { id: socket.id, lat, lon, ele: isNaN(ele) ? 0 : ele, speed, power, cadence, hr, elapsed } as Record<string, unknown>;
      socket.to(client.room).emit('peer:update', sanitized);
    } catch (e) {
      socket.emit('error', 'invalid payload');
    }
  });

  socket.on('webrtc:offer', ({ to, offer }) => {
    if (!validateString(to, 64) || offer == null) { socket.emit('error', 'invalid webrtc offer'); return; }
    socket.to(to).emit('webrtc:offer', { from: socket.id, offer });
  });

  socket.on('webrtc:answer', ({ to, answer }) => {
    if (!validateString(to, 64) || answer == null) { socket.emit('error', 'invalid webrtc answer'); return; }
    socket.to(to).emit('webrtc:answer', { from: socket.id, answer });
  });

  socket.on('webrtc:ice', ({ to, candidate }) => {
    if (!validateString(to, 64) || candidate == null) { socket.emit('error', 'invalid webrtc ice'); return; }
    socket.to(to).emit('webrtc:ice', { from: socket.id, candidate });
  });

  socket.on('disconnect', () => {
    const client = clients.get(socket.id);
    if (client?.room) {
      socket.to(client.room).emit('peer:left', { id: socket.id });
    }
    clients.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`VELOX backend proxy running on http://localhost:${PORT}`);
});
