// Assignment Manage reads/writes on D1 — port of server/service.js. Every D1
// call is a round trip, so the week matrix is one batch instead of queries per cell.
//
// 회차(사용자 지시 2026-11-23): 주차(학기 0~16)는 그대로 두고 과제는 과목의 "회차"로 부른다.
// 한 주에 같은 과목 회차가 여럿일 수 있어 표의 줄 = 과목 × 회차. 칸(submission_targets: 과목 × 주차 × 종류)은
// 그대로이고, 공지·확인메일·직접 확인에 회차(round, '' = 회차 없음)가 붙는다.
import { matchEmail, normalize } from './matching.js';
import { RECEIPTS_FROM, RECEIPTS_UNTIL } from './constants.js';
import { toNote } from './notes.js';
import { getCourseStates } from './course-state.js';
import { getRounds, roundKey, roundPosition, cleanRound } from './rounds.js';
import { BadRequest } from '../journals.js';

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

// 한 주의 회차 순서: 회차 없음('') 먼저, 그다음 과목 회차 목록 순서, 목록에 없는 회차는 이름순
function sortRounds(rounds, list = []) {
  const pos = r => (r === '' ? -1 : (i => (i < 0 ? 1e6 : i))(list.findIndex(l => roundKey(l) === roundKey(r) || l === r)));
  return [...rounds].sort((a, b) => pos(a) - pos(b) || a.localeCompare(b));
}

export async function getWeekMatrix(db, weekNo) {
  const week = await db.prepare('SELECT * FROM weeks WHERE week_no = ?').bind(weekNo).first();
  if (!week) return null;
  const [targets, notes, evidence, manual] = await db.batch([
    db.prepare(`
      SELECT c.id course_id, c.name, c.code, c.board_url, c.assignment_url, c.self_feedback_url, t.id target_id, t.kind
      FROM submission_targets t JOIN courses c ON c.id = t.course_id
      WHERE t.week_id = ? ORDER BY c.code`).bind(week.id),
    db.prepare('SELECT * FROM assignment_notes WHERE week_no = ?').bind(weekNo),
    // 첫 확인메일 수신 시각: 화면이 마감과 견줘 "지각 제출"을 가려낸다(사용자 지시 2026-09-16)
    db.prepare(`SELECT e.target_id, e.round, count(*) n, min(e.received_at) first_at FROM submission_evidence e
      JOIN submission_targets t ON t.id = e.target_id WHERE t.week_id = ? GROUP BY e.target_id, e.round`).bind(week.id),
    db.prepare(`SELECT m.target_id, m.round, m.status FROM manual_status m
      JOIN submission_targets t ON t.id = m.target_id WHERE t.week_id = ?`).bind(week.id),
  ]);
  const roundLists = await getRounds(db);
  const states = await getCourseStates(db);

  const courses = new Map(); // course_id → { info, targets: { assignment, self_feedback }, rounds: Set }
  for (const r of targets.results) {
    if (!courses.has(r.course_id)) courses.set(r.course_id, { info: r, targets: {}, rounds: new Set() });
    courses.get(r.course_id).targets[r.kind] = r.target_id;
  }
  const courseOfTarget = new Map(targets.results.map(r => [r.target_id, r.course_id]));
  const ev = new Map(evidence.results.map(e => [`${e.target_id}|${e.round}`, e]));
  const man = new Map(manual.results.map(m => [`${m.target_id}|${m.round}`, m.status]));
  const noteOf = new Map(notes.results.map(n => [`${n.course_id}|${n.round}`, n]));
  for (const n of notes.results) courses.get(n.course_id)?.rounds.add(n.round);
  for (const e of evidence.results) courses.get(courseOfTarget.get(e.target_id))?.rounds.add(e.round);
  for (const m of manual.results) courses.get(courseOfTarget.get(m.target_id))?.rounds.add(m.round);

  const cell = (targetId, round, url) => {
    const e = ev.get(`${targetId}|${round}`);
    return { targetId, round, status: resolveStatus(man.get(`${targetId}|${round}`), e ? e.n : 0), url, confirmedAt: e?.first_at || null };
  };
  const rows = [];
  for (const [courseId, c] of courses) {
    const list = roundLists[courseId] || [];
    const rounds = c.rounds.size ? sortRounds(c.rounds, list) : [''];
    for (const round of rounds) {
      const note = noteOf.get(`${courseId}|${round}`);
      rows.push({
        courseId, name: c.info.name, code: c.info.code, boardUrl: c.info.board_url, round,
        roundPos: roundPosition(list, round), note: note ? toNote(note) : null, courseState: states[courseId] || null,
        assignment: cell(c.targets.assignment, round, c.info.assignment_url),
        selfFeedback: cell(c.targets.self_feedback, round, c.info.self_feedback_url),
      });
    }
  }
  // 수강기간 아님·완강 과목(course-state.js)은 줄에 표시만 하고 완료 수에서 뺀다
  const all = rows.filter(r => !r.courseState).flatMap(r => [r.assignment.status, r.selfFeedback.status]);
  const done = all.filter(s => s === 'confirmed_mail' || s === 'confirmed_manual').length;
  const total = all.filter(s => s !== 'not_applicable').length;
  return { week, rows, rounds: roundLists, progress: { done, total } };
}

