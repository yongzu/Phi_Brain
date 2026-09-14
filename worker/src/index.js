// Phi Brain API (Cloudflare Worker).
// Step 1 of the online move: health check, sign-in and the login lock.
// Step 2: Assignment Manage (/api/assignment/*, Gmail connect callback, weekly cron).
// Step 3: Journaling (/api/journals*, src/journals.js).
// Step 4: Future Item (/api/future, src/future.js) + session renewal for staying signed in.
// Every data endpoint sits behind requireSession().
import { verifyGoogleIdToken, googleKeys, signSession, verifySession, AuthError } from './auth.js';
import { encryptToken, decryptToken, signState, verifyState, safeReturnTo } from './secrets.js';
import * as svc from './assignment/service.js';
import { runSyncBatch, SyncError, DEFAULT_BATCH } from './assignment/sync.js';
import { buildAuthUrl, exchangeCode, getProfileEmail, revokeToken, GMAIL_SCOPE, GoogleError } from './assignment/google.js';
import { journalsApi, BadRequest } from './journals.js';
import { futureApi } from './future.js';
import { settingsApi } from './settings.js';

const allowedOrigins = env => (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin || !allowedOrigins(env).includes(origin)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

async function requireSession(request, env) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  return m ? verifySession(env.SESSION_SECRET, m[1], { allowedEmail: env.ALLOWED_EMAIL }) : null;
}

const redirectUri = (env, url) => env.GMAIL_REDIRECT_URI || `${url.origin}/auth/google/callback`;
const batchSize = env => Number(env.SYNC_BATCH) || DEFAULT_BATCH;
// must match wrangler.jsonc exactly (controller.cron is the configured string). Cloudflare
// cron takes SUN or 1-7 for the weekday — not 0 like GitHub Actions' cron.
const WEEKLY_CRON = '59 14 * * SUN';

