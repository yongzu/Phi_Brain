// 개인 할 일 — Assignment Manage 표의 과목이 아닌 줄(사용자 지시 2026-10-02). Behind the session.
// 메일 확인 없이 직접 체크한다. 이름 + 자세히보기 내용.
//
//   GET    /api/assignment/tasks          → { tasks }
//   POST   /api/assignment/tasks          { name, weekNo, detail? } → { ok, task }
//   PUT    /api/assignment/tasks/:id      { name?, detail?, done?, doneWeek? } → { ok, task }
//   DELETE /api/assignment/tasks/:id      → { ok }
//
// 어느 주차 표에 보이나(화면이 거른다): 만든 주(weekNo)부터, 끝내지 않았으면 그 뒤 모든 주차,
// 끝냈으면 체크한 표의 주차(doneWeek)까지.
import { BadRequest } from '../journals.js';

export const TASK_NAME_MAX = 100;
export const TASK_DETAIL_MAX = 20000;
const TASKS_MAX = 500;

const toTask = r => ({
  id: r.id, name: r.name, detail: r.detail, weekNo: r.week_no, done: !!r.done, doneWeek: r.done_week,
  createdAt: r.created_at, updatedAt: r.updated_at,
});
const week = v => {
  if (!Number.isInteger(v) || v < 0 || v > 16) throw new BadRequest('bad_week');
  return v;
};
const name = v => {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
  if (!s) throw new BadRequest('empty_name');
  if ([...s].length > TASK_NAME_MAX) throw new BadRequest('name_too_long');
  return s;
};
const detail = v => {
  if (typeof v !== 'string') throw new BadRequest('bad_detail');
  const s = v.replace(/\r\n?/g, '\n');
  if (s.length > TASK_DETAIL_MAX) throw new BadRequest('detail_too_long', 413);
  return s.trim() ? s : '';
};

export async function listTasks(db) {
  const { results } = await db.prepare('SELECT * FROM personal_tasks ORDER BY created_at, rowid').all();
  return { tasks: results.map(toTask) };
}

const getRow = (db, id) => db.prepare('SELECT * FROM personal_tasks WHERE id = ?').bind(id).first();

export async function createTask(db, body) {
  if (!body) throw new BadRequest('bad_body');
  const n = name(body.name), w = week(body.weekNo), d = body.detail == null ? '' : detail(body.detail);
  const { c } = await db.prepare('SELECT count(*) c FROM personal_tasks').first();
  if (c >= TASKS_MAX) throw new BadRequest('too_many_tasks');
  const id = crypto.randomUUID(), now = new Date().toISOString();
  await db.prepare(`INSERT INTO personal_tasks (id, name, detail, week_no, done, done_week, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, NULL, ?, ?)`).bind(id, n, d, w, now, now).run();
  return { ok: true, task: toTask(await getRow(db, id)) };
}

export async function updateTask(db, id, body) {
  if (!body || typeof body !== 'object') throw new BadRequest('bad_body');
  const row = await getRow(db, id);
  if (!row) return null;
  const next = { name: row.name, detail: row.detail, done: row.done, doneWeek: row.done_week };
  if ('name' in body) next.name = name(body.name);
  if ('detail' in body) next.detail = detail(body.detail);
  if ('done' in body) {
    if (typeof body.done !== 'boolean') throw new BadRequest('bad_done');
    next.done = body.done ? 1 : 0;
    // 체크한 표의 주차 — 만든 주보다 앞일 수는 없다
    next.doneWeek = body.done ? Math.max(row.week_no, body.doneWeek == null ? row.week_no : week(body.doneWeek)) : null;
  }
  await db.prepare('UPDATE personal_tasks SET name = ?, detail = ?, done = ?, done_week = ?, updated_at = ? WHERE id = ?')
    .bind(next.name, next.detail, next.done, next.doneWeek, new Date().toISOString(), id).run();
  return { ok: true, task: toTask(await getRow(db, id)) };
}

export async function deleteTask(db, id) {
  await db.prepare('DELETE FROM personal_tasks WHERE id = ?').bind(id).run();
  return { ok: true };
}

// path = '/api/assignment' 뒤 — '/tasks' 또는 '/tasks/:id'. 해당 없으면 null
export async function tasksApi(request, db, path, json) {
  const method = request.method;
  if (path === '/tasks') {
    if (method === 'GET') return json(200, await listTasks(db));
    if (method === 'POST') return json(200, await createTask(db, await request.json().catch(() => null)));
    return null;
  }
  const m = path.match(/^\/tasks\/([0-9a-f-]{36})$/);
  if (!m) return null;
  if (method === 'PUT') {
    const r = await updateTask(db, m[1], await request.json().catch(() => null));
    return r ? json(200, r) : json(404, { error: 'task_not_found' });
  }
  if (method === 'DELETE') return json(200, await deleteTask(db, m[1]));
  return null;
}
