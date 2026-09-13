// Login lock for a single-user app, WebCrypto only (runs in Workers and Node ≥ 20).
//
// 1. The page's "Google로 로그인" button yields a Google ID token (a JWT signed
//    by Google). verifyGoogleIdToken checks it ourselves: RS256 signature
//    against Google's published keys, issuer, audience (our client id),
//    expiry, verified email — and that the email is the one allowed account.
// 2. We then issue our own session token (HMAC-signed, 30 days) that the page
//    sends as `Authorization: Bearer …`. A bearer token, not a cookie: the page
//    (yongzu.github.io) and this API (workers.dev) are different sites, and
//    browsers increasingly block such third-party cookies.
const enc = new TextEncoder();
const dec = new TextDecoder();

export const b64url = bytes => {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const b64urlDecode = str => {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s + '='.repeat((4 - (s.length % 4)) % 4)), c => c.charCodeAt(0));
};

export class AuthError extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}

const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const CLOCK_SKEW_SEC = 60;

export async function verifyGoogleIdToken(idToken, { clientId, allowedEmail, getKeys, now = Date.now() / 1000 }) {
  if (!clientId || !allowedEmail) throw new Error('server auth is not configured');
  const parts = typeof idToken === 'string' ? idToken.split('.') : [];
  if (parts.length !== 3) throw new AuthError('malformed_token');
  let header, payload;
  try {
    header = JSON.parse(dec.decode(b64urlDecode(parts[0])));
    payload = JSON.parse(dec.decode(b64urlDecode(parts[1])));
  } catch { throw new AuthError('malformed_token'); }
  if (header.alg !== 'RS256') throw new AuthError('bad_algorithm');

  const jwk = (await getKeys()).find(k => k.kid === header.kid);
  if (!jwk) throw new AuthError('unknown_key');
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlDecode(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  if (!valid) throw new AuthError('bad_signature');

  if (!GOOGLE_ISSUERS.includes(payload.iss)) throw new AuthError('bad_issuer');
  if (payload.aud !== clientId) throw new AuthError('bad_audience');
  if (typeof payload.exp !== 'number' || payload.exp < now - CLOCK_SKEW_SEC) throw new AuthError('expired');
  if (payload.email_verified !== true) throw new AuthError('email_not_verified');
  if (String(payload.email || '').toLowerCase() !== allowedEmail.trim().toLowerCase()) throw new AuthError('not_allowed');
  return { email: payload.email };
}

// Google rotates its signing keys; cache them per isolate for an hour
let keyCache = { keys: null, until: 0 };
export async function googleKeys(fetchImpl = fetch) {
  if (keyCache.keys && Date.now() < keyCache.until) return keyCache.keys;
  const res = await fetchImpl('https://www.googleapis.com/oauth2/v3/certs');
  if (!res.ok) throw new Error(`google certs ${res.status}`);
  keyCache = { keys: (await res.json()).keys, until: Date.now() + 3600 * 1000 };
  return keyCache.keys;
}

const hmacKey = secret => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
export const SESSION_TTL_SEC = 30 * 24 * 3600;

export async function signSession(secret, { email }, { now = Date.now() / 1000, ttl = SESSION_TTL_SEC } = {}) {
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const iat = Math.floor(now);
  const body = b64url(enc.encode(JSON.stringify({ v: 1, email, iat, exp: iat + ttl })));
  const sig = b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return { token: `${body}.${sig}`, exp: iat + ttl };
}

// → claims, or null for anything wrong (tampered, expired, other account)
export async function verifySession(secret, token, { allowedEmail, now = Date.now() / 1000 } = {}) {
  if (!secret || typeof token !== 'string') return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  let ok = false;
  try { ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), b64urlDecode(sig), enc.encode(body)); } catch { return null; }
  if (!ok) return null;
  let claims;
  try { claims = JSON.parse(dec.decode(b64urlDecode(body))); } catch { return null; }
  if (claims.v !== 1 || typeof claims.exp !== 'number' || claims.exp < now) return null;
  // re-checked on every request, so changing ALLOWED_EMAIL locks old sessions out too
  if (allowedEmail && String(claims.email).toLowerCase() !== allowedEmail.trim().toLowerCase()) return null;
  return claims;
}
