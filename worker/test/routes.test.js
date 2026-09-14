// The Worker's HTTP surface for step 2: login lock on every assignment route,
// the Gmail connect state, and the OAuth callback.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { testD1 } from './d1.js';
import { signSession } from '../src/auth.js';
import { signState, verifyState, decryptToken } from '../src/secrets.js';

const OWNER = 'owner@example.com';
const PAGE = 'https://yongzu.github.io/Phi_Brain/prototypes/home.html#assignment';
const makeEnv = () => ({
  DB: testD1(), ALLOWED_EMAIL: OWNER, SESSION_SECRET: 'session-secret', TOKEN_KEY: Buffer.alloc(32, 3).toString('base64'),
  GOOGLE_CLIENT_ID: 'cid.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'client-secret',
  ALLOWED_ORIGINS: 'https://yongzu.github.io,http://localhost:5500', SYNC_BATCH: '15',
});
const API = 'https://api.phibrain.workers.dev';
async function call(env, path, { method = 'GET', body, token, origin = 'https://yongzu.github.io' } = {}) {
  const headers = { Origin: origin };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  return worker.fetch(new Request(API + path, { method, headers, body: body && JSON.stringify(body), redirect: 'manual' }), env);
}
const ownerToken = async env => (await signSession(env.SESSION_SECRET, { email: OWNER })).token;

test('every assignment route is locked without a valid session', async () => {
  const env = makeEnv();
  for (const [method, path] of [['GET', '/api/assignment/weeks'], ['GET', '/api/assignment/weeks/2/matrix'], ['GET', '/api/assignment/targets/1'],
    ['POST', '/api/assignment/targets/1/manual'], ['GET', '/api/assignment/connection'], ['POST', '/api/assignment/connection/disconnect'],
    ['POST', '/api/assignment/sync'], ['POST', '/api/assignment/gmail/connect']]) {
    assert.equal((await call(env, path, { method })).status, 401, `${method} ${path}`);
    assert.equal((await call(env, path, { method, token: 'forged.token' })).status, 401, `${method} ${path} forged`);
  }
  // a token for another account (e.g. after ALLOWED_EMAIL changed) is refused too
  const other = (await signSession(env.SESSION_SECRET, { email: 'someone@example.com' })).token;
  assert.equal((await call(env, '/api/assignment/weeks', { token: other })).status, 401);
});

test('signed in: weeks, matrix, manual mark and detail work end to end', async () => {
  const env = makeEnv();
  const token = await ownerToken(env);
  const weeks = await (await call(env, '/api/assignment/weeks', { token })).json();
  assert.equal(weeks.weeks.length, 17);
  const res = await call(env, '/api/assignment/weeks/2/matrix', { token });
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://yongzu.github.io');
  const matrix = await res.json();
  const target = matrix.rows.find(r => r.code === 'BI').assignment.targetId;

  const marked = await call(env, `/api/assignment/targets/${target}/manual`, { method: 'POST', token, body: { action: 'confirmed_manual' } });
  assert.deepEqual(await marked.json(), { ok: true, status: 'confirmed_manual' });
  assert.equal((await call(env, `/api/assignment/targets/${target}/manual`, { method: 'POST', token, body: { action: 'nope' } })).status, 400);
  const detail = await (await call(env, `/api/assignment/targets/${target}`, { token })).json();
  assert.equal(detail.status, 'confirmed_manual');
  assert.equal((await call(env, '/api/assignment/targets/999999', { token })).status, 404);

  const conn = await (await call(env, '/api/assignment/connection', { token })).json();
  assert.equal(conn.connected, false);
  const sync = await call(env, '/api/assignment/sync', { method: 'POST', token });
  assert.equal(sync.status, 502);
  assert.deepEqual(await sync.json(), { ok: false, error: 'not_connected' });
});

