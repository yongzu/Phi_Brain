// Course Agent(2026-11-23): 과목 기억 읽기 · 지우기, 그 과목 과제 공지(회차 · 마감 · 상태)
import test from 'node:test';
import assert from 'node:assert/strict';
import { testD1 } from './d1.js';
import { getCourseAgent, listAgentCourses, deleteMemoryItem } from '../src/agent.js';
import { saveNote } from '../src/assignment/notes.js';
import { setManualStatus, targetIdFor } from '../src/assignment/service.js';

const put = (db, id, course, section, title, position = 0, sources = []) => db.prepare(
  `INSERT INTO course_memory (id, course_id, section, title, body, sources, position, updated_at) VALUES (?, ?, ?, ?, '본문', ?, ?, 'x')`,
).bind(id, course, section, title, JSON.stringify(sources), position).run();

test('a course page carries its memory in order, the last run, and its notices with round and status', async () => {
  const db = testD1();
  await put(db, 'bi:b', 'bi', 'insight', '둘째', 2, [{ type: 'journal', date: '2026-09-16' }]);
  await put(db, 'bi:a', 'bi', 'overview', '첫째', 1);
  await db.prepare(`INSERT INTO course_memory_runs (course_id, mode, summary, ran_at) VALUES ('bi', 'harvest', '저널 9개', '2026-11-23T00:00:00Z')`).run();
  await saveNote(db, 'bi', 7, { raw: '7주차 과제', dueAt: '2026-10-26T23:59', baseVersion: null });
  await setManualStatus(db, await targetIdFor(db, 'bi', 7, 'assignment'), 'confirmed_manual');
  const page = await getCourseAgent(db, 'bi');
  assert.deepEqual(page.memory.map(m => m.title), ['첫째', '둘째']);
  assert.deepEqual(page.memory[1].sources, [{ type: 'journal', date: '2026-09-16' }]);
  assert.deepEqual(page.run, { mode: 'harvest', summary: '저널 9개', ranAt: '2026-11-23T00:00:00Z' });
  assert.deepEqual(page.notes.map(n => [n.weekNo, n.round, n.dueAt, n.status]), [[7, '', '2026-10-26T23:59', 'confirmed_manual']]);
  assert.deepEqual((await listAgentCourses(db)).map(c => [c.courseId, c.count, c.mode]), [['bi', 2, 'harvest']]);
});

test('general is a page too; unknown courses are refused; an item can be removed from the page', async () => {
  const db = testD1();
  await put(db, 'general:x', 'general', 'synthesis', '과목을 잇는 것');
  assert.equal((await getCourseAgent(db, 'general')).memory.length, 1);
  await assert.rejects(getCourseAgent(db, 'zz'), { code: 'bad_course' });
  await assert.rejects(getCourseAgent(db, 'DROP'), { code: 'bad_course' });
  assert.equal((await deleteMemoryItem(db, 'general:x')).deleted, true);
  assert.equal((await getCourseAgent(db, 'general')).memory.length, 0);
});

test('memory sections are limited to the known ones', async () => {
  const db = testD1();
  await assert.rejects(put(db, 'bi:z', 'bi', 'random', 'x'));
});
