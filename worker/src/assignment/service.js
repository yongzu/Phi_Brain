// Assignment Manage reads/writes on D1 — port of server/service.js. Every D1
// call is a round trip, so the week matrix is one query instead of two per cell.
import { matchEmail } from './matching.js';
import { RECEIPTS_FROM, RECEIPTS_UNTIL } from './constants.js';
import { toNote } from './notes.js';

const nowIso = () => new Date().toISOString();

export const getCourses = db => db.prepare('SELECT * FROM courses ORDER BY code').all().then(r => r.results);
export const getWeeks = db => db.prepare('SELECT * FROM weeks ORDER BY week_no').all().then(r => r.results);

// the week containing today's Korean date, clamped to the range — only picks the default week
export const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
export function currentWeekNo(weeks, today = todayKst()) {
  if (!weeks.length) return null;
  const hit = weeks.find(w => w.start_date <= today && w.end_date >= today);
  if (hit) return hit.week_no;
  return today < weeks[0].start_date ? weeks[0].week_no : weeks[weeks.length - 1].week_no;
}

export async function targetIdFor(db, courseId, weekNo, kind) {
  const row = await db.prepare(`
    SELECT t.id FROM submission_targets t JOIN weeks w ON w.id = t.week_id
    WHERE t.course_id = ? AND w.week_no = ? AND t.kind = ?
  `).bind(courseId, weekNo, kind).first();
  return row ? row.id : null;
}

// 'conflict' = a manual "해당 없음" and a matched receipt disagree — shown, never silently decided
export function resolveStatus(manualStatus, evidenceCount) {
  if (manualStatus === 'not_applicable') return evidenceCount > 0 ? 'conflict' : 'not_applicable';
  if (evidenceCount > 0) return 'confirmed_mail';
  if (manualStatus === 'confirmed_manual') return 'confirmed_manual';
  return 'unconfirmed';
}

export async function getWeekMatrix(db, weekNo) {
  const week = await db.prepare('SELECT * FROM weeks WHERE week_no = ?').bind(weekNo).first();
  if (!week) return null;
  const [{ results }, notes] = await db.batch([db.prepare(`
    SELECT c.id course_id, c.name, c.code, c.board_url, c.assignment_url, c.self_feedback_url,
      t.id target_id, t.kind, m.status manual_status,
      (SELECT count(*) FROM submission_evidence e WHERE e.target_id = t.id) evidence_count,
      -- 첫 확인메일 수신 시각: 화면이 마감과 견줘 "지각 제출"을 가려낸다(사용자 지시 2026-09-16)
      (SELECT min(e.received_at) FROM submission_evidence e WHERE e.target_id = t.id) first_received_at
    FROM submission_targets t
    JOIN courses c ON c.id = t.course_id
    LEFT JOIN manual_status m ON m.target_id = t.id
    WHERE t.week_id = ?
    ORDER BY c.code
  `).bind(week.id), db.prepare('SELECT * FROM assignment_notes WHERE week_no = ?').bind(weekNo)]);
  const noteOf = new Map(notes.results.map(n => [n.course_id, toNote(n)]));

  const byCourse = new Map();
  for (const r of results) {
    if (!byCourse.has(r.course_id)) {
      byCourse.set(r.course_id, {
        courseId: r.course_id, name: r.name, code: r.code, boardUrl: r.board_url, note: noteOf.get(r.course_id) || null,
        assignment: { targetId: null, status: 'unconfirmed', url: r.assignment_url, confirmedAt: null },
        selfFeedback: { targetId: null, status: 'unconfirmed', url: r.self_feedback_url, confirmedAt: null },
      });
    }
    const cell = byCourse.get(r.course_id)[r.kind === 'assignment' ? 'assignment' : 'selfFeedback'];
    cell.targetId = r.target_id;
    cell.status = resolveStatus(r.manual_status, r.evidence_count);
    cell.confirmedAt = r.first_received_at || null;
  }
  const rows = [...byCourse.values()];
  const all = rows.flatMap(r => [r.assignment.status, r.selfFeedback.status]);
  const done = all.filter(s => s === 'confirmed_mail' || s === 'confirmed_manual').length;
  const total = all.filter(s => s !== 'not_applicable').length;
  return { week, rows, progress: { done, total } };
}

