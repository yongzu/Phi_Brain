'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { matchEmail } = require('./matching');

const COURSES = [
  { id: 'ewa', name: 'Engaging with AI', code: 'EWA', aliases: JSON.stringify(['eai']) },
  { id: 'bi', name: 'Beautiful Interface', code: 'BI', aliases: '[]' },
];
const CTX = { courses: COURSES, semesterStart: '2026-09-06', semesterEnd: '2026-12-26' };

const ewaBody = ({ week = '2주차', trackLine = '트랙 b', withTil = true } = {}) => `
[Engaging with AI] 과제 제출

제출해 주셔서 감사합니다. 아래 내용이 정상적으로 접수되었습니다.

질문: 제출자
답변: 홍길동

질문: 트랙
답변: ${trackLine}

질문: 주차 (예: 0주차는 오리엔테이션입니다)
답변: ${week}

질문: 목표 및 탐색
답변: 이번 주 목표는 AI와 함께 탐색하는 것이었습니다.

질문: AI 대화 링크
답변: https://chat.example.com/abc123

질문: 작동하는 작업
답변: https://github.com/example/working-artifact
${withTil ? `
질문: TIL 리포트
답변: https://notion.example.com/til-report
` : ''}`;

const baseEmail = (overrides = {}) => ({
  from: 'Google Forms <forms-receipts-noreply@google.com>',
  subject: '[Engaging with AI] 과제 제출 양식을 작성해 주셔서 감사합니다',
  receivedAt: '2026-09-19T03:00:00.000Z',
  bodyText: ewaBody(),
  messageId: 'msg-1',
  threadId: 'thread-1',
  ...overrides,
});

test('EWA verified sample: matches course/kind/week and extracts links', () => {
  const r = matchEmail(baseEmail(), CTX);
  assert.equal(r.status, 'matched');
  assert.equal(r.courseId, 'ewa');
  assert.equal(r.kind, 'assignment');
  assert.equal(r.weekNo, 2);
  assert.equal(r.track, 'b');
  assert.equal(r.links.workingArtifact, 'https://github.com/example/working-artifact');
  assert.equal(r.links.tilReport, 'https://notion.example.com/til-report');
});

test('a field the form does not have is simply omitted, not fabricated', () => {
  const r = matchEmail(baseEmail({ bodyText: ewaBody({ withTil: false }) }), CTX);
  assert.equal(r.status, 'matched');
  assert.equal('tilReport' in r.links, false);
});

test('the "(예: 0주차)" instructional example is never mistaken for the real answer', () => {
  const r = matchEmail(baseEmail({ bodyText: ewaBody({ week: '5주차' }) }), CTX);
  assert.equal(r.status, 'matched');
  assert.equal(r.weekNo, 5);
});

test('a late-arriving email is linked by the body\'s stated week, not by when it arrived', () => {
  // received in week 3's date range, but the body says week 2
  const r = matchEmail(baseEmail({ receivedAt: '2026-09-24T03:00:00.000Z', bodyText: ewaBody({ week: '2주차' }) }), CTX);
  assert.equal(r.status, 'matched');
  assert.equal(r.weekNo, 2);
});

test('EAI resolves to the same course as EWA, never a separate one', () => {
  const r = matchEmail(baseEmail({ subject: '[EAI] 과제 제출 양식을 작성해 주셔서 감사합니다' }), CTX);
  assert.equal(r.status, 'matched');
  assert.equal(r.courseId, 'ewa');
});

test('an unverified course format goes to review instead of auto-confirming', () => {
  const r = matchEmail(baseEmail({
    subject: '[Beautiful Interface] 과제 제출 양식을 작성해 주셔서 감사합니다',
    bodyText: ewaBody().replace('[Engaging with AI]', '[Beautiful Interface]'),
  }), CTX);
  assert.equal(r.status, 'ambiguous');
  assert.equal(r.reason, 'unverified_format');
});

test('self-feedback never auto-confirms, even for EWA, until its format is verified', () => {
  const r = matchEmail(baseEmail({
    subject: '[Engaging with AI] 셀프피드백 제출 양식을 작성해 주셔서 감사합니다',
    bodyText: ewaBody().replace('과제 제출', '셀프피드백 제출'),
  }), CTX);
  assert.equal(r.status, 'ambiguous');
  assert.equal(r.reason, 'unverified_format');
});

test('mail from any other sender is unrelated, not just unmatched', () => {
  const r = matchEmail(baseEmail({ from: 'someone@example.com' }), CTX);
  assert.equal(r.status, 'unrelated');
});

test('a receipt from outside this cohort\'s date range does not bleed into it', () => {
  const r = matchEmail(baseEmail({ receivedAt: '2025-03-01T00:00:00.000Z' }), CTX);
  assert.equal(r.status, 'unrelated');
});

test('an unrecognized course tag is ambiguous, not silently dropped or guessed', () => {
  const r = matchEmail(baseEmail({
    subject: '[Some Other Course] 과제 제출 양식을 작성해 주셔서 감사합니다',
    bodyText: ewaBody().replace('[Engaging with AI]', '[Some Other Course]'),
  }), CTX);
  assert.equal(r.status, 'ambiguous');
  assert.equal(r.reason, 'unknown_course');
});

test('a body with no extractable week is ambiguous rather than defaulting to a week', () => {
  const body = ewaBody().replace(/답변: 2주차/, '답변: 곧 알려드리겠습니다');
  const r = matchEmail(baseEmail({ bodyText: body }), CTX);
  assert.equal(r.status, 'ambiguous');
  assert.equal(r.reason, 'no_week_found');
});
