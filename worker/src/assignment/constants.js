// Cohort constants for Assignment Manage — same values as server/db.js.
// The weeks/courses themselves are seeded by migrations/0001_assignment_manage.sql;
// change both together.
const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const SEMESTER_START = '2026-09-07'; // approx. start of 1주차
export const FIRST_WEEK = 0;
export const SEMESTER_WEEKS = 16;
export const SEMESTER_END = addDays(SEMESTER_START, SEMESTER_WEEKS * 7 - 1);
// which received dates count as this cohort's receipts at all (padded both sides, see server/db.js)
export const RECEIPTS_FROM = addDays(SEMESTER_START, -21);
export const RECEIPTS_UNTIL = addDays(SEMESTER_END, 42);
