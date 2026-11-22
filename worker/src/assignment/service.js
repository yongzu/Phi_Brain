// Assignment Manage reads/writes on D1 — port of server/service.js. Every D1
// call is a round trip, so the week matrix is one query instead of two per cell.
import { matchEmail } from './matching.js';
import { RECEIPTS_FROM, RECEIPTS_UNTIL } from './constants.js';
import { toNote } from './notes.js';
import { getCourseStates } from './course-state.js';

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
  // 수강기간 아님·완강 과목(course-state.js)은 줄에 표시만 하고 완료 수에서 뺀다
  const states = await getCourseStates(db);
  const rows = [...byCourse.values()].map(r => ({ ...r, courseState: states[r.courseId] || null }));
  const all = rows.filter(r => !r.courseState).flatMap(r => [r.assignment.status, r.selfFeedback.status]);
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

// ── 공지 마감으로 주차 정하기 (사용자 지시 2026-11-23) ─────────────────────────────
// 트랙이 바뀐 뒤 과목마다 폼의 "N주차·N회차"가 자기 회차라(예: 11월에 시작한 IAE의 "1주차"),
// 숫자를 학기 주차로 쓰면 엉뚱한 칸에 들어간다. 사용자가 그 주 칸에 붙여넣은 과제 공지가 곧
// 그 주의 과제이므로:
//   1) 폼 숫자가 받은 날짜와 맞으면(그 학기 주차 시작 − 14일 ~ 끝 + 10일) 예전처럼 그 숫자.
//   2) 안 맞거나 못 읽었으면(과제만) 받은 시각을 같은 과목 공지들의 마감과 견준다.
//      - 다음 마감(받은 때 ≤ 마감, NEXT_DUE_LIMIT 안) = 제때 낸 그 주 과제
//      - 지난 마감(마감 < 받은 때 ≤ 지각 마감, 없으면 마감 + LATE_GRACE) = 지각 제출
//      - 둘 다면: 폼 숫자가 둘 중 하나면 그것, 아니면 아직 제출 없는 지난 주, 있으면 다음 주.
//      - 자기 마감과 동떨어진 주 칸에 붙은 공지(예: 9월 2주차 칸의 11월 마감)는 쓰지 않는다.
//   3) 그래도 없으면 예전처럼 검토 대기열.
// 셀프피드백은 과제 마감과 따로 움직여 2)를 쓰지 않는다.
const HOUR = 3600 * 1000, DAY = 24 * HOUR;
export const LATE_GRACE_MS = 48 * HOUR;
export const NEXT_DUE_LIMIT_MS = 7 * DAY; // 매주 과제 — 마감 일주일 전보다 이른 제출은 그 공지의 것이 아니다
const EARLY_MS = 14 * DAY, AFTER_MS = 10 * DAY;
// 공지 마감은 KST 벽시계 "YYYY-MM-DDTHH:MM" — 비교용 ms로
const wallMs = wall => Date.parse(`${wall}:00+09:00`);
const dayStartMs = date => Date.parse(`${date}T00:00:00+09:00`);

// weeks: [{ week_no, start_date, end_date }]
export function weekFitsDate(weeks, weekNo, atMs) {
  const w = weeks.find(x => x.week_no === weekNo);
  if (!w) return false;
  return atMs >= dayStartMs(w.start_date) - EARLY_MS && atMs < dayStartMs(w.end_date) + DAY + AFTER_MS;
}

export function weekByDeadline(notes, receivedAt, { formWeek = null, submittedWeeks = new Set(), weeks = null } = {}) {
  const t = Date.parse(receivedAt);
  const dated = notes.filter(n => n.due_at).map(n => ({ week: n.week_no, due: wallMs(n.due_at), late: n.late_due_at ? wallMs(n.late_due_at) : null }))
    .filter(n => !weeks || weekFitsDate(weeks, n.week, n.due))
    .sort((a, b) => a.due - b.due || a.week - b.week);
  const next = dated.find(n => n.due >= t && n.due - t <= NEXT_DUE_LIMIT_MS) || null;
  const prev = [...dated].reverse().find(n => n.due < t && t <= (n.late ?? n.due + LATE_GRACE_MS)) || null;
  if (!next && !prev) return null;
  if (!next || !prev) return (next || prev).week;
  if (formWeek === next.week || formWeek === prev.week) return formWeek;
  return submittedWeeks.has(prev.week) ? next.week : prev.week;
}

async function deadlineWeek(db, courseId, kind, receivedAt, formWeek, exceptMessageId = null) {
  const weeks = await getWeeks(db);
  if (formWeek !== null && weekFitsDate(weeks, formWeek, Date.parse(receivedAt))) return formWeek;
  if (kind !== 'assignment') return null;
  const [notes, taken] = await db.batch([
    db.prepare('SELECT week_no, due_at, late_due_at FROM assignment_notes WHERE course_id = ? AND due_at IS NOT NULL').bind(courseId),
    db.prepare(`SELECT DISTINCT w.week_no FROM submission_evidence e JOIN submission_targets t ON t.id = e.target_id
      JOIN weeks w ON w.id = t.week_id WHERE t.course_id = ? AND t.kind = ? AND e.gmail_message_id != ?`).bind(courseId, kind, exceptMessageId || ''),
  ]);
  return weekByDeadline(notes.results, receivedAt, { formWeek, weeks, submittedWeeks: new Set(taken.results.map(r => r.week_no)) });
}

// Apply one fetched message. Never throws on a message that just doesn't match.
export async function ingestEmail(db, email, courses) {
  courses = courses || await getCourses(db);
  let result = matchEmail(email, { courses, windowStart: RECEIPTS_FROM, windowEnd: RECEIPTS_UNTIL });
  if (result.status === 'unrelated') return { outcome: 'unrelated' };

  if (result.courseId) {
    const formWeek = result.status === 'matched' ? result.weekNo : null;
    const byDue = await deadlineWeek(db, result.courseId, result.kind, email.receivedAt, formWeek, email.messageId);
    if (byDue !== null) result = { status: 'matched', courseId: result.courseId, kind: result.kind, weekNo: byDue, track: null, links: result.links };
    // 폼 숫자가 날짜와 동떨어졌고 공지로도 못 정하면 엉뚱한 칸 대신 검토 대기열
    else if (result.status === 'matched') result = { status: 'ambiguous', reason: 'week_not_in_date' };
  }

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
