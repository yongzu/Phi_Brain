// 온라인 전환 4단계: the Future Item board API + session renewal.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { testD1 } from './d1.js';
import { signSession, verifySession } from '../src/auth.js';

const OWNER = 'owner@example.com';
const makeEnv = () => ({ DB: testD1(), ALLOWED_EMAIL: OWNER, SESSION_SECRET: 'session-secret', ALLOWED_ORIGINS: 'https://yongzu.github.io' });
async function client(env = makeEnv(), { now } = {}) {
  const { token } = await signSession(env.SESSION_SECRET, { email: OWNER }, now ? { now } : undefined);
  const call = async (method, path, body, { auth = true } = {}) => {
    const headers = { Origin: 'https://yongzu.github.io' };
    if (auth) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await worker.fetch(new Request(`https://api.phibrain.workers.dev${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  return { env, call, token };
}
const item = (id, text, extra = {}) => ({ id, text, scope: 'unassigned', courseId: null, customId: null, done: false, createdAt: 1, placedAt: 1, updatedAt: 1, source: null, ...extra });
const board = (items, extra = {}) => ({ items, favorites: [], customBoxes: [], boxOrder: [], ...extra });

test('the board and session renewal are locked without a session', async () => {
  const { call } = await client();
  assert.equal((await call('GET', '/api/future', undefined, { auth: false })).status, 401);
  assert.equal((await call('PUT', '/api/future', { data: board([]), baseVersion: 0 }, { auth: false })).status, 401);
  assert.equal((await call('POST', '/api/session/refresh', undefined, { auth: false })).status, 401);
});

test('empty → save → edit on the version seen → read back', async () => {
  const { call } = await client();
  assert.deepEqual((await call('GET', '/api/future')).body, { data: null, version: 0 });
  assert.deepEqual((await call('PUT', '/api/future', { data: board([item('a', '레퍼런스 찾기')]), baseVersion: 0 })).body, { ok: true, version: 1 });
  const custom = { customBoxes: [{ id: 'x', name: '졸업 전시' }], favorites: ['course:BI'], boxOrder: ['course:BI'] };
  assert.deepEqual((await call('PUT', '/api/future', { data: board([item('a', '레퍼런스 찾기', { done: true })], custom), baseVersion: 1 })).body, { ok: true, version: 2 });
  const got = (await call('GET', '/api/future')).body;
  assert.equal(got.version, 2);
  assert.equal(got.data.items[0].done, true);
  assert.deepEqual(got.data.customBoxes, [{ id: 'x', name: '졸업 전시' }]);
  assert.deepEqual(got.data.favorites, ['course:BI']);
});

test('a save built on an older version is a conflict with the server copy; force overwrites', async () => {
  const { call } = await client();
  await call('PUT', '/api/future', { data: board([item('a', '처음')]), baseVersion: 0 });
  await call('PUT', '/api/future', { data: board([item('a', '노트북에서 체크', { done: true })]), baseVersion: 1 }); // other device → v2
  const stale = await call('PUT', '/api/future', { data: board([item('a', '처음'), item('b', '데스크톱에서 추가')]), baseVersion: 1 });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.version, 2);
  assert.equal(stale.body.data.items[0].text, '노트북에서 체크');
  // a device that thinks nothing is saved yet
  assert.equal((await call('PUT', '/api/future', { data: board([]), baseVersion: 0 })).status, 409);
  const forced = await call('PUT', '/api/future', { data: board([item('b', '데스크톱에서 추가')]), baseVersion: 1, force: true });
  assert.deepEqual(forced.body, { ok: true, version: 3 });
});

test('bad boards are refused; junk inside a board is dropped', async () => {
  const { call } = await client();
  assert.equal((await call('PUT', '/api/future', { data: { nope: 1 }, baseVersion: 0 })).status, 400);
  assert.equal((await call('PUT', '/api/future', { data: board([item('a', 'x'.repeat(1_000_001))]), baseVersion: 0 })).status, 413);
  await call('PUT', '/api/future', { data: { items: [item('a', 'ok'), { id: 5 }, null], favorites: ['general', 3], customBoxes: [{ id: 'x' }], boxOrder: 'no' }, baseVersion: 0 });
  assert.deepEqual((await call('GET', '/api/future')).body.data, { items: [item('a', 'ok')], favorites: ['general'], customBoxes: [], boxOrder: [] });
});

test('session renewal hands back a fresh 30-day token for the same account', async () => {
  const env = makeEnv();
  const tenDaysAgo = Date.now() / 1000 - 10 * 86400;
  const { call } = await client(env, { now: tenDaysAgo });
  const r = await call('POST', '/api/session/refresh');
  assert.equal(r.status, 200);
  assert.equal(r.body.email, OWNER);
  assert.ok(r.body.expiresAt > Date.now() + 29 * 86400 * 1000);
  assert.equal((await verifySession(env.SESSION_SECRET, r.body.token, { allowedEmail: OWNER })).email, OWNER);
});
