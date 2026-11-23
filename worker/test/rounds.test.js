// 회차(사용자 지시 2026-11-23): 주차는 그대로, 과제는 과목 회차로 — 한 주에 같은 과목 회차 여럿, 폼 회차 답으로 놓기
import test from 'node:test';
import assert from 'node:assert/strict';
import { testD1 } from './d1.js';
import { ingestEmail, getWeekMatrix, getTargetDetail, setManualStatus, targetIdFor, listReview, placeReview, dismissReview } from '../src/assignment/service.js';
import { saveNote, deleteNote } from '../src/assignment/notes.js';
import { roundKey, getRounds, setRounds, getRoundsWithUsed, roundPosition } from '../src/assignment/rounds.js';
import { extractRoundAnswer } from '../src/assignment/matching.js';
import { getTodo } from '../src/assignment/todo.js';
import { receipt } from './fixtures.js';

const kst = wall => new Date(Date.parse(`${wall}:00+09:00`)).toISOString();
const note = (raw, due, round) => ({ raw, dueAt: due, lateDueAt: null, dueManual: false, baseVersion: null, round });

test('roundKey: form answers and round names compare by prefix + number', () => {
  assert.equal(roundKey('Magazine 2회차 (B)'), 'magazine|2');
  assert.equal(roundKey('magazine 2회차'), 'magazine|2');
  assert.equal(roundKey('Fonts 3회차'), 'fonts|3');
  assert.equal(roundKey('11회차(Track B)'), '|11');
  assert.equal(roundKey('12주차'), '|12');
  assert.equal(roundKey('자세히'), null);
  assert.deepEqual(roundPosition(['Fonts 2회차', 'Fonts 8회차'], 'Fonts 3회차'), null);
  assert.deepEqual(roundPosition(['Fonts 2회차', 'Fonts 3회차', 'Fonts 8회차'], 'Fonts 3회차'), { n: 3, last: 8 });
});

test('extractRoundAnswer reads the whole answer line, not numbers in the description', () => {
  const body = w => `학번 *\n\n0000000 홍길동\n\n\n회차 *\n\nWarm-up 기간에는 0주차를, 매주 수업이 끝난 뒤에는 그 주차를 고르세요.\n\n${w}\n\n\n과제 링크 *\n\nhttps://example.com/x`;
  assert.equal(extractRoundAnswer(body('Magazine 2회차 (B)')), 'Magazine 2회차 (B)');
  assert.equal(extractRoundAnswer(body('11회차(Track B)')), '11회차(Track B)');
  assert.equal(extractRoundAnswer(body('12주차')), '12주차');
});

test('the migration seeds the remaining rounds the user listed; "+ 회차 추가" extends a list', async () => {
  const db = testD1();
  const r = await getRounds(db);
  assert.deepEqual(r.vt, ['Magazine 2회차', 'Magazine 3회차', 'Magazine 4회차', 'Magazine 5회차', 'Magazine 6회차']);
  assert.equal(r.tf.length, 7);
  assert.deepEqual(r.pc, ['12회차', '13회차', '14회차']);
  await setRounds(db, 'pc', [...r.pc, '15회차', ' 15회차 ']);
  assert.deepEqual((await getRounds(db)).pc, ['12회차', '13회차', '14회차', '15회차']);
});

test('two rounds of one course saved in the same week are two rows of that week', async () => {
  const db = testD1();
  assert.equal((await saveNote(db, 'tf', 12, note('Fonts 2 공지', '2026-11-24T23:59', 'Fonts 2회차'))).ok, true);
  assert.equal((await saveNote(db, 'tf', 12, note('Fonts 3 공지', '2026-11-27T23:59', 'Fonts 3회차'))).ok, true);
  const m = await getWeekMatrix(db, 12);
  const tf = m.rows.filter(r => r.courseId === 'tf');
  assert.deepEqual(tf.map(r => r.round), ['Fonts 2회차', 'Fonts 3회차']);
  assert.deepEqual(tf[1].roundPos, { n: 3, last: 8 });
  assert.equal(tf[0].note.raw, 'Fonts 2 공지');
  // courses without notes stay one plain row
  assert.deepEqual(m.rows.filter(r => r.courseId === 'al').map(r => r.round), ['']);
  assert.deepEqual((await getRoundsWithUsed(db)).used.tf, ['Fonts 2회차', 'Fonts 3회차']);
});

