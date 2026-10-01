// 개인 할 일 — Assignment Manage 표의 과목이 아닌 줄 (2026-10-02 사용자 지시).
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

test('personal tasks are locked without a session', async () => {
  const call = await client();
  assert.equal((await call('GET', '/api/assignment/tasks', undefined, { auth: false })).status, 401);
  assert.equal((await call('POST', '/api/assignment/tasks', { name: 'x', weekNo: 4 }, { auth: false })).status, 401);
});

test('personal tasks: add, rename, write detail, check with the table week, uncheck, delete', async () => {
  const call = await client();
  assert.deepEqual((await call('GET', '/api/assignment/tasks')).body, { tasks: [] });

  const made = await call('POST', '/api/assignment/tasks', { name: '  포트폴리오\n정리 ', weekNo: 4 });
  assert.equal(made.status, 200);
  const t = made.body.task;
  assert.match(t.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual([t.name, t.detail, t.weekNo, t.done, t.doneWeek], ['포트폴리오 정리', '', 4, false, null]);

  let r = await call('PUT', `/api/assignment/tasks/${t.id}`, { name: '포트폴리오', detail: '1. 표지\r\n2. 목차' });
  assert.deepEqual([r.body.task.name, r.body.task.detail], ['포트폴리오', '1. 표지\n2. 목차']);

  r = await call('PUT', `/api/assignment/tasks/${t.id}`, { done: true, doneWeek: 5 });
  assert.deepEqual([r.body.task.done, r.body.task.doneWeek], [true, 5]);
  r = await call('PUT', `/api/assignment/tasks/${t.id}`, { done: true, doneWeek: 2 }); // 만든 주보다 앞 → 만든 주
  assert.equal(r.body.task.doneWeek, 4);
  r = await call('PUT', `/api/assignment/tasks/${t.id}`, { done: false });
  assert.deepEqual([r.body.task.done, r.body.task.doneWeek], [false, null]);

  await call('POST', '/api/assignment/tasks', { name: '두 번째', weekNo: 5, detail: '메모' });
  assert.deepEqual((await call('GET', '/api/assignment/tasks')).body.tasks.map(x => x.name), ['포트폴리오', '두 번째']);

  assert.deepEqual((await call('DELETE', `/api/assignment/tasks/${t.id}`)).body, { ok: true });
  assert.deepEqual((await call('GET', '/api/assignment/tasks')).body.tasks.map(x => x.name), ['두 번째']);
  assert.equal((await call('PUT', `/api/assignment/tasks/${t.id}`, { done: true })).status, 404);
});

test('personal tasks: optional due date, cleared with null; unfinished ones show in the TO-DO with prefs keys', async () => {
  const call = await client();
  const a = (await call('POST', '/api/assignment/tasks', { name: '서류 제출', weekNo: 4, dueAt: '2026-10-05T18:00' })).body.task;
  const b = (await call('POST', '/api/assignment/tasks', { name: '마감 없는 일', weekNo: 4 })).body.task;
  assert.equal(a.dueAt, '2026-10-05T18:00');
  assert.equal(b.dueAt, null);
  assert.equal((await call('POST', '/api/assignment/tasks', { name: 'x', weekNo: 4, dueAt: '10/5' })).status, 400);

  let todo = (await call('GET', '/api/assignment/todo')).body;
  const mine = todo.items.filter(i => i.kind === 'personal');
  assert.deepEqual(mine.map(i => [i.key, i.title, i.dueAt, i.status]), [
    [`t:${a.id}`, '서류 제출', '2026-10-05T18:00', 'unconfirmed'],
    [`t:${b.id}`, '마감 없는 일', null, 'unconfirmed'],
  ]);

  await call('PUT', `/api/assignment/tasks/${a.id}`, { dueAt: null });
  await call('PUT', `/api/assignment/tasks/${b.id}`, { done: true, doneWeek: 4 }); // 끝낸 일은 TO-DO에서 빠진다
  todo = (await call('GET', '/api/assignment/todo')).body;
  assert.deepEqual(todo.items.filter(i => i.kind === 'personal').map(i => [i.taskId, i.dueAt]), [[a.id, null]]);

  // TO-DO의 순서·메모도 개인 할 일 키를 받는다
  const saved = await call('PUT', '/api/assignment/todo/prefs', { order: [`t:${a.id}`], memos: { [`t:${a.id}`]: '오전에' } });
  assert.equal(saved.status, 200);
  assert.equal((await call('PUT', '/api/assignment/todo/prefs', { order: ['t:nope'], memos: {} })).status, 400);
});

test('personal tasks: bad input refused', async () => {
  const call = await client();
  assert.equal((await call('POST', '/api/assignment/tasks', { name: '  ', weekNo: 4 })).status, 400);
  assert.equal((await call('POST', '/api/assignment/tasks', { name: 'x', weekNo: 17 })).status, 400);
  assert.equal((await call('POST', '/api/assignment/tasks', { name: '가'.repeat(101), weekNo: 4 })).status, 400);
  assert.equal((await call('POST', '/api/assignment/tasks', null)).status, 400);
  const { task } = (await call('POST', '/api/assignment/tasks', { name: 'x', weekNo: 4 })).body;
  assert.equal((await call('PUT', `/api/assignment/tasks/${task.id}`, { done: 'yes' })).status, 400);
  assert.equal((await call('PUT', `/api/assignment/tasks/${task.id}`, { detail: 3 })).status, 400);
  assert.equal((await call('PUT', `/api/assignment/tasks/${task.id}`, { name: '' })).status, 400);
});