test('"연결하기" returns a Google URL whose state only returns to our own pages', async () => {
  const env = makeEnv();
  const token = await ownerToken(env);
  assert.equal((await call(env, '/api/assignment/gmail/connect', { method: 'POST', token, body: { returnTo: 'https://evil.example/steal' } })).status, 400);
  const { url } = await (await call(env, '/api/assignment/gmail/connect', { method: 'POST', token, body: { returnTo: PAGE } })).json();
  const u = new URL(url);
  assert.equal(u.searchParams.get('redirect_uri'), `${API}/auth/google/callback`);
  const state = await verifyState(env.SESSION_SECRET, u.searchParams.get('state'), { allowedEmail: OWNER });
  assert.equal(state.returnTo, PAGE);
  // a state is not a session, and a session is not a state
  assert.equal((await call(env, '/api/me', { token: u.searchParams.get('state') })).status, 401);
  assert.equal(await verifyState(env.SESSION_SECRET, token, { allowedEmail: OWNER }), null);
});

test('callback: a missing, forged or expired state is refused without touching the database', async () => {
  const env = makeEnv();
  assert.equal((await call(env, '/auth/google/callback?code=c')).status, 400);
  assert.equal((await call(env, '/auth/google/callback?code=c&state=abc.def')).status, 400);
  const expired = await signState(env.SESSION_SECRET, { email: OWNER, returnTo: PAGE }, { now: Date.now() / 1000 - 3600 });
  assert.equal((await call(env, `/auth/google/callback?code=c&state=${encodeURIComponent(expired)}`)).status, 400);
  const otherAccount = await signState(env.SESSION_SECRET, { email: 'someone@example.com', returnTo: PAGE });
  assert.equal((await call(env, `/auth/google/callback?code=c&state=${encodeURIComponent(otherAccount)}`)).status, 400);
  assert.equal((await env.DB.prepare('SELECT connected FROM gmail_connection').first()).connected, 0);
});

test('callback: a valid code stores the refresh token encrypted and returns to the page', async t => {
  const env = makeEnv();
  const state = await signState(env.SESSION_SECRET, { email: OWNER, returnTo: PAGE });
  const realFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  let scope = 'https://www.googleapis.com/auth/gmail.readonly';
  globalThis.fetch = async url => {
    if (String(url).startsWith('https://oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'at', refresh_token: 'rt-new', expires_in: 3600, scope }));
    }
    if (String(url).endsWith('/profile')) return new Response(JSON.stringify({ emailAddress: OWNER }));
    throw new Error(`unexpected ${url}`);
  };

  const res = await call(env, `/auth/google/callback?code=c&state=${encodeURIComponent(state)}`);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), 'https://yongzu.github.io/Phi_Brain/prototypes/home.html?gmail=connected#assignment');
  const row = await env.DB.prepare('SELECT * FROM gmail_connection').first();
  assert.equal(row.connected, 1);
  assert.equal(row.email, OWNER);
  assert.equal(row.refresh_token_enc.includes('rt-new'), false);
  assert.equal(await decryptToken(env.TOKEN_KEY, row.refresh_token_enc), 'rt-new');

  // the Gmail checkbox unticked on the consent screen → not stored as connected
  const env2 = makeEnv();
  scope = 'openid';
  const res2 = await call(env2, `/auth/google/callback?code=c&state=${encodeURIComponent(state)}`);
  assert.match(res2.headers.get('Location'), /gmail=scope_missing/);
  assert.equal((await env2.DB.prepare('SELECT connected FROM gmail_connection').first()).connected, 0);
});

test('the weekly cron starts a run; follow-up triggers only continue a pending one', async () => {
  const env = makeEnv();
  let calls = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { calls++; throw new Error('should not be called'); };
  try {
    await worker.scheduled({ cron: '59 14 * * 0' }, env); // not connected → nothing
    await env.DB.prepare('UPDATE gmail_connection SET connected = 1 WHERE id = 1').run();
    await worker.scheduled({ cron: '*/10 15-16 * * 0' }, env); // connected but nothing pending → nothing
    assert.equal(calls, 0);
    await worker.scheduled({ cron: '59 14 * * 0' }, env); // start → fails fast (no stored token), recorded, no throw
    assert.equal((await env.DB.prepare('SELECT last_sync_error FROM gmail_connection').first()).last_sync_error, 'not_connected');
  } finally { globalThis.fetch = realFetch; }
});
