// port of server/service.test.js onto D1 (test/d1.js runs the real migration)
import test from 'node:test';
import assert from 'node:assert/strict';
import { testD1 } from './d1.js';
import { ingestEmail, getWeekMatrix, getTargetDetail, setManualStatus, targetIdFor, getWeeks, currentWeekNo } from '../src/assignment/service.js';
import { receipt } from './fixtures.js';

const email = (overrides = {}) => receipt({ tag: 'Engaging with AI', week: '2주차' },
  { receivedAt: '2026-09-19T03:00:00.000Z', messageId: 'm-1', threadId: 't-1', ...overrides });

test('the migration seeds 12 courses × weeks 0~16 × 2 kinds, with week dates matching server/db.js', async () => {
  const db = testD1();
  assert.equal((await db.prepare('SELECT count(*) c FROM courses').first()).c, 12);
  assert.equal((await db.prepare('SELECT count(*) c FROM submission_targets').first()).c, 12 * 17 * 2);
  const weeks = await getWeeks(db);
  assert.deepEqual([weeks[0].week_no, weeks[0].start_date, weeks[0].end_date], [0, '2026-08-31', '2026-09-06']);
  assert.deepEqual([weeks[1].start_date, weeks[16].end_date], ['2026-09-07', '2026-12-27']);
  assert.equal((await db.prepare(`SELECT board_url FROM courses WHERE id = 'bi'`).first()).board_url, 'https://go.phi.design/bi/board');
  // TF·VT는 Figma 보드 직접 링크(0006·0009 마이그레이션, 사용자 지시 2026-09-17 · 2026-10-01)
  assert.equal((await db.prepare(`SELECT board_url FROM courses WHERE id = 'tf'`).first()).board_url, 'https://www.figma.com/board/rqI2rIYxv8BOimYbzT9FDn/-1%EA%B8%B0-B--Typography-as-Foundation');
  assert.equal((await db.prepare(`SELECT board_url FROM courses WHERE id = 'vt'`).first()).board_url, 'https://www.figma.com/board/eAeCinqhdU8SMb0aEi8MRM/-1%EA%B8%B0-B--Visual-Translation');
  assert.equal(currentWeekNo(weeks, '2026-09-14'), 2);
  assert.equal(currentWeekNo(weeks, '2026-01-01'), 0);
  assert.equal(currentWeekNo(weeks, '2027-06-01'), 16);
});

test('a matched email flips the target from unconfirmed to confirmed_mail', async () => {
  const db = testD1();
  const targetId = await targetIdFor(db, 'ewa', 2, 'assignment');
  assert.equal((await getTargetDetail(db, targetId)).status, 'unconfirmed');
  assert.equal((await ingestEmail(db, email())).outcome, 'matched');
  assert.equal((await getTargetDetail(db, targetId)).status, 'confirmed_mail');
});

test('the same Gmail message id is never ingested twice', async () => {
  const db = testD1();
  const targetId = await targetIdFor(db, 'ewa', 2, 'assignment');
  await ingestEmail(db, email());
  assert.equal((await ingestEmail(db, email())).outcome, 'duplicate');
  assert.equal((await getTargetDetail(db, targetId)).evidence.length, 1);
});

test('a resubmission (different message id, same target) is kept as history, not a replacement', async () => {
  const db = testD1();
  const targetId = await targetIdFor(db, 'ewa', 2, 'assignment');
  await ingestEmail(db, email({ messageId: 'm-1' }));
  await ingestEmail(db, email({ messageId: 'm-2', receivedAt: '2026-09-20T03:00:00.000Z' }));
  const detail = await getTargetDetail(db, targetId);
  assert.deepEqual(detail.evidence.map(e => e.gmail_message_id), ['m-1', 'm-2']);
  assert.deepEqual(detail.evidence[0].links, {
    '1 Pager docs ver.': 'https://docs.google.com/document/d/example-doc',
    '프로토타입 링크': 'https://www.youtube.com/watch?v=example',
  });
});

test('setting "해당 없음" over an existing confirmation mail is a conflict, not silently applied', async () => {
  const db = testD1();
  const targetId = await targetIdFor(db, 'ewa', 2, 'assignment');
  await ingestEmail(db, email());
  const r = await setManualStatus(db, targetId, 'not_applicable');
  assert.equal(r.ok, false);
  assert.equal(r.conflict, true);
  assert.equal((await getTargetDetail(db, targetId)).status, 'confirmed_mail');
});

test('forcing "해당 없음" past a conflict still keeps the mail evidence (surfaced as conflict, not erased)', async () => {
  const db = testD1();
  const targetId = await targetIdFor(db, 'ewa', 2, 'assignment');
  await ingestEmail(db, email());
  assert.equal((await setManualStatus(db, targetId, 'not_applicable', { force: true })).ok, true);
  const detail = await getTargetDetail(db, targetId);
  assert.equal(detail.status, 'conflict');
  assert.equal(detail.evidence.length, 1);
});

