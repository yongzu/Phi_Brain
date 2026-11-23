// 과목별 회차 목록(사용자 지시 2026-11-23) — 주차(학기 0~16)는 그대로, 과제는 과목의 "회차"로 부른다.
//   GET /api/assignment/rounds              → { rounds: { vt: ['Magazine 2회차', …], … }, used: { vt: ['Magazine 2회차'], … } }
//   PUT /api/assignment/rounds/:courseId    { rounds: [...] } → { ok, rounds }   ("+ 회차 추가")
// settings 테이블의 한 줄(JSON). used = 공지에 이미 붙은 회차(다음 회차를 고르는 데 쓴다).
import { BadRequest } from '../journals.js';

const ROUNDS_KEY = 'assignment_rounds';
export const ROUND_MAX = 40, ROUNDS_PER_COURSE = 60;

// 회차 이름 → 비교용 키. "Magazine 2회차 (B)" · "magazine 2회차" → "magazine|2", "11회차(Track B)" · "11주차" → "|11".
// 폼의 답(…회차·…주차)과 공지에 붙인 회차 이름을 같은 것으로 맞추는 데 쓴다. 숫자가 없으면 null.
export function roundKey(label) {
  const m = String(label ?? '').match(/^\s*([A-Za-z가-힣][A-Za-z가-힣 ]*?)?\s*(\d{1,2})\s*(?:회차|주차|회)/);
  if (!m) return null;
  return `${(m[1] || '').replace(/\s+/g, ' ').trim().toLowerCase()}|${Number(m[2])}`;
}
// 할 일 목록 키에 넣을 짧은 글자("Magazine 2회차" → "magazine2")
export const roundSlug = label => String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);

export function cleanRound(v) {
  if (v == null) return '';
  if (typeof v !== 'string') throw new BadRequest('bad_round');
  const s = v.replace(/\s+/g, ' ').trim();
  if ([...s].length > ROUND_MAX) throw new BadRequest('bad_round');
  return s;
}

export async function getRounds(db) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(ROUNDS_KEY).first();
  try {
    const v = row ? JSON.parse(row.value) : {};
    return Object.fromEntries(Object.entries(v && typeof v === 'object' ? v : {})
      .filter(([, list]) => Array.isArray(list)).map(([c, list]) => [c, list.filter(x => typeof x === 'string' && x)]));
  } catch { return {}; }
}

export async function setRounds(db, courseId, list) {
  const course = await db.prepare('SELECT id FROM courses WHERE id = ?').bind(courseId).first();
  if (!course) throw new BadRequest('bad_course');
  if (!Array.isArray(list) || list.length > ROUNDS_PER_COURSE) throw new BadRequest('bad_rounds');
  const clean = [...new Set(list.map(cleanRound).filter(Boolean))];
  const all = await getRounds(db);
  if (clean.length) all[courseId] = clean; else delete all[courseId];
  await db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(ROUNDS_KEY, JSON.stringify(all), new Date().toISOString()).run();
  return { ok: true, rounds: clean };
}

export async function getRoundsWithUsed(db) {
  const rounds = await getRounds(db);
  const { results } = await db.prepare(`SELECT course_id, round FROM assignment_notes WHERE round != '' ORDER BY week_no`).all();
  const used = {};
  for (const r of results) (used[r.course_id] ||= []).includes(r.round) || used[r.course_id].push(r.round);
  return { rounds, used };
}

// "Fonts 3회차"가 목록 "Fonts 2~8회차" 중 어디인지 → { n: 3, last: 8 } (화면의 3/8). 목록에 없으면 null
export function roundPosition(list, label) {
  if (!label || !list?.length) return null;
  const key = roundKey(label);
  if (!key || !list.some(l => roundKey(l) === key)) return null;
  const num = l => Number(roundKey(l).split('|')[1]);
  return { n: num(label), last: Math.max(...list.filter(l => roundKey(l)).map(num)) };
}