// Google sends the browser back here after "Gmail 연결". No Bearer session on a
// top-level navigation — the signed state (secrets.js) is what authorizes it.
async function gmailCallback(url, env) {
  const state = await verifyState(env.SESSION_SECRET, url.searchParams.get('state'), { allowedEmail: env.ALLOWED_EMAIL });
  const returnTo = state && safeReturnTo(state.returnTo, allowedOrigins(env));
  if (!returnTo) return new Response('연결 요청이 만료됐거나 올바르지 않아요. 앱에서 다시 "연결하기"를 눌러 주세요.', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const back = result => {
    const u = new URL(returnTo);
    u.searchParams.set('gmail', result);
    return Response.redirect(u.toString(), 302);
  };

  const code = url.searchParams.get('code');
  if (!code) return back(url.searchParams.get('error') === 'access_denied' ? 'denied' : 'error');
  try {
    const tokens = await exchangeCode({ code, clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: redirectUri(env, url) });
    // the consent screen lets the user untick the Gmail box — then there is nothing to read with
    if (!String(tokens.scope || '').split(' ').includes(GMAIL_SCOPE)) return back('scope_missing');
    if (!tokens.refresh_token) return back('no_refresh_token');
    const email = await getProfileEmail(tokens.access_token).catch(() => null);
    await env.DB.prepare(`
      UPDATE gmail_connection SET connected = 1, email = ?, refresh_token_enc = ?, last_sync_error = NULL WHERE id = 1
    `).bind(email, await encryptToken(env.TOKEN_KEY, tokens.refresh_token)).run();
    return back('connected');
  } catch (err) {
    console.error('gmail connect failed', err instanceof GoogleError ? err.code : err);
    return back('error');
  }
}

async function assignmentApi(request, env, url, json, session) {
  const db = env.DB;
  const path = url.pathname.slice('/api/assignment'.length);
  const method = request.method;
  let m;

  if (path === '/weeks' && method === 'GET') {
    const weeks = await svc.getWeeks(db);
    return json(200, { weeks, currentWeekNo: svc.currentWeekNo(weeks) });
  }
  if ((m = path.match(/^\/weeks\/(\d+)\/matrix$/)) && method === 'GET') {
    const matrix = await svc.getWeekMatrix(db, Number(m[1]));
    return matrix ? json(200, matrix) : json(404, { error: 'week_not_found' });
  }
  if ((m = path.match(/^\/targets\/(\d+)$/)) && method === 'GET') {
    const detail = await svc.getTargetDetail(db, Number(m[1]));
    return detail ? json(200, detail) : json(404, { error: 'target_not_found' });
  }
  if ((m = path.match(/^\/targets\/(\d+)\/manual$/)) && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const result = await svc.setManualStatus(db, Number(m[1]), body.action, { force: !!body.force });
    if (result.error === 'target_not_found') return json(404, result);
    if (result.error) return json(400, result);
    return json(result.ok ? 200 : 409, result);
  }
  if (path === '/connection' && method === 'GET') {
    const c = await db.prepare('SELECT connected, email, last_sync_at, last_run_at, last_sync_error, sync_pending FROM gmail_connection WHERE id = 1').first();
    return json(200, { ...c, connected: !!c.connected, sync_pending: !!c.sync_pending });
  }
  if (path === '/connection/disconnect' && method === 'POST') {
    const c = await db.prepare('SELECT refresh_token_enc FROM gmail_connection WHERE id = 1').first();
    if (c?.refresh_token_enc) {
      // best effort: also revoke at Google, so the grant disappears from the account's third-party access list
      try { await revokeToken(await decryptToken(env.TOKEN_KEY, c.refresh_token_enc)); } catch (err) { console.error('revoke failed', err.message); }
    }
    await db.prepare(`
      UPDATE gmail_connection SET connected = 0, email = NULL, refresh_token_enc = NULL, sync_pending = 0, sync_since = NULL WHERE id = 1
    `).run();
    return json(200, { ok: true });
  }
  if (path === '/gmail/connect' && method === 'POST') {
    const { returnTo } = await request.json().catch(() => ({}));
    const safe = safeReturnTo(returnTo, allowedOrigins(env));
    if (!safe) return json(400, { error: 'bad_return_to' });
    if (!env.GOOGLE_CLIENT_SECRET || !env.TOKEN_KEY) return json(503, { error: 'server_not_configured' });
    const state = await signState(env.SESSION_SECRET, { email: session.email, returnTo: safe });
    return json(200, { url: buildAuthUrl({ clientId: env.GOOGLE_CLIENT_ID, redirectUri: redirectUri(env, url), state, loginHint: session.email }) });
  }
  if (path === '/sync' && method === 'POST') {
    try {
      return json(200, { ok: true, ...(await runSyncBatch(env, { batch: batchSize(env) })) });
    } catch (err) {
      if (err instanceof SyncError) return json(502, { ok: false, error: err.code });
      throw err;
    }
  }
  return json(404, { error: 'not_found' });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const json = (status, body) => new Response(JSON.stringify(body), {
      status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
    });
    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        await env.DB.prepare('SELECT 1').first();
        return json(200, { ok: true });
      }

      // exchange a Google ID token (from the sign-in button) for our session token
      if (url.pathname === '/api/session' && request.method === 'POST') {
        const { credential } = await request.json().catch(() => ({}));
        if (!credential) return json(400, { error: 'missing_credential' });
        const { email } = await verifyGoogleIdToken(credential, {
          clientId: env.GOOGLE_CLIENT_ID, allowedEmail: env.ALLOWED_EMAIL, getKeys: googleKeys,
        });
        const { token, exp } = await signSession(env.SESSION_SECRET, { email });
        return json(200, { token, email, expiresAt: exp * 1000 });
      }

      if (url.pathname === '/auth/google/callback' && request.method === 'GET') return gmailCallback(url, env);

      // ---- everything below requires a valid session ----
      const session = await requireSession(request, env);
      if (!session) return json(401, { error: 'unauthorized' });

      if (url.pathname === '/api/me' && request.method === 'GET') return json(200, { email: session.email });
      // sliding sign-in: a still-valid session is swapped for a fresh 30-day one (the page does this now and then)
      if (url.pathname === '/api/session/refresh' && request.method === 'POST') {
        const { token, exp } = await signSession(env.SESSION_SECRET, { email: session.email });
        return json(200, { token, email: session.email, expiresAt: exp * 1000 });
      }
      if (url.pathname === '/api/settings' || url.pathname.startsWith('/api/findings/')) {
        const res = await settingsApi(request, env, url, json);
        if (res) return res;
      }
      if (url.pathname === '/api/future') {
        const res = await futureApi(request, env, url, json);
        if (res) return res;
      }
      if (url.pathname.startsWith('/api/assignment/')) return await assignmentApi(request, env, url, json, session);
      if (url.pathname === '/api/journals' || url.pathname.startsWith('/api/journals/')) {
        const res = await journalsApi(request, env, url, json);
        if (res) return res;
      }

      return json(404, { error: 'not_found' });
    } catch (err) {
      if (err instanceof AuthError) return json(403, { error: err.reason });
      if (err instanceof BadRequest) return json(err.status, { error: err.code });
      console.error(err);
      return json(500, { error: 'internal_error' });
    }
  },

  // WEEKLY_CRON = Sunday 23:59 KST starts the weekly sync; the follow-up
  // triggers only continue a run that still has messages left (batched, see sync.js)
  async scheduled(controller, env) {
    const c = await env.DB.prepare('SELECT connected, sync_pending FROM gmail_connection WHERE id = 1').first();
    const isStart = controller.cron === WEEKLY_CRON;
    if (!c?.connected || (!isStart && !c.sync_pending)) return;
    try {
      const { done, summary } = await runSyncBatch(env, { batch: batchSize(env) });
      console.log('weekly sync', { cron: controller.cron, done, fetched: summary.fetched, matched: summary.matched, remaining: summary.remaining });
    } catch (err) {
      console.error('weekly sync failed', err instanceof SyncError ? err.code : err);
    }
  },
};