export async function getTargetDetail(db, targetId, round = '') {
  const [targetRes, evidenceRes, manualRes] = await db.batch([
    db.prepare(`
      SELECT t.*, c.name course_name, c.code course_code, w.week_no
      FROM submission_targets t JOIN courses c ON c.id = t.course_id JOIN weeks w ON w.id = t.week_id
      WHERE t.id = ?`).bind(targetId),
    db.prepare('SELECT * FROM submission_evidence WHERE target_id = ? AND round = ? ORDER BY received_at ASC').bind(targetId, round),
    db.prepare('SELECT * FROM manual_status WHERE target_id = ? AND round = ?').bind(targetId, round),
  ]);
  const target = targetRes.results[0];
  if (!target) return null;
  const evidence = evidenceRes.results.map(e => ({ ...e, links: JSON.parse(e.links_json) }));
  const manual = manualRes.results[0] || null;
  return {
    targetId, courseId: target.course_id, courseName: target.course_name, courseCode: target.course_code,
    weekNo: target.week_no, kind: target.kind, round,
    status: resolveStatus(manual?.status, evidence.length),
    evidence, manual,
  };
}

const evidenceCount = async (db, targetId, round) =>
  (await db.prepare('SELECT count(*) c FROM submission_evidence WHERE target_id = ? AND round = ?').bind(targetId, round).first()).c;

// action: 'confirmed_manual' | 'not_applicable' | 'clear'. "해당 없음" over mail evidence
// is a conflict unless force — ask before deciding (spec §3).
export async function setManualStatus(db, targetId, action, { force = false, round = '' } = {}) {
  if (!['confirmed_manual', 'not_applicable', 'clear'].includes(action)) return { ok: false, error: 'bad_action' };
  try { round = cleanRound(round); } catch { return { ok: false, error: 'bad_round' }; }
  const exists = await db.prepare('SELECT id FROM submission_targets WHERE id = ?').bind(targetId).first();
  if (!exists) return { ok: false, error: 'target_not_found' };
  const count = await evidenceCount(db, targetId, round);
  if (action === 'clear') {
    await db.prepare('DELETE FROM manual_status WHERE target_id = ? AND round = ?').bind(targetId, round).run();
    return { ok: true, status: resolveStatus(null, count) };
  }
  if (action === 'not_applicable' && count > 0 && !force) return { ok: false, conflict: true, evidenceCount: count };
  await db.prepare(`
    INSERT INTO manual_status (target_id, round, status, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(target_id, round) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
  `).bind(targetId, round, action, nowIso()).run();
  return { ok: true, status: resolveStatus(action, count) };
}

// ── 제출 메일을 어느 주차 · 회차에 놓을지 (사용자 지시 2026-11-23) ─────────────────────
// 트랙이 바뀐 뒤 과목마다 폼의 "N주차·N회차"가 자기 회차라(예: 11월에 시작한 IAE의 "1주차"), 숫자를 학기 주차로
// 쓰면 엉뚱한 칸에 들어간다. 사용자가 그 주 칸에 붙여넣은(회차를 붙인) 과제 공지가 곧 그 주의 과제이므로:
//   1) 폼의 회차 답("Magazine 2회차 (B)")과 같은 회차가 붙은 공지 → 그 공지의 주차 · 회차.
//   2) 폼 숫자가 받은 날짜와 맞으면(그 학기 주차 시작 −14일 ~ 끝 +10일) 예전처럼 그 주차(회차 없음).
//      과목 회차 목록에 있는 답("12회차")은 주차가 아니라 회차라 여기서 쓰지 않는다.
//   3) (과제만) 받은 시각을 같은 과목 공지들의 마감과 견준다.
//      - 다음 마감(받은 때 ≤ 마감, NEXT_DUE_LIMIT 안) = 제때 낸 그 공지 과제
//      - 지난 마감(마감 < 받은 때 ≤ 지각 마감, 없으면 마감 + LATE_GRACE) = 지각 제출
//      - 둘 다면: 폼 숫자가 둘 중 하나면 그것, 아니면 아직 제출 없는 지난 것, 있으면 다음 것.
//      - 자기 마감과 동떨어진 주 칸에 붙은 공지(예: 9월 2주차 칸의 11월 마감)는 쓰지 않는다.
//   4) 그래도 없으면 검토 대기열 — 화면의 "확인 필요"에서 직접 놓는다.
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

