'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSnapshot, applyMatch, resetMailCells, searchSince, serialize } = require('./snapshot');

test('a fresh file has every week 0~16 × 12 courses × 2 kinds, all null', () => {
  const s = normalizeSnapshot();
  assert.deepEqual(Object.keys(s.weeks).map(Number), Array.from({ length: 17 }, (_, i) => i));
  assert.equal(Object.keys(s.weeks[0]).length, 12);
  assert.deepEqual(s.weeks[5].AL, { assignment: null, selfFeedback: null });
  assert.equal(s.courses.length, 12);
});

test('a receipt marks its cell "mail", by course id → code and kind', () => {
  const s = normalizeSnapshot();
  assert.equal(applyMatch(s, { courseId: 'ewa', kind: 'self_feedback', weekNo: 2 }), true);
  assert.equal(s.weeks[2].EWA.selfFeedback, 'mail');
  assert.equal(s.weeks[2].EWA.assignment, null);
});

test('reading the same receipt again (overlap between runs) changes nothing', () => {
  const s = normalizeSnapshot();
  applyMatch(s, { courseId: 'al', kind: 'assignment', weekNo: 1 });
  assert.equal(applyMatch(s, { courseId: 'al', kind: 'assignment', weekNo: 1 }), false);
});

test('a week outside 0~16 or an unknown course is ignored, not added', () => {
  const s = normalizeSnapshot();
  assert.equal(applyMatch(s, { courseId: 'al', kind: 'assignment', weekNo: 40 }), false);
  assert.equal(applyMatch(s, { courseId: 'nope', kind: 'assignment', weekNo: 1 }), false);
  assert.equal('40' in s.weeks, false);
});

test('hand edits survive normalization; typos and unknown keys drop out instead of breaking the page', () => {
  const s = normalizeSnapshot({
    lastSyncedAt: '2026-09-20T14:59:00.000Z',
    weeks: { 1: { AL: { assignment: 'manual', selfFeedback: 'Mail' }, XX: { assignment: 'mail' } }, 99: {} },
  });
  assert.equal(s.weeks[1].AL.assignment, 'manual');
  assert.equal(s.weeks[1].AL.selfFeedback, null);
  assert.equal('XX' in s.weeks[1], false);
  assert.equal('99' in s.weeks, false);
  assert.equal(s.lastSyncedAt, '2026-09-20T14:59:00.000Z');
});

test('"전체 다시 계산" clears mail cells but keeps manual ones', () => {
  const s = normalizeSnapshot();
  applyMatch(s, { courseId: 'al', kind: 'assignment', weekNo: 1 });
  s.weeks[1].BI.assignment = 'manual';
  resetMailCells(s);
  assert.equal(s.weeks[1].AL.assignment, null);
  assert.equal(s.weeks[1].BI.assignment, 'manual');
});

test('search starts at the cohort window on a first/full run, else one day before the last successful sync', () => {
  const s = normalizeSnapshot();
  assert.match(searchSince(s), /^\d{4}\/\d{2}\/\d{2}$/);
  s.lastSyncedAt = '2026-09-20T14:59:00.000Z';
  assert.equal(searchSince(s), String(Date.parse('2026-09-19T14:59:00.000Z') / 1000));
  assert.match(searchSince(s, { full: true }), /^\d{4}\/\d{2}\/\d{2}$/);
});

test('the written file is valid JSON, one line per course, with no mail details in it', () => {
  const s = normalizeSnapshot();
  applyMatch(s, { courseId: 'ips', kind: 'assignment', weekNo: 0 });
  const text = serialize(s);
  const back = JSON.parse(text);
  assert.equal(back.weeks[0].IPS.assignment, 'mail');
  assert.match(text, /\n {6}"IPS": \{"assignment":"mail","selfFeedback":null\}/);
  assert.doesNotMatch(text, /message|subject|thread|receivedAt|@/i);
});
