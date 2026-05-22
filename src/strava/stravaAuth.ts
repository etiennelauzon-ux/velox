/// <reference types="vite/client" />
// src/strava/stravaAuth.ts — Strava OAuth 2.0 Authorization Code flow

import { stravaTokenResponseSchema } from '@/validation';
import { status } from '@/ui/domHelpers';
import { DEFAULT_STRAVA_CLIENT_ID } from '@/config/strava';

const CLIENT_ID    = (import.meta.env.VITE_STRAVA_CLIENT_ID as string | undefined) || DEFAULT_STRAVA_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_STRAVA_REDIRECT_URI as string | undefined;
const SCOPE        = 'read_all';

const LS_TOKEN        = 'veloxStravaAccessToken';
const LS_REFRESH      = 'veloxStravaRefreshToken';
const LS_EXPIRES      = 'veloxStravaExpiresAt';
const LS_ATHLETE_NAME = 'veloxStravaAthleteName';
const LS_PENDING_VFR  = 'veloxStravaOAuthPending';
export const STRAVA_CONFIGURED = Boolean(CLIENT_ID);

export interface StravaTokenState {
  accessToken: string | null;
  athleteName: string | null;
  expiresAt:   number | null;
}

export function getToken(): string | null {
  return localStorage.getItem(LS_TOKEN);
}

function isExpired(): boolean {
  const exp = localStorage.getItem(LS_EXPIRES);
  if (!exp) return false;
  return Date.now() / 1000 > Number(exp) - 60;
}

export function getTokenState(): StravaTokenState {
  return {
    accessToken: getToken(),
    athleteName: localStorage.getItem(LS_ATHLETE_NAME),
    expiresAt:   Number(localStorage.getItem(LS_EXPIRES)) || null,
  };
}

export function clearToken(): void {
  [LS_TOKEN, LS_REFRESH, LS_EXPIRES, LS_ATHLETE_NAME, LS_PENDING_VFR].forEach(k =>
    localStorage.removeItem(k),
  );
}

export function startOAuth(): void {
  if (!CLIENT_ID) {
    alert('Strava OAuth is not configured.');
    return;
  }
  localStorage.setItem(LS_PENDING_VFR, '1');
  const redirectUri = REDIRECT_URI || window.location.origin + window.location.pathname;
  const url = new URL('https://www.strava.com/oauth/authorize');
  url.searchParams.set('client_id',       CLIENT_ID);
  url.searchParams.set('redirect_uri',    redirectUri);
  url.searchParams.set('response_type',   'code');
  url.searchParams.set('approval_prompt', 'auto');
  url.searchParams.set('scope',           SCOPE);
  window.location.href = url.toString();
}

async function exchangeCode(code: string): Promise<void> {
  const redirectUri = REDIRECT_URI || window.location.origin + window.location.pathname;
  const res = await fetch('/api/strava/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json() as { error?: string; message?: string };
      detail = body.error || body.message || '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`token exchange failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  const json = await res.json();
  const parsed = stravaTokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(issue => issue.message).join('; '));
  }
  const data = parsed.data;
  localStorage.setItem(LS_TOKEN,   data.access_token);
  localStorage.setItem(LS_REFRESH, data.refresh_token);
  localStorage.setItem(LS_EXPIRES, String(data.expires_at));
  if (data.athlete) {
    const name = [data.athlete.firstname, data.athlete.lastname].filter(Boolean).join(' ');
    if (name) localStorage.setItem(LS_ATHLETE_NAME, name);
  }
}

export async function refreshToken(): Promise<string | null> {
  const refresh = localStorage.getItem(LS_REFRESH);
  if (!refresh) return null;
  try {
    const res = await fetch('/api/strava/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) { clearToken(); return null; }
    const data = stravaTokenResponseSchema.parse(await res.json());
    localStorage.setItem(LS_TOKEN,   data.access_token);
    localStorage.setItem(LS_REFRESH, data.refresh_token);
    localStorage.setItem(LS_EXPIRES, String(data.expires_at));
    return data.access_token;
  } catch { clearToken(); return null; }
}

export async function getValidToken(): Promise<string | null> {
  if (!getToken()) return null;
  if (!isExpired()) return getToken();
  return refreshToken();
}

export async function handleOAuthCallback(): Promise<boolean> {
  const pending = localStorage.getItem(LS_PENDING_VFR);
  if (!pending) return false;
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('code');
  const error  = params.get('error');
  localStorage.removeItem(LS_PENDING_VFR);
  window.history.replaceState({}, '', window.location.pathname);
  if (error || !code) { console.warn('[Strava] OAuth error:', error); return false; }
  try {
    await exchangeCode(code);
    status('Strava connected');
    return true;
  } catch (e) {
    console.warn('[Strava] OAuth exchange failed:', e);
    status('Strava connect failed: ' + (e as Error).message);
    return false;
  }
}
