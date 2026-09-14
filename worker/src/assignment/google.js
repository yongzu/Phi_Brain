// Google OAuth (authorization code flow) + a minimal Gmail API v1 client, on fetch.
// Port of server/googleOAuth.js + server/gmail.js.
import { FORMS_SENDER } from './matching.js';

// read-only, and nothing else — never a scope that can send, delete or modify mail
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

export class GoogleError extends Error {
  constructor(message, { status, code } = {}) { super(message); this.status = status; this.code = code; }
}

export function buildAuthUrl({ clientId, redirectUri, state, loginHint }) {
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: GMAIL_SCOPE,
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'false', state,
  });
  if (loginHint) params.set('login_hint', loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function postToken(body, fetchImpl) {
  const res = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body),
  });
  const json = await res.json().catch(() => ({}));
  // only Google's error code travels further (e.g. invalid_grant) — never the response body
  if (!res.ok) throw new GoogleError(`token endpoint ${res.status}`, { status: res.status, code: json.error || 'token_error' });
  return json;
}

export const exchangeCode = ({ code, clientId, clientSecret, redirectUri }, fetchImpl = fetch) =>
  postToken({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }, fetchImpl);
// -> { access_token, expires_in, refresh_token, scope, token_type }

export const refreshAccessToken = ({ refreshToken, clientId, clientSecret }, fetchImpl = fetch) =>
  postToken({ refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' }, fetchImpl);

export async function revokeToken(token, fetchImpl = fetch) {
  await fetchImpl('https://oauth2.googleapis.com/revoke', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }),
  });
}

async function gmailGet(accessToken, path, fetchImpl) {
  const res = await fetchImpl(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new GoogleError(`Gmail API ${res.status}`, { status: res.status, code: `gmail_${res.status}` });
  return res.json();
}

export const getProfileEmail = async (accessToken, fetchImpl = fetch) =>
  (await gmailGet(accessToken, '/profile', fetchImpl)).emailAddress || null;

// `after:` takes unix seconds; with the sender filter each sync reads related mail only
export function buildQuery({ afterSec } = {}) {
  const clauses = [`from:${FORMS_SENDER}`];
  if (afterSec) clauses.push(`after:${afterSec}`);
  return clauses.join(' ');
}

// every matching id, newest first (list calls are cheap: 500 ids per call)
export async function listMessageIds(accessToken, { afterSec } = {}, fetchImpl = fetch) {
  const ids = [];
  let pageToken = null;
  do {
    const params = new URLSearchParams({ q: buildQuery({ afterSec }), maxResults: '500' });
    if (pageToken) params.set('pageToken', pageToken);
    const res = await gmailGet(accessToken, `/messages?${params}`, fetchImpl);
    for (const m of res.messages || []) ids.push(m.id);
    pageToken = res.nextPageToken || null;
  } while (pageToken);
  return ids;
}

const utf8 = new TextDecoder();
function base64UrlDecode(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return utf8.decode(Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), c => c.charCodeAt(0)));
}

export function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+\n/g, '\n');
}

// first text/plain part, else text/html stripped to text — receipts arrive as either
export function extractBodyText(payload) {
  let plain = null, html = null;
  const walk = p => {
    if (!p) return;
    if (p.mimeType === 'text/plain' && p.body?.data) plain = plain || base64UrlDecode(p.body.data);
    if (p.mimeType === 'text/html' && p.body?.data) html = html || base64UrlDecode(p.body.data);
    (p.parts || []).forEach(walk);
  };
  walk(payload);
  if (plain) return plain;
  if (html) return stripHtml(html);
  return '';
}

const header = (payload, name) =>
  (payload.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

export async function fetchEmail(accessToken, messageId, fetchImpl = fetch) {
  const msg = await gmailGet(accessToken, `/messages/${encodeURIComponent(messageId)}?format=full`, fetchImpl);
  return {
    messageId: msg.id,
    threadId: msg.threadId,
    from: header(msg.payload, 'From'),
    subject: header(msg.payload, 'Subject'),
    receivedAt: new Date(Number(msg.internalDate)).toISOString(),
    bodyText: extractBodyText(msg.payload),
  };
}
