import test from 'node:test';
import assert from 'node:assert/strict';
import { matchEmail, extractWeekNo } from '../src/assignment/matching.js';
import { receipt, SELF_FEEDBACK_WEEK_DESCRIPTION } from './fixtures.js';

// port of server/matching.test.js

const COURSES = [
  ['al', 'Aesthetic Literacy', 'AL'], ['ewa', 'Engaging with AI', 'EWA'], ['ips', 'Iterative Problem Solving', 'IPS'],
  ['si', 'Self Introduction', 'SI'], ['vt', 'Visual Translation', 'VT'], ['iae', 'Interviewing as Exploration', 'IAE'],
].map(([id, name, code]) => ({ id, name, code, aliases: JSON.stringify(id === 'ewa' ? ['eai'] : []) }));
const CTX = { courses: COURSES, windowStart: '2026-08-17', windowEnd: '2027-02-06' };

test('subject alone identifies course (full name) + kind, week comes from the 주차 answer', () => {
  const r = matchEmail(receipt(), CTX);
  assert.equal(r.status, 'matched');
  assert.equal(r.courseId, 'ips');
  assert.equal(r.kind, 'assignment');
  assert.equal(r.weekNo, 1);
});

test('a course code tag works the same as the full name', () => {
  const r = matchEmail(receipt({ tag: 'AL' }), CTX);
  assert.equal(r.courseId, 'al');
});

test('every course/kind auto-matches now — no per-course verified-format gate', () => {
  const r = matchEmail(receipt({ tag: 'IAE', kind: '셀프피드백', weekDescription: SELF_FEEDBACK_WEEK_DESCRIPTION, week: '0주차' }), CTX);
  assert.equal(r.status, 'matched');
  assert.equal(r.courseId, 'iae');
  assert.equal(r.kind, 'self_feedback');
});

test('"[Self-Introduction]" resolves to the registered "Self Introduction" (punctuation ignored)', () => {
  const r = matchEmail(receipt({ tag: 'Self-Introduction', week: '0주차' }), CTX);
  assert.equal(r.status, 'matched');
  assert.equal(r.courseId, 'si');
});

test('EAI resolves to the same course as EWA', () => {
  assert.equal(matchEmail(receipt({ tag: 'EAI' }), CTX).courseId, 'ewa');
});

test('week numbers mentioned in the question description are never taken as the answer', () => {
  const r = matchEmail(receipt({ tag: 'EWA', kind: '셀프피드백', weekDescription: SELF_FEEDBACK_WEEK_DESCRIPTION, week: '2주차' }), CTX);
  assert.equal(r.weekNo, 2);
});

test('a dropdown label before the week ("Image 0주차", "Typesetting 0주차") still reads as the week', () => {
  assert.equal(matchEmail(receipt({ tag: 'Visual Translation', week: 'Image 0주차' }), CTX).weekNo, 0);
  assert.equal(extractWeekNo('주차 *\n\n설명\n\n\nTypesetting 3주차\n'), 3);
});

test('week 0 (Warm-up) is a real week, not "no week"', () => {
  const r = matchEmail(receipt({ week: '0주차' }), CTX);
  assert.equal(r.status, 'matched');
  assert.equal(r.weekNo, 0);
});

test('a late receipt is linked by the answered week, not the received date', () => {
  const r = matchEmail(receipt({ week: '1주차' }, { receivedAt: '2026-10-20T03:00:00.000Z' }), CTX);
  assert.equal(r.weekNo, 1);
});

test('links are taken from each question\'s answer line only, never from a description URL', () => {
  const r = matchEmail(receipt(), CTX);
  assert.deepEqual(r.links, {
    '1 Pager docs ver.': 'https://docs.google.com/document/d/example-doc',
    '프로토타입 링크': 'https://www.youtube.com/watch?v=example',
  });
  assert.equal(r.track, null); // radio receipts list every option — track is unreadable, so not guessed
});

test('a bracketed Google Form that is not a 과제/셀프피드백 submission is unrelated, not queued', () => {
  const email = receipt({}, { subject: '[Phi] 1year-program_1기_환급 계좌 정보 요청 양식을 작성해 주셔서 감사합니다', bodyText: '[Phi] 환급 계좌 정보 요청\n' });
  assert.equal(matchEmail(email, CTX).status, 'unrelated');
});

test('an unrecognized course tag is ambiguous, not silently dropped or guessed', () => {
  const r = matchEmail(receipt({ tag: 'Some Other Course' }), CTX);
  assert.equal(r.status, 'ambiguous');
  assert.equal(r.reason, 'unknown_course');
});

test('no readable 주차 answer is ambiguous rather than defaulting to a week', () => {
  const r = matchEmail(receipt({ week: '곧 알려드리겠습니다' }), CTX);
  assert.equal(r.status, 'ambiguous');
  assert.equal(r.reason, 'no_week_found');
});

test('the subject decides; the body title line is only a fallback', () => {
  const email = receipt({ tag: 'AL' }, { subject: 'Fwd: 제출 확인' });
  assert.equal(matchEmail(email, CTX).courseId, 'al');
});

test('mail from any other sender is unrelated', () => {
  assert.equal(matchEmail(receipt({}, { from: 'someone@example.com' }), CTX).status, 'unrelated');
});

test('a receipt from outside this cohort\'s window does not bleed into it', () => {
  assert.equal(matchEmail(receipt({}, { receivedAt: '2025-03-01T00:00:00.000Z' }), CTX).status, 'unrelated');
});
