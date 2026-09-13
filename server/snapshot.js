// The public, cumulative submission-status file that the weekly GitHub Actions
// sync (export-snapshot.js) writes and the deployed site reads (M3,
// docs/PRODUCT.md). Pure functions, no I/O.
//
// Cell values: "mail" = confirmed by a Forms receipt, "manual" = marked by hand
// (edit the file on GitHub), null = not confirmed (yet). "Not submitted" is
// never written — a late receipt can still fill a cell weeks later.
//
// PRIVACY (a promise made in design/privacy.html): this file is published on a
// public site, so it holds submission status only — never a message id,
// subject, link, received time or any mail content.
'use strict';
const { COURSE_SEED, COURSE_ALIASES, courseLinks, FIRST_WEEK, SEMESTER_WEEKS, SEMESTER_START, RECEIPTS_FROM } = require('./db');

const CELL_VALUES = new Set(['mail', 'manual']);

const coursesForMatching = () =>
  COURSE_SEED.map(([id, name, code]) => ({ id, name, code, aliases: JSON.stringify(COURSE_ALIASES[id] || []) }));

const codeOf = courseId => COURSE_SEED.find(c => c[0] === courseId)?.[2] || null;

// A complete grid (every week × course × kind) with the current course list and
// week range — built fresh, then any existing file's valid values are poured in.
// That way a hand-edited file with a typo, a missing course, or a newly added
// week can never break the page: unknown keys drop out, gaps become null.
function normalizeSnapshot(existing = {}) {
  const snap = {
    version: 1,
    about: 'Phi Brain Assignment Manage — 주차별 제출 상태. "mail"=확인메일로 확인, "manual"=직접 확인(이 파일에서 손으로 수정), null=미확인. 매주 일요일 23:59(KST) 자동 동기화가 갱신한다.',
    semesterStart: SEMESTER_START,
    firstWeek: FIRST_WEEK,
    lastWeek: SEMESTER_WEEKS,
    lastSyncedAt: typeof existing.lastSyncedAt === 'string' ? existing.lastSyncedAt : null,
    lastRunAt: typeof existing.lastRunAt === 'string' ? existing.lastRunAt : null,
    lastError: typeof existing.lastError === 'string' ? existing.lastError : null,
    courses: COURSE_SEED.map(([id, name, code]) => ({ id, code, name, ...courseLinks(id) })),
    weeks: {},
  };
  for (let w = FIRST_WEEK; w <= SEMESTER_WEEKS; w++) {
    snap.weeks[w] = {};
    for (const [, , code] of COURSE_SEED) {
      const old = existing.weeks?.[w]?.[code] || {};
      snap.weeks[w][code] = {
        assignment: CELL_VALUES.has(old.assignment) ? old.assignment : null,
        selfFeedback: CELL_VALUES.has(old.selfFeedback) ? old.selfFeedback : null,
      };
    }
  }
  return snap;
}

// a receipt always wins over a hand mark — it's the stronger evidence
function applyMatch(snap, { courseId, kind, weekNo }) {
  const cell = snap.weeks[weekNo]?.[codeOf(courseId)];
  const key = kind === 'self_feedback' ? 'selfFeedback' : 'assignment';
  if (!cell || !(key in cell)) return false;
  if (cell[key] === 'mail') return false;
  cell[key] = 'mail';
  return true;
}

// "전체 다시 계산": forget every mail-derived cell so receipts are re-judged by
// the current rules; hand marks ("manual") are never touched
function resetMailCells(snap) {
  for (const week of Object.values(snap.weeks))
    for (const cell of Object.values(week))
      for (const key of ['assignment', 'selfFeedback']) if (cell[key] === 'mail') cell[key] = null;
}

// Gmail `after:` — the full cohort window on a first/full run, otherwise from
// the last *successful* sync minus a day of overlap (a delayed or failed run
// never loses mail; re-reading a receipt just sets the same cell again).
function searchSince(snap, { full = false } = {}) {
  if (full || !snap.lastSyncedAt) return RECEIPTS_FROM.replace(/-/g, '/');
  return String(Math.floor(new Date(snap.lastSyncedAt).getTime() / 1000) - 24 * 3600);
}

// one line per course so a cell is easy to find and edit by hand on GitHub
function serialize(snap) {
  const { weeks, ...head } = snap;
  const headJson = JSON.stringify(head, null, 2).replace(/\n\}$/, '');
  const weeksJson = Object.keys(weeks).sort((a, b) => a - b).map(w =>
    `    "${w}": {\n${Object.entries(weeks[w]).map(([code, cell]) => `      ${JSON.stringify(code)}: ${JSON.stringify(cell)}`).join(',\n')}\n    }`).join(',\n');
  return `${headJson},\n  "weeks": {\n${weeksJson}\n  }\n}\n`;
}

module.exports = { normalizeSnapshot, applyMatch, resetMailCells, searchSince, serialize, coursesForMatching, codeOf };
