// Ties db.js + matching.js together: email ingestion, status resolution,
// and the read/write operations the HTTP API exposes.
'use strict';
const { matchEmail } = require('./matching');
const { SEMESTER_START, SEMESTER_END } = require('./db');

function nowIso() { return new Date().toISOString(); }

function getCourses(db) {
  return db.prepare('SELECT * FROM courses ORDER BY code').all();
}

function getWeeks(db) {
  return db.prepare('SELECT * FROM weeks ORDER BY week_no').all();
}

// "current" = the week whose date range contains today, clamped to the
// configured range so a run before/after the cohort still shows something.
function getCurrentWeekNo(db, today = new Date().toISOString().slice(0, 10)) {
  const row = db.prepare('SELECT week_no FROM weeks WHERE start_date <= ? AND end_date >= ?').get(today, today);
  if (row) return row.week_no;
  const first = db.prepare('SELECT week_no FROM weeks ORDER BY week_no ASC LIMIT 1').get();
  const last = db.prepare('SELECT week_no FROM weeks ORDER BY week_no DESC LIMIT 1').get();
  return today < (first?.start_date ?? '') ? first.week_no : last.week_no;
}

function targetIdFor(db, courseId, weekNo, kind) {
  const row = db.prepare(`
    SELECT t.id FROM submission_targets t JOIN weeks w ON w.id = t.week_id
    WHERE t.course_id = ? AND w.week_no = ? AND t.kind = ?
  `).get(courseId, weekNo, kind);
  return row ? row.id : null;
}

// One target's resolved status. 'conflict' means a manual "해당 없음" and a
// matched confirmation mail disagree — surfaced for the user to resolve,
// never silently decided either way (spec §3).
function resolveStatus(targetId, db) {
  const manual = db.prepare('SELECT status FROM manual_status WHERE target_id = ?').get(targetId);
  const evidenceCount = db.prepare('SELECT count(*) c FROM submission_evidence WHERE target_id = ?').get(targetId).c;
  if (manual?.status === 'not_applicable') return evidenceCount > 0 ? 'conflict' : 'not_applicable';
  if (evidenceCount > 0) return 'confirmed_mail';
  if (manual?.status === 'confirmed_manual') return 'confirmed_manual';
  return 'unconfirmed';
}

function getWeekMatrix(db, weekNo) {
  const week = db.prepare('SELECT * FROM weeks WHERE week_no = ?').get(weekNo);
  if (!week) return null;
  const courses = getCourses(db);
  const rows = courses.map(course => {
    const assignmentId = targetIdFor(db, course.id, weekNo, 'assignment');
    const selfFeedbackId = targetIdFor(db, course.id, weekNo, 'self_feedback');
    return {
      courseId: course.id,
      name: course.name,
      code: course.code,
      boardUrl: course.board_url,
      assignment: { targetId: assignmentId, status: resolveStatus(assignmentId, db), url: course.assignment_url },
      selfFeedback: { targetId: selfFeedbackId, status: resolveStatus(selfFeedbackId, db), url: course.self_feedback_url },
    };
  });
  const counted = s => s === 'confirmed_mail' || s === 'confirmed_manual';
  const applicable = s => s !== 'not_applicable';
  const all = rows.flatMap(r => [r.assignment.status, r.selfFeedback.status]);
  const denom = all.filter(applicable).length;
  const done = all.filter(counted).length;
  return { week, rows, progress: { done, total: denom } };
}

function getTargetDetail(db, targetId) {
  const target = db.prepare(`
    SELECT t.*, c.name course_name, c.code course_code, w.week_no
    FROM submission_targets t
    JOIN courses c ON c.id = t.course_id
    JOIN weeks w ON w.id = t.week_id
    WHERE t.id = ?
  `).get(targetId);
  if (!target) return null;
  const evidence = db.prepare('SELECT * FROM submission_evidence WHERE target_id = ? ORDER BY received_at ASC').all(targetId)
    .map(e => ({ ...e, links: JSON.parse(e.links_json) }));
  const manual = db.prepare('SELECT * FROM manual_status WHERE target_id = ?').get(targetId) || null;
  return {
    targetId,
    courseId: target.course_id,
    courseName: target.course_name,
    courseCode: target.course_code,
    weekNo: target.week_no,
    kind: target.kind,
    status: resolveStatus(targetId, db),
    evidence,
    manual,
  };
}

// action: 'confirmed_manual' | 'not_applicable' | 'clear'. Setting
// 'not_applicable' over existing mail evidence is a conflict unless
// force=true — asking before deciding, per spec §3.
function setManualStatus(db, targetId, action, { force = false } = {}) {
  const evidenceCount = db.prepare('SELECT count(*) c FROM submission_evidence WHERE target_id = ?').get(targetId).c;
  if (action === 'clear') {
    db.prepare('DELETE FROM manual_status WHERE target_id = ?').run(targetId);
    return { ok: true, status: resolveStatus(targetId, db) };
  }
  if (action === 'not_applicable' && evidenceCount > 0 && !force) {
    return { ok: false, conflict: true, evidenceCount };
  }
  db.prepare(`
    INSERT INTO manual_status (target_id, status, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(target_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
  `).run(targetId, action, nowIso());
  return { ok: true, status: resolveStatus(targetId, db) };
}

// Apply one fetched Gmail message. Returns what happened, for logging/tests —
// never throws on a message that just doesn't match anything.
function ingestEmail(db, email) {
  const courses = getCourses(db);
  const result = matchEmail(email, { courses, semesterStart: SEMESTER_START, semesterEnd: SEMESTER_END });

  if (result.status === 'unrelated') return { outcome: 'unrelated' };

  if (result.status === 'ambiguous') {
    const already = db.prepare('SELECT id FROM review_queue WHERE gmail_message_id = ?').get(email.messageId);
    if (already) return { outcome: 'duplicate' };
    db.prepare(`
      INSERT INTO review_queue (gmail_message_id, gmail_thread_id, received_at, subject, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email.messageId, email.threadId || null, email.receivedAt, email.subject, result.reason, nowIso());
    return { outcome: 'review', reason: result.reason };
  }

  // status === 'matched'
  const already = db.prepare('SELECT id FROM submission_evidence WHERE gmail_message_id = ?').get(email.messageId);
  if (already) return { outcome: 'duplicate' };

  const targetId = targetIdFor(db, result.courseId, result.weekNo, result.kind);
  if (!targetId) return { outcome: 'review', reason: 'week_out_of_range' };

  db.prepare(`
    INSERT INTO submission_evidence
      (target_id, gmail_message_id, gmail_thread_id, track, received_at, subject, links_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(targetId, email.messageId, email.threadId || null, result.track, email.receivedAt, email.subject,
    JSON.stringify(result.links), nowIso());

  // A manual "해당 없음" that a real confirmation mail just contradicted —
  // leave the manual row as-is (never silently cleared) so resolveStatus
  // reports 'conflict' and the user has to look at it.
  return { outcome: 'matched', targetId, courseId: result.courseId, weekNo: result.weekNo, kind: result.kind };
}

module.exports = {
  getCourses, getWeeks, getCurrentWeekNo, getWeekMatrix, getTargetDetail,
  setManualStatus, ingestEmail, resolveStatus, targetIdFor,
};
