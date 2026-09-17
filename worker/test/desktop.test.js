// 데스크톱 앱 로그인 — 브라우저에서 받은 1회용 코드를 앱이 세션으로 바꿔 간다 (docs/DESKTOP.md 2단계).
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { testD1 } from './d1.js';
import { signSession, verifySession } from '../src/auth.js';
import { createLoginCode, exchangeLoginCode, CODE_TTL_SEC } from '../src/desktop.js';

const OWNER = 'owner@example.com';
const SECRET = 'session-secret';
const STATE = 'abcdefghijklmnop';

async function client() {
  const env = { DB: testD1(), ALLOWED_EMAIL: OWNER, SESSION_SECRET: SECRET, ALLOWED_ORIGINS: 'https://yongzu.github.io' };
  const { token } = await signSession(SECRET, { email: OWNER });
  const call = async (method, path, body, { auth = true } = {}) => {
    const headers = { Origin: 'https://yongzu.github.io' };
    if (auth) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await worker.fetch(new Request(`https://api.phibrain.workers.dev${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  return { env, call };
}

test('브라우저에서 코드를 받아 앱이 세션으로 바꾼다 — 코드는 1회용', async () => {
  const { env, call } = await client();
  const made = await call('POST', '/api/session/desktop/code', { state: STATE });
  assert.equal(made.status, 200);
  assert.match(made.body.code, /^[0-9a-f]{64}$/);

  // 앱은 세션 없이 부른다 — 코드 자체가 열쇠다
  const got = await call('POST', '/api/session/desktop/exchange', { code: made.body.code, state: STATE }, { auth: false });
  assert.equal(got.status, 200);
  assert.equal(got.body.email, OWNER);
  assert.equal((await verifySession(SECRET, got.body.token, { allowedEmail: OWNER })).email, OWNER);

  // 같은 코드를 다시 쓰면 거절, 저장소에도 남지 않는다
  assert.equal((await call('POST', '/api/session/desktop/exchange', { code: made.body.code, state: STATE }, { auth: false })).status, 400);
  assert.equal((await env.DB.prepare('SELECT count(*) c FROM desktop_login_codes').first()).c, 0);
});

test('코드 발급은 로그인한 사람만 — 세션 없이는 401', async () => {
  const { call } = await client();
  assert.equal((await call('POST', '/api/session/desktop/code', { state: STATE }, { auth: false })).status, 401);
});

test('state가 다르면 교환되지 않고, 그 코드도 폐기된다', async () => {
  const { env, call } = await client();
  const { body } = await call('POST', '/api/session/desktop/code', { state: STATE });
  assert.equal((await call('POST', '/api/session/desktop/exchange', { code: body.code, state: 'qrstuvwxyz012345' }, { auth: false })).status, 400);
  // 찔러본 코드는 남겨두지 않는다 — 맞는 state로 다시 와도 이미 없다
  assert.equal((await call('POST', '/api/session/desktop/exchange', { code: body.code, state: STATE }, { auth: false })).status, 400);
  assert.equal((await env.DB.prepare('SELECT count(*) c FROM desktop_login_codes').first()).c, 0);
});

test('60초가 지난 코드는 못 쓴다', async () => {
  const db = testD1();
  const t0 = new Date('2026-09-17T00:00:00.000Z');
  const { code } = await createLoginCode(db, OWNER, STATE, { now: t0 });
  const late = new Date(t0.getTime() + (CODE_TTL_SEC + 1) * 1000);
  await assert.rejects(() => exchangeLoginCode(db, SECRET, code, STATE, { now: late }), /bad_code/);
});

test('형식이 틀린 코드·state는 조회 전에 막는다', async () => {
  const { call } = await client();
  assert.equal((await call('POST', '/api/session/desktop/code', { state: 'short' })).status, 400);
  assert.equal((await call('POST', '/api/session/desktop/exchange', { code: 'not-a-code', state: STATE }, { auth: false })).status, 400);
  assert.equal((await call('POST', '/api/session/desktop/exchange', { code: 'a'.repeat(64), state: STATE }, { auth: false })).status, 400);
});