test('manual "직접 확인" counts toward progress; "해당 없음" is excluded from the denominator; clear undoes it', async () => {
  const db = testD1();
  const assignmentId = await targetIdFor(db, 'ewa', 2, 'assignment');
  const sfId = await targetIdFor(db, 'ewa', 2, 'self_feedback');
  await setManualStatus(db, assignmentId, 'confirmed_manual');
  await setManualStatus(db, sfId, 'not_applicable');
  const matrix = await getWeekMatrix(db, 2);
  assert.equal(matrix.rows.length, 12);
  assert.deepEqual(matrix.rows.map(r => r.code).slice(0, 3), ['AL', 'AOR', 'BI']);
  const ewa = matrix.rows.find(r => r.courseId === 'ewa');
  assert.equal(ewa.assignment.status, 'confirmed_manual');
  assert.equal(ewa.assignment.targetId, assignmentId);
  assert.equal(ewa.assignment.url, 'https://go.phi.design/ewa/assignment');
  assert.equal(ewa.selfFeedback.status, 'not_applicable');
  assert.deepEqual(matrix.progress, { done: 1, total: 12 * 2 - 1 });

  assert.deepEqual(await setManualStatus(db, sfId, 'clear'), { ok: true, status: 'unconfirmed' });
  assert.deepEqual((await getWeekMatrix(db, 2)).progress, { done: 1, total: 24 });
});

test('bad input to the manual endpoint is refused, not written', async () => {
  const db = testD1();
  assert.equal((await setManualStatus(db, 1, 'delete_everything')).error, 'bad_action');
  assert.equal((await setManualStatus(db, 999999, 'confirmed_manual')).error, 'target_not_found');
  assert.equal(await getWeekMatrix(db, 99), null);
  assert.equal(await getTargetDetail(db, 999999), null);
});

test('a mail for an unrecognized course goes to review (once), leaving the matrix unconfirmed', async () => {
  const db = testD1();
  const unknown = receipt({ tag: 'Unknown Course', week: '2주차' }, { messageId: 'm-3' });
  assert.equal((await ingestEmail(db, unknown)).outcome, 'review');
  assert.equal((await ingestEmail(db, unknown)).outcome, 'duplicate');
  assert.equal((await getTargetDetail(db, await targetIdFor(db, 'ewa', 2, 'assignment'))).status, 'unconfirmed');
});

test('week 0 (Warm-up) exists as a table week and receives submissions', async () => {
  const db = testD1();
  const r = await ingestEmail(db, receipt({ tag: 'Beautiful Interface', week: '0주차' }, { messageId: 'm-w0', receivedAt: '2026-09-03T12:52:53.000Z' }));
  assert.equal(r.outcome, 'matched');
  assert.equal((await getWeekMatrix(db, 0)).rows.find(x => x.courseId === 'bi').assignment.status, 'confirmed_mail');
});

test('a message parked in review under older rules leaves the review queue once it matches', async () => {
  const db = testD1();
  db.raw.exec(`INSERT INTO review_queue (gmail_message_id, received_at, subject, reason, created_at) VALUES ('m-old', '2026-09-07', 's', 'unverified_format', '2026-09-07')`);
  await ingestEmail(db, email({ messageId: 'm-old' }));
  assert.equal((await db.prepare(`SELECT count(*) c FROM review_queue WHERE gmail_message_id = 'm-old'`).first()).c, 0);
});

// 지각 제출 판정(사용자 지시 2026-09-16)은 화면이 하지만, 견줄 시각은 여기서 내려준다:
// 그 칸의 첫 확인메일 수신 시각. 재제출이 있어도 처음 낸 때가 기준이다.
test('the week matrix carries each confirmed cell\'s first receipt time', async () => {
  const db = testD1();
  const targetId = await targetIdFor(db, 'ewa', 2, 'assignment');
  await ingestEmail(db, email({ receivedAt: '2026-09-19T03:00:00.000Z', messageId: 'm-late' }));
  await ingestEmail(db, email({ receivedAt: '2026-09-20T05:00:00.000Z', messageId: 'm-again' }));
  const ewa = (await getWeekMatrix(db, 2)).rows.find(r => r.courseId === 'ewa');
  assert.equal(ewa.assignment.targetId, targetId);
  assert.equal(ewa.assignment.status, 'confirmed_mail');
  assert.equal(ewa.assignment.confirmedAt, '2026-09-19T03:00:00.000Z');
  assert.equal(ewa.selfFeedback.confirmedAt, null); // 확인메일이 없는 칸은 null
});

// ── 공지 마감으로 주차 정하기 (사용자 지시 2026-11-23) ──
import { weekByDeadline } from '../src/assignment/service.js';

