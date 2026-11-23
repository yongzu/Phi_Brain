// Course Agent(사용자 지시 2026-11-23) — 과목별 "과목 기억"을 화면에 내준다. Behind the session.
//
//   GET    /api/agent/courses              → { courses: [{ courseId, count, ranAt, mode }] }
//   GET    /api/agent/courses/:id          → { courseId, memory: [...], run, notes: [...] }   (:id = courses.id | 'general')
//   DELETE /api/agent/memory/:itemId       → 화면에서 항목 지우기(다음 정리 때 에이전트가 다시 쓸 수 있다)
//
// 쓰기는 에이전트(Claude Code 스킬 course-agent)가 wrangler로 D1에 직접 한다 — 과목마다 통째로 바꿔 쓴다.
// notes = 그 과목의 과제 공지(주차 · 회차 · 마감)와 과제 제출 상태. 저널 · Future Item은 화면이 이미 가진 저장소에서 읽는다.
import { BadRequest } from './journals.js';
import { resolveStatus } from './assignment/service.js';

export const MEMORY_SECTIONS = ['overview', 'insight', 'method', 'feedback', 'mine', 'apply', 'next', 'synthesis'];
const COURSE_RE = /^(?:[a-z]{2,4}|general)$/;

const toItem = r => {
  let sources = [];
  try { sources = JSON.parse(r.sources); } catch {}
  return { id: r.id, courseId: r.course_id, section: r.section, title: r.title, body: r.body, sources: Array.isArray(sources) ? sources : [], position: r.position, updatedAt: r.updated_at };
};

export async function listAgentCourses(db) {
  const [counts, runs] = await db.batch([
    db.prepare('SELECT course_id, count(*) n FROM course_memory GROUP BY course_id'),
    db.prepare('SELECT * FROM course_memory_runs'),
  ]);
  const run = new Map(runs.results.map(r => [r.course_id, r]));
  const ids = new Set([...counts.results.map(r => r.course_id), ...run.keys()]);
  return [...ids].sort().map(id => ({
    courseId: id, count: counts.results.find(r => r.course_id === id)?.n || 0,
    ranAt: run.get(id)?.ran_at || null, mode: run.get(id)?.mode || null,
  }));
}

export async function getCourseAgent(db, courseId) {
  if (!COURSE_RE.test(courseId)) throw new BadRequest('bad_course');
  if (courseId !== 'general' && !(await db.prepare('SELECT id FROM courses WHERE id = ?').bind(courseId).first())) throw new BadRequest('bad_course');
  const [memory, run, notes] = await db.batch([
    db.prepare('SELECT * FROM course_memory WHERE course_id = ? ORDER BY position, id').bind(courseId),
    db.prepare('SELECT * FROM course_memory_runs WHERE course_id = ?').bind(courseId),
    db.prepare(`
      SELECT n.week_no, n.round, n.due_at, n.late_due_at, n.raw, t.id target_id, m.status manual_status,
        (SELECT count(*) FROM submission_evidence e WHERE e.target_id = t.id AND e.round = n.round) evidence_count
      FROM assignment_notes n
      JOIN weeks w ON w.week_no = n.week_no
      JOIN submission_targets t ON t.course_id = n.course_id AND t.week_id = w.id AND t.kind = 'assignment'
      LEFT JOIN manual_status m ON m.target_id = t.id AND m.round = n.round
      WHERE n.course_id = ? ORDER BY n.week_no DESC, n.round`).bind(courseId),
  ]);
  const r = run.results[0];
  return {
    courseId,
    memory: memory.results.map(toItem),
    run: r ? { mode: r.mode, summary: r.summary, ranAt: r.ran_at } : null,
    notes: notes.results.map(n => ({
      weekNo: n.week_no, round: n.round, dueAt: n.due_at, lateDueAt: n.late_due_at, raw: n.raw,
      status: resolveStatus(n.manual_status, n.evidence_count),
    })),
  };
}

export async function deleteMemoryItem(db, itemId) {
  if (typeof itemId !== 'string' || !itemId || itemId.length > 120) throw new BadRequest('bad_id');
  const r = await db.prepare('DELETE FROM course_memory WHERE id = ?').bind(itemId).run();
  return { ok: true, deleted: !!r.meta.changes };
}

export async function agentApi(request, db, path, json) {
  let m;
  if (path === '/api/agent/courses' && request.method === 'GET') return json(200, { courses: await listAgentCourses(db) });
  if ((m = path.match(/^\/api\/agent\/courses\/([a-z]{2,7})$/)) && request.method === 'GET') return json(200, await getCourseAgent(db, m[1]));
  if ((m = path.match(/^\/api\/agent\/memory\/(.+)$/)) && request.method === 'DELETE') return json(200, await deleteMemoryItem(db, decodeURIComponent(m[1])));
  return null;
}
