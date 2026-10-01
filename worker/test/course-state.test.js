// 과목 상태: 수강기간 아님 · 완강 (2026-10-01 사용자 지시).
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { testD1 } from './d1.js';
import { signSession } from '../src/auth.js';
import { getTodo } from '../src/assignment/todo.js';

const OWNER = 'owner@example.com';
async function setup() {
  const env = { DB: testD1(), ALLOWED_EMAIL: OWNER, SESSION_SECRET: 'session-secret', ALLOWED_ORIGINS: 'https://yongzu.github.io' };
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
const kst = at => Date.parse(`${at}+09:00`);

test('course states: locked without a session; set, switch, clear; bad input refused', async () => {
  const { call } = await setup();
  assert.equal((await call('GET', '/api/assignment/course-states', undefined, { auth: false })).status, 401);
  assert.equal((await call('PUT', '/api/assignment/course-states/ewa', { state: 'completed' }, { auth: false })).status, 401);
  assert.deepEqual((await call('GET', '/api/assignment/course-states')).body, { states: {} });

  assert.deepEqual((await call('PUT', '/api/assignment/course-states/ewa', { state: 'completed' })).body, { ok: true, states: { ewa: 'completed' } });
  assert.deepEqual((await call('PUT', '/api/assignment/course-states/iae', { state: 'inactive' })).body, { ok: true, states: { ewa: 'completed', iae: 'inactive' } });
  // 과목 하나에 하나만 — 바꾸면 덮어쓴다
  assert.deepEqual((await call('PUT', '/api/assignment/course-states/iae', { state: 'completed' })).body.states, { ewa: 'completed', iae: 'completed' });
  assert.deepEqual((await call('PUT', '/api/assignment/course-states/iae', { state: null })).body.states, { ewa: 'completed' });
  assert.deepEqual((await call('GET', '/api/assignment/course-states')).body, { states: { ewa: 'completed' } });

  assert.equal((await call('PUT', '/api/assignment/course-states/ewa', { state: 'done' })).status, 400);
  assert.equal((await call('PUT', '/api/assignment/course-states/ewa', {})).status, 400);
  assert.equal((await call('PUT', '/api/assignment/course-states/zz', { state: 'inactive' })).status, 400);
});

test('course states: marked on matrix rows, left out of progress and TO-DO', async () => {
  const { env, call } = await setup();
  const before = (await call('GET', '/api/assignment/weeks/4/matrix')).body;
  assert.equal(before.progress.total, 24);

  await call('PUT', '/api/assignment/course-states/al', { state: 'inactive' });
  await call('PUT', '/api/assignment/course-states/ewa', { state: 'completed' });
  const after = (await call('GET', '/api/assignment/weeks/4/matrix')).body;
  assert.equal(after.rows.find(r => r.courseId === 'al').courseState, 'inactive');
  assert.equal(after.rows.find(r => r.courseId === 'ewa').courseState, 'completed');
  assert.equal(after.rows.find(r => r.courseId === 'bi').courseState, null);
  assert.equal(after.progress.total, 20);

  // 10/1: AL 셀프피드백(화 세션)은 빠지고 같은 화요일 IPS는 남는다
  const keys = (await getTodo(env.DB, kst('2026-10-01T12:00:00'))).items.map(i => i.key);
  assert.ok(!keys.some(k => k.startsWith('al:')));
  assert.ok(keys.includes('ips:4:s'));
});