export async function getTargetDetail(db, targetId) {
  const [targetRes, evidenceRes, manualRes] = await db.batch([
    db.prepare(`
      SELECT t.*, c.name course_name, c.code course_code, w.week_no
      FROM submission_targets t JOIN courses c ON c.id = t.course_id JOIN weeks w ON w.id = t.week_id
      WHERE t.id = ?`).bind(targetId),
    db.prepare('SELECT * FROM submission_evidence WHERE target_id = ? ORDER BY received_at ASC').bind(targetId),
    db.prepare('SELECT * FROM manual_status WHERE target_id = ?').bind(targetId),
  ]);
  const target = targetRes.results[0];
  if (!target) return null;
  const evidence = evidenceRes.results.map(e => ({ ...e, links: JSON.parse(e.links_json) }));
  const manual = manualRes.results[0] || null;
  return {
    targetId, courseId: target.course_id, courseName: target.course_name, courseCode: target.course_code,
    weekNo: target.week_no, kind: target.kind,
    status: resolveStatus(manual?.status, evidence.length),
    evidence, manual,
  };
}

const evidenceCount = async (db, targetId) =>
  (await db.prepare('SELECT count(*) c FROM submission_evidence WHERE target_id = ?').bind(targetId).first()).c;

// action: 'confirmed_manual' | 'not_applicable' | 'clear'. "해당 없음" over mail evidence
// is a conflict unless force — ask before deciding (spec §3).
export async function setManualStatus(db, targetId, action, { force = false } = {}) {
  if (!['confirmed_manual', 'not_applicable', 'clear'].includes(action)) return { ok: false, error: 'bad_action' };
  const exists = await db.prepare('SELECT id FROM submission_targets WHERE id = ?').bind(targetId).first();
  if (!exists) return { ok: false, error: 'target_not_found' };
  const count = await evidenceCount(db, targetId);
  if (action === 'clear') {
    await db.prepare('DELETE FROM manual_status WHERE target_id = ?').bind(targetId).run();
    return { ok: true, status: resolveStatus(null, count) };
  }
  if (action === 'not_applicable' && count > 0 && !force) return { ok: false, conflict: true, evidenceCount: count };
  await db.prepare(`
    INSERT INTO manual_status (target_id, status, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(target_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
  `).bind(targetId, action, nowIso()).run();
  return { ok: true, status: resolveStatus(action, count) };
}

// Apply one fetched message. Never throws on a message that just doesn't match.
export async function ingestEmail(db, email, courses) {
  courses = courses || await getCourses(db);
  const result = matchEmail(email, { courses, windowStart: RECEIPTS_FROM, windowEnd: RECEIPTS_UNTIL });
  if (result.status === 'unrelated') return { outcome: 'unrelated' };

  if (result.status === 'ambiguous') {
    const r = await db.prepare(`
      INSERT INTO review_queue (gmail_message_id, gmail_thread_id, received_at, subject, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(gmail_message_id) DO NOTHING
    `).bind(email.messageId, email.threadId || null, email.receivedAt, email.subject, result.reason, nowIso()).run();
    return r.meta.changes ? { outcome: 'review', reason: result.reason } : { outcome: 'duplicate' };
  }

  const targetId = await targetIdFor(db, result.courseId, result.weekNo, result.kind);
  if (!targetId) return { outcome: 'review', reason: 'week_out_of_range' };

  const [, inserted] = await db.batch([
    // a message an older rule set parked in review is resolved now
    db.prepare('DELETE FROM review_queue WHERE gmail_message_id = ?').bind(email.messageId),
    db.prepare(`
      INSERT INTO submission_evidence
        (target_id, gmail_message_id, gmail_thread_id, track, received_at, subject, links_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(gmail_message_id) DO NOTHING
    `).bind(targetId, email.messageId, email.threadId || null, result.track, email.receivedAt, email.subject,
      JSON.stringify(result.links), nowIso()),
  ]);
  if (!inserted.meta.changes) return { outcome: 'duplicate' };
  // a contradicted manual "해당 없음" stays as-is → resolveStatus reports 'conflict'
  return { outcome: 'matched', targetId, courseId: result.courseId, weekNo: result.weekNo, kind: result.kind };
}
