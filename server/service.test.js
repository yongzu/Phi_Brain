'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { openDb } = require('./db');
const { ingestEmail, getWeekMatrix, getTargetDetail, setManualStatus, targetIdFor } = require('./service');

const ewaBody = (week) => `
[Engaging with AI] 과제 제출

질문: 주차 (예: 0주차는 오리엔테이션입니다)
답변: ${week}

질문: 트랙
답변: 트랙 b

질문: 작동하는 작업
답변: https://github.com/example/working-artifact
`;

const email = (overrides = {}) => ({
  from: 'Google Forms <forms-receipts-noreply@google.com>',
  subject: '[Engaging with AI] 과제 제출 양식을 작성해 주셔서 감사합니다',
  receivedAt: '2026-09-19T03:00:00.000Z',
  bodyText: ewaBody('2주차'),
  messageId: 'm-1',
  threadId: 't-1',
  ...overrides,
});

test('a matched email flips the target from unconfirmed to confirmed_mail', () => {
  const db = openDb(':memory:');
  const targetId = targetIdFor(db, 'ewa', 2, 'assignment');
  assert.equal(getTargetDetail(db, targetId).status, 'unconfirmed');
  const r = ingestEmail(db, email());
  assert.equal(r.outcome, 'matched');
  assert.equal(getTargetDetail(db, targetId).status, 'confirmed_mail');
});

test('the same Gmail message id is never ingested twice', () => {
  const db = openDb(':memory:');
  const targetId = targetIdFor(db, 'ewa', 2, 'assignment');
  ingestEmail(db, email());
  const second = ingestEmail(db, email());
  assert.equal(second.outcome, 'duplicate');
  const detail = getTargetDetail(db, targetId);
  assert.equal(detail.evidence.length, 1);
});

test('a resubmission (different message id, same target) is kept as history, not a replacement', () => {
  const db = openDb(':memory:');
  const targetId = targetIdFor(db, 'ewa', 2, 'assignment');
  ingestEmail(db, email({ messageId: 'm-1' }));
  ingestEmail(db, email({ messageId: 'm-2', receivedAt: '2026-09-20T03:00:00.000Z' }));
  const detail = getTargetDetail(db, targetId);
  assert.equal(detail.evidence.length, 2);
  assert.deepEqual(detail.evidence.map(e => e.gmail_message_id), ['m-1', 'm-2']);
});

test('setting "해당 없음" over an existing confirmation mail is a conflict, not silently applied', () => {
  const db = openDb(':memory:');
  const targetId = targetIdFor(db, 'ewa', 2, 'assignment');
  ingestEmail(db, email());
  const r = setManualStatus(db, targetId, 'not_applicable');
  assert.equal(r.ok, false);
  assert.equal(r.conflict, true);
  assert.equal(getTargetDetail(db, targetId).status, 'confirmed_mail');
});

test('forcing "해당 없음" past a conflict still keeps the mail evidence (surfaced as conflict, not erased)', () => {
  const db = openDb(':memory:');
  const targetId = targetIdFor(db, 'ewa', 2, 'assignment');
  ingestEmail(db, email());
  const r = setManualStatus(db, targetId, 'not_applicable', { force: true });
  assert.equal(r.ok, true);
  assert.equal(getTargetDetail(db, targetId).status, 'conflict');
  assert.equal(getTargetDetail(db, targetId).evidence.length, 1);
});

test('manual "직접 확인" counts toward progress; "해당 없음" is excluded from the denominator', () => {
  const db = openDb(':memory:');
  const assignmentId = targetIdFor(db, 'ewa', 2, 'assignment');
  const sfId = targetIdFor(db, 'ewa', 2, 'self_feedback');
  setManualStatus(db, assignmentId, 'confirmed_manual');
  setManualStatus(db, sfId, 'not_applicable');
  const matrix = getWeekMatrix(db, 2);
  const ewaRow = matrix.rows.find(r => r.courseId === 'ewa');
  assert.equal(ewaRow.assignment.status, 'confirmed_manual');
  assert.equal(ewaRow.selfFeedback.status, 'not_applicable');
  // one course confirmed manually, everything else (23 targets) still unconfirmed,
  // one course's self-feedback excluded from the denominator
  assert.equal(matrix.progress.done, 1);
  assert.equal(matrix.progress.total, 12 * 2 - 1);
});

test('a mail dated in this cohort but for an unrecognized course goes to review, leaving the matrix unconfirmed', () => {
  const db = openDb(':memory:');
  const r = ingestEmail(db, email({
    messageId: 'm-3',
    subject: '[Unknown Course] 과제 제출 양식을 작성해 주셔서 감사합니다',
    bodyText: ewaBody('2주차').replace('[Engaging with AI]', '[Unknown Course]'),
  }));
  assert.equal(r.outcome, 'review');
  const targetId = targetIdFor(db, 'ewa', 2, 'assignment');
  assert.equal(getTargetDetail(db, targetId).status, 'unconfirmed');
});
