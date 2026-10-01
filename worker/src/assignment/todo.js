// 이번 주 할 일(TO-DO) — Assignment Manage 오른쪽 열(사용자 요구사항 2026-10-01). Behind the session.
//
//   GET /api/assignment/todo         → { items, prefs }
//   PUT /api/assignment/todo/prefs   { order, memos } → { ok, prefs }
//
// items: 과제는 과제 공지(assignment_notes)에 마감이 있는 과목 × 주차마다 하나.
// 셀프피드백은 세션이 만든다(사용자 확정 2026-10-01) — 공지와 상관없이 매주 세션 요일(SESSION_DAY)이 되면
// 그 주(학기 달력 주차)의 항목이 생긴다. 최근 SESSION_WINDOW_DAYS일 안의 세션만. SI(한 달에 한 번)·PC(세션 없음)·
// 나머지 과목은 만들지 않는다. 마감은 그 주 과제 공지의 지각 마감(없으면 과제 마감) — LMS의 셀프피드백 마감이
// 지각 마감과 같았다. 공지가 없으면 null(화면에서 "마감 미정"). 이 날짜는 할 일 목록에만 쓰고 제출 상태 판정에는 쓰지 않는다.
// prefs: 사용자가 끌어서 정한 순서(key 목록)와 항목별 한 줄 메모 — settings 테이블의 한 줄(JSON).
import { BadRequest } from '../journals.js';
import { resolveStatus } from './service.js';

const PREFS_KEY = 'assignment_todo';
export const TODO_KEY_RE = /^[a-z]{2,4}:\d{1,2}:[as]$/; // 과목:주차:a(과제)|s(셀프피드백)
export const MEMO_MAX = 200;
const LIST_MAX = 500;

export const todoKey = (courseId, weekNo, kind) => `${courseId}:${weekNo}:${kind === 'assignment' ? 'a' : 's'}`;

export async function getTodoPrefs(db) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(PREFS_KEY).first();
  try {
    const v = row ? JSON.parse(row.value) : {};
    return { order: Array.isArray(v.order) ? v.order : [], memos: v.memos && typeof v.memos === 'object' ? v.memos : {} };
  } catch { return { order: [], memos: {} }; }
}

// 매주 세션 요일 — weeks.start_date(월요일)에서 며칠 뒤. 화 = 1, 수 = 2, 목 = 3
export const SESSION_DAY = { al: 1, ips: 1, bi: 2, aor: 2, tf: 3, vt: 3 };
export const SESSION_WINDOW_DAYS = 14;
const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const kstToday = now => new Date(now + 9 * 36e5).toISOString().slice(0, 10);

export async function getTodo(db, now = Date.now()) {
  const status = r => resolveStatus(r.manual_status, r.evidence_count);
  const { results: assignments } = await db.prepare(`
    SELECT n.course_id, c.code, c.name, c.assignment_url, n.week_no, n.due_at,
      t.id target_id, m.status manual_status,
      (SELECT count(*) FROM submission_evidence e WHERE e.target_id = t.id) evidence_count
    FROM assignment_notes n
    JOIN courses c ON c.id = n.course_id
    JOIN weeks w ON w.week_no = n.week_no
    JOIN submission_targets t ON t.course_id = n.course_id AND t.week_id = w.id AND t.kind = 'assignment'
    LEFT JOIN manual_status m ON m.target_id = t.id
    WHERE n.due_at IS NOT NULL
  `).all();
  const items = assignments.map(r => ({
    key: todoKey(r.course_id, r.week_no, 'assignment'), targetId: r.target_id,
    courseId: r.course_id, code: r.code, name: r.name, weekNo: r.week_no, kind: 'assignment',
    dueAt: r.due_at, status: status(r), url: r.assignment_url,
  }));

  // 셀프피드백: 오늘(한국 시각)까지 세션이 지난, 최근 SESSION_WINDOW_DAYS일 안의 주
  const today = kstToday(now), from = addDays(today, 1 - SESSION_WINDOW_DAYS);
  const ids = Object.keys(SESSION_DAY);
  const { results: feedbacks } = await db.prepare(`
    SELECT t.course_id, c.code, c.name, c.self_feedback_url, w.week_no, w.start_date, n.due_at, n.late_due_at,
      t.id target_id, m.status manual_status,
      (SELECT count(*) FROM submission_evidence e WHERE e.target_id = t.id) evidence_count
    FROM submission_targets t
    JOIN courses c ON c.id = t.course_id
    JOIN weeks w ON w.id = t.week_id
    LEFT JOIN assignment_notes n ON n.course_id = t.course_id AND n.week_no = w.week_no
    LEFT JOIN manual_status m ON m.target_id = t.id
    WHERE t.kind = 'self_feedback' AND t.course_id IN (${ids.map(() => '?').join(',')}) AND w.start_date BETWEEN ? AND ?
  `).bind(...ids, addDays(from, -6), today).all();
  for (const r of feedbacks) {
    const sessionDate = addDays(r.start_date, SESSION_DAY[r.course_id]);
    if (sessionDate < from || sessionDate > today) continue;
    items.push({
      key: todoKey(r.course_id, r.week_no, 'self_feedback'), targetId: r.target_id,
      courseId: r.course_id, code: r.code, name: r.name, weekNo: r.week_no, kind: 'self_feedback', sessionDate,
      dueAt: r.late_due_at || r.due_at || null, status: status(r), url: r.self_feedback_url,
    });
  }
  items.sort((a, b) => a.weekNo - b.weekNo || a.code.localeCompare(b.code) || a.kind.localeCompare(b.kind));
  return { items, prefs: await getTodoPrefs(db) };
}

export function cleanPrefs(body) {
  if (!body || !Array.isArray(body.order) || !body.memos || typeof body.memos !== 'object' || Array.isArray(body.memos)) throw new BadRequest('bad_body');
  const order = [...new Set(body.order)];
  if (order.length > LIST_MAX || !order.every(k => typeof k === 'string' && TODO_KEY_RE.test(k))) throw new BadRequest('bad_order');
  const entries = Object.entries(body.memos);
  if (entries.length > LIST_MAX) throw new BadRequest('bad_memos');
  const memos = {};
  for (const [k, v] of entries) {
    if (!TODO_KEY_RE.test(k) || typeof v !== 'string') throw new BadRequest('bad_memos');
    const text = v.replace(/\s+/g, ' ').trim(); // 한 줄 메모
    if ([...text].length > MEMO_MAX) throw new BadRequest('memo_too_long');
    if (text) memos[k] = text;
  }
  return { order, memos };
}

export async function saveTodoPrefs(db, body) {
  const prefs = cleanPrefs(body);
  await db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(PREFS_KEY, JSON.stringify(prefs), new Date().toISOString()).run();
  return { ok: true, prefs };
}
