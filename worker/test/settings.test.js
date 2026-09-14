// Findings box stars + nickname (2026-09-14 사용자 요구사항).
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { testD1 } from './d1.js';
import { signSession } from '../src/auth.js';

const OWNER = 'owner@example.com';
async function client() {
  const env = { DB: testD1(), ALLOWED_EMAIL: OWNER, SESSION_SECRET: 'session-secret', ALLOWED_ORIGINS: 'https://yongzu.github.io' };
  const { token } = await signSession(env.SESSION_SECRET, { email: OWNER });
  return async (method, path, body, { auth = true } = {}) => {
    const headers = { Origin: 'https://yongzu.github.io' };
    if (auth) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await worker.fetch(new Request(`https://api.phibrain.workers.dev${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    return { status: res.status, body: await res.json().catch(() => null) };
  };
}

test('settings and Findings stars are locked without a session', async () => {
  const call = await client();
  assert.equal((await call('GET', '/api/settings', undefined, { auth: false })).status, 401);
  assert.equal((await call('PUT', '/api/settings', { nickname: 'x' }, { auth: false })).status, 401);
  assert.equal((await call('PUT', '/api/findings/favorites/BI', undefined, { auth: false })).status, 401);
});

test('nickname: empty at first, saved trimmed, capped at 20 characters, cleared with an empty string', async () => {
  const call = await client();
  assert.deepEqual((await call('GET', '/api/settings')).body, { nickname: '' });
  assert.deepEqual((await call('PUT', '/api/settings', { nickname: '  파이   브레인 \n' })).body, { ok: true, nickname: '파이 브레인' });
  assert.deepEqual((await call('GET', '/api/settings')).body, { nickname: '파이 브레인' });
  assert.equal((await call('PUT', '/api/settings', { nickname: '가'.repeat(21) })).status, 400);
  assert.equal((await call('PUT', '/api/settings', { nickname: '가'.repeat(20) })).status, 200);
  assert.equal((await call('PUT', '/api/settings', { nickname: 3 })).status, 400);
  await call('PUT', '/api/settings', { nickname: '' });
  assert.deepEqual((await call('GET', '/api/settings')).body, { nickname: '' });
});

test('Findings stars: star in order, idempotent, unstar, bad keys refused, listed with journals', async () => {
  const call = await client();
  await call('PUT', '/api/findings/favorites/EWA');
  await call('PUT', '/api/findings/favorites/general');
  await call('PUT', '/api/findings/favorites/EWA');
  assert.deepEqual((await call('GET', '/api/journals')).body.findingsFavorites, ['EWA', 'general']);
  await call('DELETE', '/api/findings/favorites/EWA');
  assert.deepEqual((await call('GET', '/api/journals')).body.findingsFavorites, ['general']);
  assert.equal((await call('PUT', '/api/findings/favorites/not%20a%20course')).status, 400);
});
