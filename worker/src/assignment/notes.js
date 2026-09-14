// Pasted 과제 공지 per course × week (2026-09-14 사용자 요구사항). Behind the session.
//
//   PUT    /api/assignment/notes/:courseId/:weekNo   { raw, dueAt, lateDueAt, dueManual, baseVersion, force? }
//   DELETE /api/assignment/notes/:courseId/:weekNo?baseVersion=n
// The week matrix (service.js getWeekMatrix) carries each row's note. Same version rule as
// journals: a save/delete built on an older version → 409 with the server copy.
import { BadRequest } from '../journals.js';

const DUE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export const NOTE_MAX = 20000;

export const toNote = r => (r ? {
  raw: r.raw, dueAt: r.due_at, lateDueAt: r.late_due_at, dueManual: !!r.due_manual, version: r.version, updatedAt: r.updated_at,
} : null);

function cleanNote(body) {
  if (!body || typeof body.raw !== 'string' || !body.raw.trim()) throw new BadRequest('empty_note');
  if (body.raw.length > NOTE_MAX) throw new BadRequest('note_too_large', 413);
  const due = v => (v == null || v === '' ? null : typeof v === 'string' && DUE_RE.test(v) ? v : (() => { throw new BadRequest('bad_due'); })());
  return { raw: body.raw, dueAt: due(body.dueAt), lateDueAt: due(body.lateDueAt), dueManual: body.dueManual ? 1 : 0 };
}

async function checkTarget(db, courseId, weekNo) {
  if (!Number.isInteger(weekNo) || weekNo < 0 || weekNo > 16) throw new BadRequest('bad_week');
  const course = await db.prepare('SELECT id FROM courses WHERE id = ?').bind(courseId).first();
  if (!course) throw new BadRequest('bad_course');
}

const getRow = (db, courseId, weekNo) =>
  db.prepare('SELECT * FROM assignment_notes WHERE course_id = ? AND week_no = ?').bind(courseId, weekNo).first();

export async function saveNote(db, courseId, weekNo, body) {
  await checkTarget(db, courseId, weekNo);
  const n = cleanNote(body);
  const base = body.baseVersion ?? null;
  const now = new Date().toISOString();
  const row = await getRow(db, courseId, weekNo);
  if (row && !body.force && base !== row.version) return { ok: false, conflict: true, note: toNote(row) };
  if (!row) {
    if (base !== null && !body.force) return { ok: false, conflict: true, note: null }; // deleted on another device
    const r = await db.prepare(`
      INSERT INTO assignment_notes (course_id, week_no, raw, due_at, late_due_at, due_manual, version, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT DO NOTHING
    `).bind(courseId, weekNo, n.raw, n.dueAt, n.lateDueAt, n.dueManual, now).run();
    if (!r.meta.changes) return { ok: false, conflict: true, note: toNote(await getRow(db, courseId, weekNo)) };
    return { ok: true, note: toNote(await getRow(db, courseId, weekNo)) };
  }
  const r = await db.prepare(`
    UPDATE assignment_notes SET raw = ?, due_at = ?, late_due_at = ?, due_manual = ?, version = version + 1, updated_at = ?
    WHERE course_id = ? AND week_no = ? AND version = ?
  `).bind(n.raw, n.dueAt, n.lateDueAt, n.dueManual, now, courseId, weekNo, row.version).run();
  if (!r.meta.changes) return { ok: false, conflict: true, note: toNote(await getRow(db, courseId, weekNo)) };
  return { ok: true, note: toNote(await getRow(db, courseId, weekNo)) };
}

export async function deleteNote(db, courseId, weekNo, { baseVersion, force = false } = {}) {
  await checkTarget(db, courseId, weekNo);
  const row = await getRow(db, courseId, weekNo);
  if (!row) return { ok: true, deleted: false };
  if (!force && baseVersion !== row.version) return { ok: false, conflict: true, note: toNote(row) };
  await db.prepare('DELETE FROM assignment_notes WHERE course_id = ? AND week_no = ? AND version = ?').bind(courseId, weekNo, row.version).run();
  return { ok: true, deleted: true };
}

export async function notesApi(request, env, path, url, json) {
  const m = path.match(/^\/notes\/([a-z]{2,4})\/(\d{1,2})$/);
  if (!m) return null;
  const courseId = m[1], weekNo = Number(m[2]);
  if (request.method === 'PUT') {
    const r = await saveNote(env.DB, courseId, weekNo, (await request.json().catch(() => null)) || {});
    return json(r.ok ? 200 : 409, r);
  }
  if (request.method === 'DELETE') {
    const base = url.searchParams.get('baseVersion');
    const r = await deleteNote(env.DB, courseId, weekNo, { baseVersion: base === null ? null : Number(base), force: url.searchParams.get('force') === '1' });
    return json(r.ok ? 200 : 409, r);
  }
  return null;
}
