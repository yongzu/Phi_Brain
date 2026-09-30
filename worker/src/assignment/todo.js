// 이번 주 할 일(TO-DO) — Assignment Manage 오른쪽 열(사용자 요구사항 2026-10-01). Behind the session.
//
//   GET /api/assignment/todo         → { items, prefs }
//   PUT /api/assignment/todo/prefs   { order, memos } → { ok, prefs }
//
// items: 과제 공지(assignment_notes)에 마감이 있는 과목 × 주차마다 과제·셀프피드백 둘.
// 셀프피드백 마감은 공지에 없어 과제 지각 마감(없으면 과제 마감)으로 둔다 — LMS의 셀프피드백 마감이
// 지각 마감과 같았다(사용자 확정 2026-10-01). 이 날짜는 할 일 목록에만 쓰고 제출 상태 판정에는 쓰지 않는다.
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

export async function getTodo(db) {
  const { results } = await db.prepare(`
    SELECT n.course_id, c.code, c.name, c.assignment_url, c.self_feedback_url, n.week_no, n.due_at, n.late_due_at,
      t.id target_id, t.kind, m.status manual_status,
      (SELECT count(*) FROM submission_evidence e WHERE e.target_id = t.id) evidence_count
    FROM assignment_notes n
    JOIN courses c ON c.id = n.course_id
    JOIN weeks w ON w.week_no = n.week_no
    JOIN submission_targets t ON t.course_id = n.course_id AND t.week_id = w.id
    LEFT JOIN manual_status m ON m.target_id = t.id
    WHERE n.due_at IS NOT NULL
    ORDER BY n.week_no, c.code, t.kind
  `).all();
  const items = results.map(r => {
    const isAssignment = r.kind === 'assignment';
    return {
      key: todoKey(r.course_id, r.week_no, r.kind), targetId: r.target_id,
      courseId: r.course_id, code: r.code, name: r.name, weekNo: r.week_no, kind: r.kind,
      dueAt: isAssignment ? r.due_at : (r.late_due_at || r.due_at),
      status: resolveStatus(r.manual_status, r.evidence_count),
      url: isAssignment ? r.assignment_url : r.self_feedback_url,
    };
  });
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
