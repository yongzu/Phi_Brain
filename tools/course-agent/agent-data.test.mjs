// node --test tools/course-agent/agent-data.test.mjs — Course Agent 도구의 순수 함수(저널 조각 · 검증 · SQL · 마크다운)
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { journalChunks, validateMemory, memorySql, memoryMarkdown } from './agent-data.mjs';

const box = c => `<div class="course-box" contenteditable="false" data-course="${c}"><button type="button" class="cb-btn"><span><span class="nav-code">${c}</span></span><span class="caret">▾</span></button></div>`;

test('journalChunks splits a journal by 4F heading and course box, keeping bold and highlight', () => {
  const html = `<h3 data-guide="x">Fact</h3><p>공통 문장</p><h3>Finding</h3>${box('BI')}<p>1. <b>굵게</b> 그리고 <mark data-hl="blue">표시</mark></p><p>둘째&nbsp;줄</p>${box('IPS')}<p>IPS 문단</p>`;
  assert.deepEqual(journalChunks(html), [
    { section: 'Fact', course: 'general', text: '공통 문장' },
    { section: 'Finding', course: 'bi', text: '1. **굵게** 그리고 ==표시==\n둘째 줄' },
    { section: 'Finding', course: 'ips', text: 'IPS 문단' },
  ]);
});

test('validateMemory refuses unknown sections and sourceless insights, and gives stable ids', () => {
  const ok = validateMemory('bi', { mode: 'harvest', items: [
    { section: 'overview', title: '요약' },
    { section: 'insight', title: '레퍼런스는 문제 정의에서', sources: [{ type: 'journal', date: '2026-09-16' }] },
    { section: 'insight', title: '레퍼런스는 문제 정의에서', sources: [{ type: 'journal', date: '2026-09-23' }] },
  ] });
  assert.deepEqual(ok.map(i => i.id), ['bi:overview:요약', 'bi:insight:레퍼런스는-문제-정의에서', 'bi:insight:레퍼런스는-문제-정의에서-2']);
  assert.throws(() => validateMemory('bi', { mode: 'harvest', items: [{ section: 'insight', title: '출처 없음' }] }), /출처/);
  assert.throws(() => validateMemory('bi', { mode: 'harvest', items: [{ section: 'random', title: 'x', sources: [{}] }] }), /section/);
  assert.throws(() => validateMemory('zz', { mode: 'harvest', items: [] }), /모르는 과목/);
});

test('memorySql replaces a course in the real schema, with quotes escaped', () => {
  const db = new DatabaseSync(':memory:');
  const dir = new URL('../../worker/migrations/', import.meta.url);
  for (const f of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, dir), 'utf8'));
  const doc = { mode: 'harvest', summary: "it's", items: [{ section: 'insight', title: "작은따옴표 '테스트'", body: '본문', sources: [{ type: 'file', path: "a'b.md" }] }] };
  db.exec(memorySql('bi', doc, validateMemory('bi', doc), '2026-11-23T00:00:00Z'));
  db.exec(memorySql('bi', doc, validateMemory('bi', doc), '2026-11-23T00:00:01Z')); // 다시 써도 한 벌
  const rows = db.prepare('SELECT * FROM course_memory').all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "작은따옴표 '테스트'");
  assert.deepEqual(JSON.parse(rows[0].sources), [{ type: 'file', path: "a'b.md" }]);
  assert.equal(db.prepare('SELECT summary FROM course_memory_runs').get().summary, "it's");
});

test('memoryMarkdown groups by section with sources', () => {
  const doc = { mode: 'harvest', items: [{ section: 'next', title: '할 것', body: '본문', sources: [{ type: 'notice', week: 12, round: 'Fonts 2회차' }] }] };
  const md = memoryMarkdown('tf', doc, validateMemory('tf', doc), '2026-11-23T00:00:00Z');
  assert.match(md, /## 다음 과제에 쓸 것/);
  assert.match(md, /\*\*할 것\*\* 본문 _\(12주차 Fonts 2회차 공지\)_/);
});