// → { week, round } | null. submittedWeeks: 이미 제출이 있는 주차 번호 또는 "주차|회차"
export function pickByDeadline(notes, receivedAt, { formWeek = null, submittedWeeks = new Set(), weeks = null } = {}) {
  const t = Date.parse(receivedAt);
  const dated = notes.filter(n => n.due_at)
    .map(n => ({ week: n.week_no, round: n.round || '', due: wallMs(n.due_at), late: n.late_due_at ? wallMs(n.late_due_at) : null }))
    .filter(n => !weeks || weekFitsDate(weeks, n.week, n.due))
    .sort((a, b) => a.due - b.due || a.week - b.week);
  const next = dated.find(n => n.due >= t && n.due - t <= NEXT_DUE_LIMIT_MS) || null;
  const prev = [...dated].reverse().find(n => n.due < t && t <= (n.late ?? n.due + LATE_GRACE_MS)) || null;
  if (!next && !prev) return null;
  if (!next || !prev) return next || prev;
  if (formWeek === next.week) return next;
  if (formWeek === prev.week) return prev;
  const taken = submittedWeeks.has(prev.week) || submittedWeeks.has(`${prev.week}|${prev.round}`);
  return taken ? next : prev;
}
export const weekByDeadline = (notes, receivedAt, opts) => pickByDeadline(notes, receivedAt, opts)?.week ?? null;

async function placeReceipt(db, r, email) {
  const formWeek = r.status === 'matched' ? r.weekNo : null;
  const key = roundKey(r.roundAnswer);
  const [notesRes, takenRes] = await db.batch([
    db.prepare('SELECT week_no, round, due_at, late_due_at FROM assignment_notes WHERE course_id = ?').bind(r.courseId),
    db.prepare(`SELECT DISTINCT w.week_no, e.round FROM submission_evidence e JOIN submission_targets t ON t.id = e.target_id
      JOIN weeks w ON w.id = t.week_id WHERE t.course_id = ? AND t.kind = ? AND e.gmail_message_id != ?`).bind(r.courseId, r.kind, email.messageId || ''),
  ]);
  const notes = notesRes.results;
  // 1) 같은 회차가 붙은 공지(여럿이면 가장 늦은 주차)
  if (key) {
    const hit = notes.filter(n => n.round && roundKey(n.round) === key).sort((a, b) => b.week_no - a.week_no)[0];
    if (hit) return { week: hit.week_no, round: hit.round };
  }
  const listed = key ? ((await getRounds(db))[r.courseId] || []).some(l => roundKey(l) === key) : false;
  const weeks = await getWeeks(db);
  // 2) 날짜와 맞는 폼 주차
  if (formWeek !== null && !listed && weekFitsDate(weeks, formWeek, Date.parse(email.receivedAt))) return { week: formWeek, round: '' };
  // 3) 공지 마감
  if (r.kind !== 'assignment') return null;
  const submitted = new Set(takenRes.results.flatMap(x => (x.round ? [`${x.week_no}|${x.round}`] : [x.week_no, `${x.week_no}|`])));
  return pickByDeadline(notes, email.receivedAt, { formWeek, weeks, submittedWeeks: submitted });
}

