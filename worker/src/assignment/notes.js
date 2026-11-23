// Pasted 과제 공지 per course × week × 회차 (2026-09-14 사용자 요구사항, 회차 2026-11-23). Behind the session.
//
//   PUT    /api/assignment/notes/:courseId/:weekNo   { raw, dueAt, lateDueAt, dueManual, baseVersion, force?, round?, fromRound? }
//   DELETE /api/assignment/notes/:courseId/:weekNo?baseVersion=n&round=…
// round = 이 공지의 회차 이름("Fonts 3회차", '' = 회차 없음). 공지는 늘 그 줄의 주차에 저장한다 — 공지 본문의
// "N주차"를 보고 다른 주차로 옮기지 않는다(사용자 지시 2026-11-23: 회차 때문에 1·2주차에 저장되던 문제).
// fromRound = 고치는 줄의 원래 회차. 다르면 회차 이름 바꾸기 — 그 줄(같은 과목 · 주차 · 원래 회차)의
// 확인메일·직접 확인도 새 회차로 같이 옮긴다. 이미 그 회차 공지가 있으면 409 roundTaken.
// The week matrix (service.js getWeekMatrix) carries each row's note. Same version rule as
// journals: a save/delete built on an older version → 409 with the server copy.
import { BadRequest } from '../journals.js';
import { cleanRound } from './rounds.js';

const DUE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export const NOTE_MAX = 20000;

export const toNote = r => (r ? {
  raw: r.raw, dueAt: r.due_at, lateDueAt: r.late_due_at, dueManual: !!r.due_manual, version: r.version, updatedAt: r.updated_at,
  round: r.round ?? '',
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

const getRow = (db, courseId, weekNo, round) =>
  db.prepare('SELECT * FROM assignment_notes WHERE course_id = ? AND week_no = ? AND round = ?').bind(courseId, weekNo, round).first();

// 같은 과목 · 주차의 두 칸(과제·셀프피드백)에서 회차 from의 확인메일·직접 확인을 to로
function relabelRound(db, courseId, weekNo, from, to) {
  const targets = `SELECT t.id FROM submission_targets t JOIN weeks w ON w.id = t.week_id WHERE t.course_id = ? AND w.week_no = ?`;
  return [
    db.prepare(`UPDATE submission_evidence SET round = ? WHERE round = ? AND target_id IN (${targets})`).bind(to, from, courseId, weekNo),
    db.prepare(`UPDATE OR IGNORE manual_status SET round = ? WHERE round = ? AND target_id IN (${targets})`).bind(to, from, courseId, weekNo),
  ];
}

export async function saveNote(db, courseId, weekNo, body) {
  await checkTarget(db, courseId, weekNo);
  const n = cleanNote(body);
  const round = cleanRound(body.round);
  const from = body.fromRound === undefined ? round : cleanRound(body.fromRound);
  const base = body.baseVersion ?? null;
  const now = new Date().toISOString();
  if (from !== round) {
    const clash = await getRow(db, courseId, weekNo, round);
    if (clash) return { ok: false, conflict: true, roundTaken: true, note: toNote(clash) };
  }
  const row = await getRow(db, courseId, weekNo, from);
  if (row && !body.force && base !== row.version) return { ok: false, conflict: true, note: toNote(row) };
  const moves = from !== round ? relabelRound(db, courseId, weekNo, from, round) : [];
  if (!row) {
    if (base !== null && !body.force) return { ok: false, conflict: true, note: null }; // deleted on another device
    const [r] = await db.batch([db.prepare(`
      INSERT INTO assignment_notes (course_id, week_no, round, raw, due_at, late_due_at, due_manual, version, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT DO NOTHING
    `).bind(courseId, weekNo, round, n.raw, n.dueAt, n.lateDueAt, n.dueManual, now), ...moves]);
    if (!r.meta.changes) return { ok: false, conflict: true, note: toNote(await getRow(db, courseId, weekNo, round)) };
    return { ok: true, note: toNote(await getRow(db, courseId, weekNo, round)) };
  }
  const [r] = await db.batch([db.prepare(`
    UPDATE assignment_notes SET round = ?, raw = ?, due_at = ?, late_due_at = ?, due_manual = ?, version = version + 1, updated_at = ?
    WHERE course_id = ? AND week_no = ? AND round = ? AND version = ?
  `).bind(round, n.raw, n.dueAt, n.lateDueAt, n.dueManual, now, courseId, weekNo, from, row.version), ...moves]);
  if (!r.meta.changes) return { ok: false, conflict: true, note: toNote(await getRow(db, courseId, weekNo, from)) };
  return { ok: true, note: toNote(await getRow(db, courseId, weekNo, round)) };
}

export async function deleteNote(db, courseId, weekNo, { baseVersion, force = false, round = '' } = {}) {
  await checkTarget(db, courseId, weekNo);
  round = cleanRound(round);
  const row = await getRow(db, courseId, weekNo, round);
  if (!row) return { ok: true, deleted: false };
  if (!force && baseVersion !== row.version) return { ok: false, conflict: true, note: toNote(row) };
  await db.prepare('DELETE FROM assignment_notes WHERE course_id = ? AND week_no = ? AND round = ? AND version = ?').bind(courseId, weekNo, round, row.version).run();
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
    const r = await deleteNote(env.DB, courseId, weekNo, {
      baseVersion: base === null ? null : Number(base), force: url.searchParams.get('force') === '1', round: url.searchParams.get('round') || '',
    });
    return json(r.ok ? 200 : 409, r);
  }
  return null;
}
