// 이번 주 할 일(TO-DO) 열 (2026-10-01 사용자 요구사항).
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { testD1 } from './d1.js';
import { signSession } from '../src/auth.js';

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

test('TO-DO is locked without a session', async () => {
  const { call } = await setup();
  assert.equal((await call('GET', '/api/assignment/todo', undefined, { auth: false })).status, 401);
  assert.equal((await call('PUT', '/api/assignment/todo/prefs', { order: [], memos: {} }, { auth: false })).status, 401);
});

test('TO-DO items: one assignment + one self-feedback per noted course×week, self-feedback due = late due, status from mail', async () => {
  const { env, call } = await setup();
  assert.deepEqual((await call('GET', '/api/assignment/todo')).body, { items: [], prefs: { order: [], memos: {} } });

  await call('PUT', '/api/assignment/notes/bi/3', { raw: 'BI 3주차', dueAt: '2026-09-28T23:59', lateDueAt: '2026-09-29T23:59', baseVersion: null });
  await call('PUT', '/api/assignment/notes/pc/4', { raw: 'PC 4주차', dueAt: '2026-10-04T23:59', baseVersion: null });
  await call('PUT', '/api/assignment/notes/al/4', { raw: '마감 없음', baseVersion: null }); // 마감이 없으면 할 일에 안 나온다
  const target = await env.DB.prepare(`SELECT t.id FROM submission_targets t JOIN weeks w ON w.id = t.week_id
    WHERE t.course_id = 'bi' AND w.week_no = 3 AND t.kind = 'self_feedback'`).first();
  await env.DB.prepare(`INSERT INTO submission_evidence (target_id, gmail_message_id, received_at, subject, created_at)
    VALUES (?, 'm1', '2026-09-30T23:10:58.000Z', '[BI] 셀프피드백 제출', '2026-10-01T00:00:00Z')`).bind(target.id).run();

  const { items } = (await call('GET', '/api/assignment/todo')).body;
  assert.deepEqual(items.map(i => [i.key, i.dueAt, i.status]), [
    ['bi:3:a', '2026-09-28T23:59', 'unconfirmed'],
    ['bi:3:s', '2026-09-29T23:59', 'confirmed_mail'],
    ['pc:4:a', '2026-10-04T23:59', 'unconfirmed'],
    ['pc:4:s', '2026-10-04T23:59', 'unconfirmed'], // 지각 마감이 없으면 과제 마감
  ]);
  assert.equal(items[0].code, 'BI');
  assert.equal(items[1].kind, 'self_feedback');
  assert.ok(items[1].targetId);
  assert.match(items[1].url, /self-feedback/);
});

test('TO-DO prefs: order and one-line memos saved, trimmed, empty memos dropped, bad input refused', async () => {
  const { call } = await setup();
  const saved = await call('PUT', '/api/assignment/todo/prefs', { order: ['bi:3:a', 'pc:4:s', 'bi:3:a'], memos: { 'bi:3:a': '  레퍼런스\n2장만  ', 'pc:4:s': '  ' } });
  assert.deepEqual(saved.body, { ok: true, prefs: { order: ['bi:3:a', 'pc:4:s'], memos: { 'bi:3:a': '레퍼런스 2장만' } } });
  assert.deepEqual((await call('GET', '/api/assignment/todo')).body.prefs, { order: ['bi:3:a', 'pc:4:s'], memos: { 'bi:3:a': '레퍼런스 2장만' } });

  assert.equal((await call('PUT', '/api/assignment/todo/prefs', { order: ['BI:3:a'], memos: {} })).status, 400);
  assert.equal((await call('PUT', '/api/assignment/todo/prefs', { order: [], memos: { 'bi:3:x': 'a' } })).status, 400);
  assert.equal((await call('PUT', '/api/assignment/todo/prefs', { order: [], memos: { 'bi:3:a': '가'.repeat(201) } })).status, 400);
  assert.equal((await call('PUT', '/api/assignment/todo/prefs', { order: [], memos: { 'bi:3:a': '가'.repeat(200) } })).status, 200);
  assert.equal((await call('PUT', '/api/assignment/todo/prefs', { order: 'x', memos: {} })).status, 400);
  assert.equal((await call('PUT', '/api/assignment/todo/prefs', null)).status, 400);
});
