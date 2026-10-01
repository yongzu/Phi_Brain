// 과목 상태(사용자 지시 2026-10-01) — Assignment Manage에서 과목 이름을 눌러 정한다. 모든 주차에 같이 적용.
//   'inactive'  = 수강기간 아님(아직 시작 전 등)
//   'completed' = 완강(예: EWA)
// 둘 다 표 맨 아래·회색으로 가고, 완료 수와 TO-DO에서 빠진다. 과목 하나에 하나만. settings 테이블의 한 줄(JSON).
//   GET /api/assignment/course-states            → { states: { ewa: 'completed', … } }
//   PUT /api/assignment/course-states/:courseId  { state: 'inactive'|'completed'|null } → { ok, states }
// (휴강은 과목 × 주차라 여기가 아니라 그 주 셀프피드백 칸의 '해당 없음'으로 기록한다 — 화면 assignment.js)
import { BadRequest } from '../journals.js';

const STATES_KEY = 'assignment_course_states';
export const COURSE_STATES = ['inactive', 'completed'];

export async function getCourseStates(db) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(STATES_KEY).first();
  try {
    const v = row ? JSON.parse(row.value) : {};
    return Object.fromEntries(Object.entries(v && typeof v === 'object' ? v : {}).filter(([, s]) => COURSE_STATES.includes(s)));
  } catch { return {}; }
}

export async function setCourseState(db, courseId, state) {
  if (state !== null && !COURSE_STATES.includes(state)) throw new BadRequest('bad_state');
  const course = await db.prepare('SELECT id FROM courses WHERE id = ?').bind(courseId).first();
  if (!course) throw new BadRequest('bad_course');
  const states = await getCourseStates(db);
  if (state) states[courseId] = state; else delete states[courseId];
  await db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(STATES_KEY, JSON.stringify(states), new Date().toISOString()).run();
  return { ok: true, states };
}