const note = (week_no, due_at, late_due_at = null) => ({ week_no, due_at, late_due_at });
const kst = wall => new Date(Date.parse(`${wall}:00+09:00`)).toISOString();

test('weekByDeadline: on time → the week whose pasted notice is due next', () => {
  const notes = [note(10, '2026-11-09T23:59'), note(11, '2026-11-16T23:59')];
  assert.equal(weekByDeadline(notes, kst('2026-11-09T20:00')), 10);
  assert.equal(weekByDeadline(notes, kst('2026-11-14T10:00')), 11);
});

test('weekByDeadline: just after a due → late for that week unless it was already submitted', () => {
  const notes = [note(10, '2026-11-09T23:59'), note(11, '2026-11-16T23:59')];
  assert.equal(weekByDeadline(notes, kst('2026-11-10T09:00')), 10);
  assert.equal(weekByDeadline(notes, kst('2026-11-10T09:00'), { submittedWeeks: new Set([10]) }), 11);
  // a form number that names one of the two candidates decides
  assert.equal(weekByDeadline(notes, kst('2026-11-10T09:00'), { formWeek: 11 }), 11);
});

test('weekByDeadline: an explicit 지각 마감 widens the late window; no notice nearby → null', () => {
  const notes = [note(7, '2026-10-25T23:59', '2026-10-28T23:59')];
  assert.equal(weekByDeadline(notes, kst('2026-10-28T20:00')), 7);
  assert.equal(weekByDeadline(notes, kst('2026-10-29T20:00')), null);
  assert.equal(weekByDeadline([note(7, '2026-12-20T23:59')], kst('2026-10-29T20:00')), null); // due too far ahead
  assert.equal(weekByDeadline([note(7, null)], kst('2026-10-25T20:00')), null);
});

test('a course-relative form week ("1주차" of a course that began in week 10) lands in the week of the pasted notice', async () => {
  const db = testD1();
  await db.prepare(`INSERT INTO assignment_notes (course_id, week_no, raw, due_at, updated_at) VALUES ('iae', 10, '1주차 과제', '2026-11-09T23:59', 'x'), ('iae', 11, '2주차 과제', '2026-11-16T23:59', 'x')`).run();
  const r = await ingestEmail(db, receipt({ tag: 'Interviewing as Exploration', week: '1주차' }, { receivedAt: kst('2026-11-09T21:00'), messageId: 'iae-1' }));
  assert.equal(r.outcome, 'matched');
  assert.equal(r.weekNo, 10);
  assert.equal((await getTargetDetail(db, await targetIdFor(db, 'iae', 1, 'assignment'))).status, 'unconfirmed');
});

test('a receipt whose week answer cannot be read ("Graphic 2회차 (B)") is placed by the notice deadline instead of review', async () => {
  const db = testD1();
  await db.prepare(`INSERT INTO assignment_notes (course_id, week_no, raw, due_at, updated_at) VALUES ('vt', 11, 'Project 3', '2026-11-17T23:59', 'x')`).run();
  const r = await ingestEmail(db, receipt({ tag: 'Visual Translation', week: 'Graphic 2회차 (B)' }, { receivedAt: kst('2026-11-17T23:56'), messageId: 'vt-1' }));
  assert.equal(r.outcome, 'matched');
  assert.equal(r.weekNo, 11);
  // without a notice it still goes to review, as before
  const r2 = await ingestEmail(db, receipt({ tag: 'Typography as Foundation', week: 'Graphic 2회차 (B)' }, { receivedAt: kst('2026-11-17T23:56'), messageId: 'tf-1' }));
  assert.equal(r2.outcome, 'review');
});

test('a form week that fits the received date is kept even when a notice deadline would point elsewhere', async () => {
  const db = testD1();
  await db.prepare(`INSERT INTO assignment_notes (course_id, week_no, raw, due_at, updated_at) VALUES ('si', 11, '앱', '2026-11-15T23:59', 'x')`).run();
  const r = await ingestEmail(db, receipt({ tag: 'Self-Introduction', week: '9주차' }, { receivedAt: kst('2026-11-08T23:59'), messageId: 'si-9' }));
  assert.equal(r.weekNo, 9);
});

test('a form week far from the received date with no notice to go by goes to review, not to a September cell', async () => {
  const db = testD1();
  const r = await ingestEmail(db, receipt({ tag: 'Interviewing as Exploration', week: '1주차' }, { receivedAt: kst('2026-11-09T21:00'), messageId: 'iae-x' }));
  assert.deepEqual([r.outcome, r.reason], ['review', 'week_not_in_date']);
  assert.equal((await db.prepare(`SELECT reason FROM review_queue WHERE gmail_message_id = 'iae-x'`).first()).reason, 'week_not_in_date');
});
