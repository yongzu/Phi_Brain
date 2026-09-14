// 온라인 전환 3단계: the journal API through the Worker's own fetch handler.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { testD1 } from './d1.js';
import { signSession } from '../src/auth.js';

const OWNER = 'owner@example.com';
const makeEnv = () => ({ DB: testD1(), ALLOWED_EMAIL: OWNER, SESSION_SECRET: 'session-secret', ALLOWED_ORIGINS: 'https://yongzu.github.io' });
async function client(env = makeEnv()) {
  const { token } = await signSession(env.SESSION_SECRET, { email: OWNER });
  const call = async (method, path, body, { auth = true } = {}) => {
    const headers = { Origin: 'https://yongzu.github.io' };
    if (auth) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await worker.fetch(new Request(`https://api.phibrain.workers.dev${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  return { env, call };
}
const journal = (over = {}) => ({ title: '9월 14일 저널', courses: ['BI', 'general'], html: '<h3>Fact</h3><p>수업</p>', savedAt: 1789350000000, ...over });

test('every journal route is locked without a session', async () => {
  const { call } = await client();
  for (const [m, p] of [['GET', '/api/journals'], ['PUT', '/api/journals/2026-09-14'], ['DELETE', '/api/journals/2026-09-14'],
    ['PUT', '/api/journals/2026-09-14/favorites/BI'], ['POST', '/api/journals/import']]) {
    assert.equal((await call(m, p, m === 'GET' || m === 'DELETE' ? undefined : {}, { auth: false })).status, 401, `${m} ${p}`);
  }
});

test('save → list → edit with the right version → delete', async () => {
  const { call } = await client();
  let r = await call('PUT', '/api/journals/2026-09-14', { ...journal(), baseVersion: null });
  assert.deepEqual(r, { status: 200, body: { ok: true, version: 1 } });
  r = await call('PUT', '/api/journals/2026-09-14', { ...journal({ html: '<p>고침</p>' }), baseVersion: 1 });
  assert.deepEqual(r.body, { ok: true, version: 2 });

  const list = (await call('GET', '/api/journals')).body;
  assert.deepEqual(list.journals, [{ date: '2026-09-14', title: '9월 14일 저널', courses: ['BI', 'general'], html: '<p>고침</p>', savedAt: 1789350000000, version: 2 }]);

  assert.equal((await call('DELETE', '/api/journals/2026-09-14?baseVersion=2')).status, 200);
  assert.deepEqual((await call('GET', '/api/journals')).body.journals, []);
  // undo = save again as new
  assert.equal((await call('PUT', '/api/journals/2026-09-14', { ...journal(), baseVersion: null })).body.version, 1);
});

test('an edit made on another device in between is a conflict, not a silent overwrite; force overwrites', async () => {
  const { call } = await client();
  await call('PUT', '/api/journals/2026-09-14', { ...journal(), baseVersion: null });
  await call('PUT', '/api/journals/2026-09-14', { ...journal({ html: '<p>노트북에서</p>' }), baseVersion: 1 }); // device B → v2

  const stale = await call('PUT', '/api/journals/2026-09-14', { ...journal({ html: '<p>데스크톱에서</p>' }), baseVersion: 1 }); // device A still on v1
  assert.equal(stale.status, 409);
  assert.equal(stale.body.journal.html, '<p>노트북에서</p>');
  assert.equal(stale.body.journal.version, 2);
  // a device that thinks the date is new, but it isn't
  assert.equal((await call('PUT', '/api/journals/2026-09-14', { ...journal(), baseVersion: null })).status, 409);
  // stale delete is refused too
  assert.equal((await call('DELETE', '/api/journals/2026-09-14?baseVersion=1')).status, 409);

  const forced = await call('PUT', '/api/journals/2026-09-14', { ...journal({ html: '<p>데스크톱에서</p>' }), baseVersion: 1, force: true });
  assert.deepEqual(forced.body, { ok: true, version: 3 });
  assert.equal((await call('GET', '/api/journals')).body.journals[0].html, '<p>데스크톱에서</p>');

  // saved on a device that saw it, but it was deleted elsewhere → ask
  await call('DELETE', '/api/journals/2026-09-14?baseVersion=3');
  const gone = await call('PUT', '/api/journals/2026-09-14', { ...journal(), baseVersion: 3 });
  assert.deepEqual([gone.status, gone.body.journal], [409, null]);
});

test('bad input is refused', async () => {
  const { call } = await client();
  assert.equal((await call('PUT', '/api/journals/2026-02-30', { ...journal(), baseVersion: null })).status, 400);
  assert.equal((await call('PUT', '/api/journals/today', { ...journal(), baseVersion: null })).status, 400);
  assert.equal((await call('PUT', '/api/journals/2026-09-14', { ...journal({ html: 'x'.repeat(500_001) }), baseVersion: null })).status, 413);
  // unknown course codes are dropped, not stored
  await call('PUT', '/api/journals/2026-09-13', { ...journal({ courses: ['BI', '<script>', 'bi', 'general'] }), baseVersion: null });
  assert.deepEqual((await call('GET', '/api/journals')).body.journals[0].courses, ['BI', 'general']);
  assert.equal((await call('PUT', '/api/journals/2026-09-13/favorites/bad course')).status, 400);
});

test('favorites: star, unstar, and deleting a journal removes its stars', async () => {
  const { call } = await client();
  await call('PUT', '/api/journals/2026-09-14', { ...journal(), baseVersion: null });
  await call('PUT', '/api/journals/2026-09-14/favorites/BI');
  await call('PUT', '/api/journals/2026-09-14/favorites/BI'); // idempotent
  await call('PUT', '/api/journals/2026-09-14/favorites/general');
  assert.deepEqual((await call('GET', '/api/journals')).body.favorites, ['2026-09-14::BI', '2026-09-14::general']);
  await call('DELETE', '/api/journals/2026-09-14/favorites/general');
  assert.deepEqual((await call('GET', '/api/journals')).body.favorites, ['2026-09-14::BI']);
  await call('DELETE', '/api/journals/2026-09-14?baseVersion=1');
  assert.deepEqual((await call('GET', '/api/journals')).body.favorites, []);
});

test('import adds only what the server lacks, reports same and conflicting dates, never overwrites', async () => {
  const { call } = await client();
  await call('PUT', '/api/journals/2026-09-10', { ...journal({ html: '<p>서버 것</p>' }), baseVersion: null });
  await call('PUT', '/api/journals/2026-09-11', { ...journal({ html: '<p>같은 것</p>' }), baseVersion: null });

  const r = await call('POST', '/api/journals/import', { journals: [
    { date: '2026-09-09', ...journal({ html: '<p>새 것</p>' }), favorites: ['BI'] },
    { date: '2026-09-10', ...journal({ html: '<p>브라우저 것</p>' }), favorites: ['BI'] },
    { date: '2026-09-11', ...journal({ html: '<p>같은 것</p>' }), favorites: ['general'] },
    { date: 'nope', ...journal() },
  ] });
  assert.deepEqual(r.body, { imported: ['2026-09-09'], same: ['2026-09-11'], conflicts: ['2026-09-10'], invalid: ['nope'] });

  const list = (await call('GET', '/api/journals')).body;
  assert.equal(list.journals.find(j => j.date === '2026-09-10').html, '<p>서버 것</p>');
  assert.equal(list.journals.find(j => j.date === '2026-09-09').html, '<p>새 것</p>');
  // stars came along only for journals now on the server with that content
  assert.deepEqual(list.favorites.sort(), ['2026-09-09::BI', '2026-09-11::general']);

  // importing the same browser again changes nothing
  const again = await call('POST', '/api/journals/import', { journals: [{ date: '2026-09-09', ...journal({ html: '<p>새 것</p>' }) }] });
  assert.deepEqual(again.body, { imported: [], same: ['2026-09-09'], conflicts: [], invalid: [] });
  assert.equal((await call('POST', '/api/journals/import', { journals: Array.from({ length: 21 }, (_, i) => ({ date: `2026-08-${String(i + 1).padStart(2, '0')}`, ...journal() })) })).status, 413);
});