test('a receipt naming a round lands in the week where that round notice is saved, in that row only', async () => {
  const db = testD1();
  await saveNote(db, 'vt', 12, note('Magazine 2', '2026-11-25T23:59', 'Magazine 2회차'));
  await saveNote(db, 'vt', 12, note('Magazine 3', '2026-11-28T23:59', 'Magazine 3회차'));
  const r = await ingestEmail(db, receipt({ tag: 'Visual Translation', week: 'Magazine 3회차 (B)' }, { receivedAt: kst('2026-11-24T10:00'), messageId: 'vt-m3' }));
  assert.deepEqual([r.outcome, r.weekNo, r.round], ['matched', 12, 'Magazine 3회차']);
  const vt = (await getWeekMatrix(db, 12)).rows.filter(x => x.courseId === 'vt');
  assert.deepEqual(vt.map(x => [x.round, x.assignment.status]), [['Magazine 2회차', 'unconfirmed'], ['Magazine 3회차', 'confirmed_mail']]);
  const d = await getTargetDetail(db, vt[1].assignment.targetId, 'Magazine 3회차');
  assert.equal(d.evidence.length, 1);
  assert.equal((await getTargetDetail(db, vt[0].assignment.targetId, 'Magazine 2회차')).evidence.length, 0);
});

test('a listed round answer ("12회차") is not read as week 12; without its notice it waits in 확인 필요', async () => {
  const db = testD1();
  const r = await ingestEmail(db, receipt({ tag: 'Iterative Problem Solving', week: '12회차' }, { receivedAt: kst('2026-11-29T23:00'), messageId: 'ips-12' }));
  assert.equal(r.outcome, 'review');
  const [item] = await listReview(db);
  assert.deepEqual([item.courseId, item.kind, item.roundAnswer], ['ips', 'assignment', '12회차']);
  // 직접 놓기 → 그 주 · 회차의 확인메일
  await placeReview(db, 'ips-12', { courseId: 'ips', weekNo: 12, round: '12회차', kind: 'assignment' });
  assert.equal((await listReview(db)).length, 0);
  const row = (await getWeekMatrix(db, 12)).rows.find(x => x.courseId === 'ips');
  assert.deepEqual([row.round, row.assignment.status], ['12회차', 'confirmed_mail']);
});

test('확인 필요: an old queue row without course info is filled from the subject; dismiss removes it', async () => {
  const db = testD1();
  await db.prepare(`INSERT INTO review_queue (gmail_message_id, received_at, subject, reason, created_at) VALUES ('old-1', '2026-11-17T14:39:48.000Z', '[Typography as Foundation] 과제 제출 양식을 작성해 주셔서 감사합니다', 'no_week_found', 'x')`).run();
  const [item] = await listReview(db);
  assert.deepEqual([item.courseId, item.kind], ['tf', 'assignment']);
  assert.equal((await dismissReview(db, 'old-1')).deleted, true);
  assert.equal((await listReview(db)).length, 0);
});

test('labelling a plain row with a round carries its mails and manual marks along; a taken round is refused', async () => {
  const db = testD1();
  await saveNote(db, 'iae', 12, note('IAE 공지', '2026-11-30T23:59', ''));
  await ingestEmail(db, receipt({ tag: 'Interviewing as Exploration', week: '12주차' }, { receivedAt: kst('2026-11-29T20:00'), messageId: 'iae-a' }));
  const sf = await targetIdFor(db, 'iae', 12, 'self_feedback');
  await setManualStatus(db, sf, 'confirmed_manual', { round: '' });
  const r = await saveNote(db, 'iae', 12, { ...note('IAE 공지', '2026-11-30T23:59', '3회차'), fromRound: '', baseVersion: 1 });
  assert.equal(r.ok, true);
  const rows = (await getWeekMatrix(db, 12)).rows.filter(x => x.courseId === 'iae');
  assert.deepEqual(rows.map(x => [x.round, x.assignment.status, x.selfFeedback.status]), [['3회차', 'confirmed_mail', 'confirmed_manual']]);
  await saveNote(db, 'iae', 12, note('IAE 4', '2026-12-02T23:59', '4회차'));
  const clash = await saveNote(db, 'iae', 12, { ...note('x', null, '3회차'), fromRound: '4회차', baseVersion: 1 });
  assert.equal(clash.roundTaken, true);
  assert.equal((await deleteNote(db, 'iae', 12, { baseVersion: 1, round: '4회차' })).deleted, true);
});

test('TO-DO lists each round of a week separately, with its own status', async () => {
  const db = testD1();
  await saveNote(db, 'tf', 12, note('Fonts 2', '2026-11-24T23:59', 'Fonts 2회차'));
  await saveNote(db, 'tf', 12, note('Fonts 3', '2026-11-27T23:59', 'Fonts 3회차'));
  await ingestEmail(db, receipt({ tag: 'Typography as Foundation', week: 'Fonts 2회차' }, { receivedAt: kst('2026-11-24T20:00'), messageId: 'tf-2' }));
  const items = (await getTodo(db, Date.parse('2026-11-25T00:00:00+09:00'))).items.filter(i => i.courseId === 'tf' && i.kind === 'assignment');
  assert.deepEqual(items.map(i => [i.key, i.round, i.status]).sort(), [['tf:12:a:fonts2', 'Fonts 2회차', 'confirmed_mail'], ['tf:12:a:fonts3', 'Fonts 3회차', 'unconfirmed']]);
});
