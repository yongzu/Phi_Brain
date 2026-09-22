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

// 2026-09-16 사용자 지시: 별표가 과목이 아니라 Finding 박스 하나 단위 — 키가 '날짜::과목::번째'로 넓어졌다
test('Findings stars: per-box keys are stored in starred order; malformed ones are refused', async () => {
  const call = await client();
  await call('PUT', `/api/findings/favorites/${encodeURIComponent('2026-09-16::BI::0')}`);
  await call('PUT', `/api/findings/favorites/${encodeURIComponent('2026-09-15::general::2')}`);
  assert.deepEqual((await call('GET', '/api/journals')).body.findingsFavorites, ['2026-09-16::BI::0', '2026-09-15::general::2']);
  await call('DELETE', `/api/findings/favorites/${encodeURIComponent('2026-09-16::BI::0')}`);
  assert.deepEqual((await call('GET', '/api/journals')).body.findingsFavorites, ['2026-09-15::general::2']);
  for (const bad of ['2026-09-16::BI', '2026-9-16::BI::0', '2026-09-16::bi::0', '2026-09-16::BI::abc']) {
    assert.equal((await call('PUT', `/api/findings/favorites/${encodeURIComponent(bad)}`)).status, 400, bad);
  }
});

// 2026-09-22 사용자 지시: Findings에서만 삭제 — 원본 저널은 그대로, 숨긴 박스 키만 따로 둔다
test('Findings hidden boxes: hide, idempotent, show again, bad keys refused, listed with journals, journal untouched', async () => {
  const call = await client();
  assert.equal((await call('PUT', `/api/findings/hidden/${encodeURIComponent('2026-09-22::BI::abc123')}`, undefined, { auth: false })).status, 401);
  await call('PUT', '/api/journals/2026-09-22', { title: '', courses: ['BI'], html: '<h3>Finding</h3><p>x</p>', savedAt: 1 });
  await call('PUT', `/api/findings/hidden/${encodeURIComponent('2026-09-22::BI::abc123')}`);
  await call('PUT', `/api/findings/hidden/${encodeURIComponent('2026-09-21::general::z9')}`);
  await call('PUT', `/api/findings/hidden/${encodeURIComponent('2026-09-22::BI::abc123')}`);
  let list = (await call('GET', '/api/journals')).body;
  assert.deepEqual(list.findingsHidden, ['2026-09-22::BI::abc123', '2026-09-21::general::z9']);
  assert.equal(list.journals.find(j => j.date === '2026-09-22').html, '<h3>Finding</h3><p>x</p>');
  await call('DELETE', `/api/findings/hidden/${encodeURIComponent('2026-09-22::BI::abc123')}`);
  assert.deepEqual((await call('GET', '/api/journals')).body.findingsHidden, ['2026-09-21::general::z9']);
  for (const bad of ['2026-09-22::BI', '2026-09-22::bi::abc', '2026-09-22::BI::ABC', '2026-09-22::BI::a-b']) {
    assert.equal((await call('PUT', `/api/findings/hidden/${encodeURIComponent(bad)}`)).status, 400, bad);
  }
});
