// 이번 주 할 일(TO-DO) 열 (2026-10-01 사용자 요구사항).
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

test('TO-DO is locked without a session', async () => {
  const { call } = await setup();
  assert.equal((await call('GET', '/api/assignment/todo', undefined, { auth: false })).status, 401);
  assert.equal((await call('PUT', '/api/assignment/todo/prefs', { order: [], memos: {} }, { auth: false })).status, 401);
});

// 한국 시각 → epoch ms
const kst = at => Date.parse(`${at}+09:00`);

test('TO-DO items: assignments from notes with a due; self-feedback from the weekly session days, due = day before next session 23:59', async () => {
  const { env, call } = await setup();
  assert.deepEqual((await call('GET', '/api/assignment/todo')).body.prefs, { order: [], memos: {} });

  await call('PUT', '/api/assignment/notes/bi/3', { raw: 'BI 3주차', dueAt: '2026-09-28T23:59', lateDueAt: '2026-09-29T23:59', baseVersion: null });
  await call('PUT', '/api/assignment/notes/pc/4', { raw: 'PC 4주차', dueAt: '2026-10-04T23:59', baseVersion: null });
  await call('PUT', '/api/assignment/notes/si/4', { raw: 'SI 4주차', dueAt: '2026-10-04T23:59', baseVersion: null });
  await call('PUT', '/api/assignment/notes/al/4', { raw: '마감 없음', baseVersion: null }); // 마감이 없으면 과제는 할 일에 안 나온다
  const target = await env.DB.prepare(`SELECT t.id FROM submission_targets t JOIN weeks w ON w.id = t.week_id
    WHERE t.course_id = 'bi' AND w.week_no = 3 AND t.kind = 'self_feedback'`).first();
  await env.DB.prepare(`INSERT INTO submission_evidence (target_id, gmail_message_id, received_at, subject, created_at)
    VALUES (?, 'm1', '2026-09-30T23:10:58.000Z', '[BI] 셀프피드백 제출', '2026-10-01T00:00:00Z')`).bind(target.id).run();

  // 10/1(목) 정오: 최근 14일(9/18~10/1) 세션 — 3주차(9/21~) 전부, 4주차(9/28~)는 목요일 TF·VT까지. 2주차 목(9/17)은 지남
  const { items } = await getTodo(env.DB, kst('2026-10-01T12:00:00'));
  assert.deepEqual(items.map(i => [i.key, i.dueAt, i.status]), [
    ['al:3:s', '2026-09-28T23:59', 'unconfirmed'], // 셀프피드백 마감 = 다음 주 세션(화 9/29) 전날 23:59 — 공지와 무관
    ['aor:3:s', '2026-09-29T23:59', 'unconfirmed'],
    ['bi:3:a', '2026-09-28T23:59', 'unconfirmed'],
    ['bi:3:s', '2026-09-29T23:59', 'confirmed_mail'],
    ['ips:3:s', '2026-09-28T23:59', 'unconfirmed'],
    ['tf:3:s', '2026-09-30T23:59', 'unconfirmed'],
    ['vt:3:s', '2026-09-30T23:59', 'unconfirmed'],
    ['al:4:s', '2026-10-05T23:59', 'unconfirmed'],
    ['aor:4:s', '2026-10-06T23:59', 'unconfirmed'],
    ['bi:4:s', '2026-10-06T23:59', 'unconfirmed'],
    ['ips:4:s', '2026-10-05T23:59', 'unconfirmed'],
    ['pc:4:a', '2026-10-04T23:59', 'unconfirmed'], // PC·SI는 과제만 — 셀프피드백 없음
    ['si:4:a', '2026-10-04T23:59', 'unconfirmed'],
    ['tf:4:s', '2026-10-07T23:59', 'unconfirmed'],
    ['vt:4:s', '2026-10-07T23:59', 'unconfirmed'],
  ]);
  const bi = items.find(i => i.key === 'bi:3:s');
  assert.equal(bi.code, 'BI');
  assert.equal(bi.kind, 'self_feedback');
  assert.equal(bi.sessionDate, '2026-09-23');
  assert.ok(bi.targetId);
  assert.match(bi.url, /self-feedback/);
});

test('TO-DO self-feedback appears on the session day (KST) and drops out after 14 days', async () => {
  const { env } = await setup();
  const keys = async at => (await getTodo(env.DB, kst(at))).items.map(i => i.key);
  // 수요일 밤 11시 59분(한국): 4주차 목요일 세션 TF·VT는 아직, 14일 전(9/17) 2주차 TF·VT는 아직 들어 있다
  assert.deepEqual(await keys('2026-09-30T23:59:00'), ['tf:2:s', 'vt:2:s', 'al:3:s','aor:3:s', 'bi:3:s', 'ips:3:s', 'tf:3:s', 'vt:3:s', 'al:4:s', 'aor:4:s', 'bi:4:s', 'ips:4:s']);
  // 목요일 0시 — 들어온다
  assert.ok((await keys('2026-10-01T00:00:00')).includes('tf:4:s'));
  // 10/6: 9/23(수)부터 — 3주차 화요일 AL·IPS(9/22)는 빠진다
  assert.deepEqual((await keys('2026-10-06T09:00:00')).filter(k => k.endsWith(':3:s')), ['aor:3:s', 'bi:3:s', 'tf:3:s', 'vt:3:s']);
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

test('Assignment Manage page memo: locked without a session, multi-line saved, blank clears, too long refused', async () => {
  const { call } = await setup();
  assert.equal((await call('GET', '/api/assignment/memo', undefined, { auth: false })).status, 401);
  assert.equal((await call('PUT', '/api/assignment/memo', { memo: 'x' }, { auth: false })).status, 401);
  assert.deepEqual((await call('GET', '/api/assignment/memo')).body, { memo: '' });
  assert.deepEqual((await call('PUT', '/api/assignment/memo', { memo: 'TF 레퍼런스\r\n  VT 스케치 3장' })).body, { ok: true, memo: 'TF 레퍼런스\n  VT 스케치 3장' });
  assert.deepEqual((await call('GET', '/api/assignment/memo')).body, { memo: 'TF 레퍼런스\n  VT 스케치 3장' });
  assert.deepEqual((await call('PUT', '/api/assignment/memo', { memo: '  \n ' })).body, { ok: true, memo: '' });
  assert.deepEqual((await call('GET', '/api/assignment/memo')).body, { memo: '' });
  assert.equal((await call('PUT', '/api/assignment/memo', { memo: '가'.repeat(5001) })).status, 400);
  assert.equal((await call('PUT', '/api/assignment/memo', { memo: 3 })).status, 400);
});
