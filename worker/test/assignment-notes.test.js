// Assignment notices (pasted 과제 공지) on the Worker.
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
const note = (over = {}) => ({ raw: '1주차 과제 안내드립니다. ■ 마감 마감 기한: 9/15(화) 23:59', dueAt: '2026-09-15T23:59', lateDueAt: '2026-09-16T23:59', dueManual: false, ...over });

test('notices are locked without a session', async () => {
  const call = await client();
  assert.equal((await call('PUT', '/api/assignment/notes/vt/1', note(), { auth: false })).status, 401);
  assert.equal((await call('DELETE', '/api/assignment/notes/vt/1', undefined, { auth: false })).status, 401);
});

test('save → shows in that week\'s matrix row only → edit on the seen version → delete', async () => {
  const call = await client();
  const saved = await call('PUT', '/api/assignment/notes/vt/1', { ...note(), baseVersion: null });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.note.version, 1);

  const week1 = (await call('GET', '/api/assignment/weeks/1/matrix')).body;
  const vt = week1.rows.find(r => r.courseId === 'vt');
  assert.deepEqual([vt.note.dueAt, vt.note.lateDueAt, vt.note.dueManual], ['2026-09-15T23:59', '2026-09-16T23:59', false]);
  assert.equal(week1.rows.find(r => r.courseId === 'bi').note, null);
  assert.equal((await call('GET', '/api/assignment/weeks/2/matrix')).body.rows.find(r => r.courseId === 'vt').note, null);
  assert.deepEqual(week1.progress, { done: 0, total: 24 }); // submission status untouched

  const edited = await call('PUT', '/api/assignment/notes/vt/1', { ...note({ dueAt: '2026-09-17T18:00', dueManual: true }), baseVersion: 1 });
  assert.deepEqual([edited.body.note.version, edited.body.note.dueAt, edited.body.note.dueManual], [2, '2026-09-17T18:00', true]);

  assert.equal((await call('DELETE', '/api/assignment/notes/vt/1?baseVersion=2')).status, 200);
  assert.equal((await call('GET', '/api/assignment/weeks/1/matrix')).body.rows.find(r => r.courseId === 'vt').note, null);
  // undo = save again as new
  assert.equal((await call('PUT', '/api/assignment/notes/vt/1', { ...note(), baseVersion: null })).body.note.version, 1);
});

test('a save or delete built on an older version is a conflict with the server copy; force overwrites', async () => {
  const call = await client();
  await call('PUT', '/api/assignment/notes/si/1', { ...note(), baseVersion: null });
  await call('PUT', '/api/assignment/notes/si/1', { ...note({ raw: '노트북에서 고친 공지' }), baseVersion: 1 });
  const stale = await call('PUT', '/api/assignment/notes/si/1', { ...note({ raw: '데스크톱 공지' }), baseVersion: 1 });
  assert.deepEqual([stale.status, stale.body.note.raw, stale.body.note.version], [409, '노트북에서 고친 공지', 2]);
  assert.equal((await call('DELETE', '/api/assignment/notes/si/1?baseVersion=1')).status, 409);
  assert.equal((await call('PUT', '/api/assignment/notes/si/1', { ...note({ raw: '데스크톱 공지' }), baseVersion: 1, force: true })).body.note.version, 3);
});

test('bad input is refused', async () => {
  const call = await client();
  assert.equal((await call('PUT', '/api/assignment/notes/xx/1', { ...note(), baseVersion: null })).status, 400); // no such course
  assert.equal((await call('PUT', '/api/assignment/notes/vt/17', { ...note(), baseVersion: null })).status, 400);
  assert.equal((await call('PUT', '/api/assignment/notes/vt/1', { ...note({ raw: '   ' }), baseVersion: null })).status, 400);
  assert.equal((await call('PUT', '/api/assignment/notes/vt/1', { ...note({ dueAt: '9/15 23:59' }), baseVersion: null })).status, 400);
  assert.equal((await call('PUT', '/api/assignment/notes/vt/1', { ...note({ raw: 'x'.repeat(20001) }), baseVersion: null })).status, 413);
  assert.deepEqual((await call('PUT', '/api/assignment/notes/vt/1', { ...note({ dueAt: '', lateDueAt: null }), baseVersion: null })).body.note.dueAt, null);
});