// Apply one fetched message. Never throws on a message that just doesn't match.
export async function ingestEmail(db, email, courses) {
  courses = courses || await getCourses(db);
  let result = matchEmail(email, { courses, windowStart: RECEIPTS_FROM, windowEnd: RECEIPTS_UNTIL });
  if (result.status === 'unrelated') return { outcome: 'unrelated' };

  let round = '';
  if (result.courseId) {
    const placed = await placeReceipt(db, result, email);
    if (placed) {
      result = { ...result, status: 'matched', weekNo: placed.week, track: null };
      round = placed.round;
    } else if (result.status === 'matched') {
      // 폼 숫자가 날짜와 동떨어졌거나 회차 목록의 회차인데 놓을 공지가 없으면 엉뚱한 칸 대신 검토 대기열
      result = { ...result, status: 'ambiguous', reason: 'week_not_in_date' };
    }
  }

  if (result.status === 'ambiguous') {
    const r = await db.prepare(`
      INSERT INTO review_queue (gmail_message_id, gmail_thread_id, received_at, subject, reason, created_at, course_id, kind, round_answer, links_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(gmail_message_id) DO NOTHING
    `).bind(email.messageId, email.threadId || null, email.receivedAt, email.subject, result.reason, nowIso(),
      result.courseId || null, result.kind || null, result.roundAnswer || null, JSON.stringify(result.links || {})).run();
    return r.meta.changes ? { outcome: 'review', reason: result.reason } : { outcome: 'duplicate' };
  }

  const targetId = await targetIdFor(db, result.courseId, result.weekNo, result.kind);
  if (!targetId) return { outcome: 'review', reason: 'week_out_of_range' };

  const [, inserted] = await db.batch([
    // a message an older rule set parked in review is resolved now
    db.prepare('DELETE FROM review_queue WHERE gmail_message_id = ?').bind(email.messageId),
    db.prepare(`
      INSERT INTO submission_evidence
        (target_id, gmail_message_id, gmail_thread_id, track, received_at, subject, links_json, created_at, round)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(gmail_message_id) DO NOTHING
    `).bind(targetId, email.messageId, email.threadId || null, result.track, email.receivedAt, email.subject,
      JSON.stringify(result.links), nowIso(), round),
  ]);
  if (!inserted.meta.changes) return { outcome: 'duplicate' };
  // a contradicted manual "해당 없음" stays as-is → resolveStatus reports 'conflict'
  return { outcome: 'matched', targetId, courseId: result.courseId, weekNo: result.weekNo, kind: result.kind, round };
}

// ── 검토 대기열 = 화면의 "확인 필요"(사용자 지시 2026-11-23) ─────────────────────────
//   GET    /api/assignment/review                → { items: [{ id, receivedAt, subject, reason, courseId, kind, roundAnswer, threadId }] }
//   POST   /api/assignment/review/:id  { courseId, weekNo, round, kind } → 그 칸 · 회차의 확인메일로 넣는다
//   DELETE /api/assignment/review/:id            → 과제 제출이 아님(목록에서 뺀다. 다시 읽지 않는다)
const TITLE_TAG_RE = /^\s*\[([^\]]+)\]\s*(과제|셀프\s*피드백)/;
export async function listReview(db) {
  const { results } = await db.prepare('SELECT * FROM review_queue ORDER BY received_at DESC').all();
  const courses = await getCourses(db);
  return results.map(r => {
    // 예전 대기열 줄은 과목·종류가 없다 — 제목의 [과목] 태그로 채운다
    const m = (r.subject || '').match(TITLE_TAG_RE);
    const tag = m ? normalize(m[1]) : '';
    const course = r.course_id ? null : courses.find(c => normalize(c.name) === tag || normalize(c.code) === tag);
    return {
      id: r.gmail_message_id, threadId: r.gmail_thread_id, receivedAt: r.received_at, subject: r.subject, reason: r.reason,
      courseId: r.course_id || course?.id || null,
      kind: r.kind || (m ? (/셀프/.test(m[2]) ? 'self_feedback' : 'assignment') : null),
      roundAnswer: r.round_answer || null,
    };
  });
}

export async function placeReview(db, messageId, body) {
  const row = await db.prepare('SELECT * FROM review_queue WHERE gmail_message_id = ?').bind(messageId).first();
  if (!row) return { ok: false, error: 'not_found' };
  const kind = body?.kind;
  if (!['assignment', 'self_feedback'].includes(kind)) throw new BadRequest('bad_kind');
  const round = cleanRound(body.round);
  const targetId = await targetIdFor(db, String(body.courseId || ''), Number(body.weekNo), kind);
  if (!targetId) throw new BadRequest('bad_target');
  await db.batch([
    db.prepare(`INSERT INTO submission_evidence (target_id, gmail_message_id, gmail_thread_id, track, received_at, subject, links_json, created_at, round)
      VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?) ON CONFLICT(gmail_message_id) DO NOTHING`)
      .bind(targetId, messageId, row.gmail_thread_id, row.received_at, row.subject, row.links_json || '{}', nowIso(), round),
    db.prepare('DELETE FROM review_queue WHERE gmail_message_id = ?').bind(messageId),
  ]);
  return { ok: true, targetId, round };
}

export async function dismissReview(db, messageId) {
  const r = await db.prepare('DELETE FROM review_queue WHERE gmail_message_id = ?').bind(messageId).run();
  return { ok: true, deleted: !!r.meta.changes };
}
