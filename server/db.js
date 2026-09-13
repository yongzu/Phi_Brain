// SQLite storage for Assignment Manage. Uses Node's built-in node:sqlite —
// no native module build, no npm dependency.
'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Weeks are the forms' own "주차" answers, 0~16 (0 = Warm-up, 16 = 코스 말미 —
// wording from the self-feedback form) — user decision 2026-09-14, after the
// real receipts showed courses running on different week numbers at the same
// calendar time (EWA "2주차" on 09.11 while AL/IPS were on "1주차" on 09.13).
// The table is keyed by these numbers only; the dates stored per week are an
// approximation used solely to pick which week to open by default.
const SEMESTER_START = '2026-09-07'; // approx. start of 1주차
const FIRST_WEEK = 0;
const SEMESTER_WEEKS = 16;           // last week number
const WEEK_LENGTH_DAYS = 7;
const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const SEMESTER_END = addDays(SEMESTER_START, SEMESTER_WEEKS * WEEK_LENGTH_DAYS - 1);
// Which received dates count as this cohort's receipts at all. Real 0주차
// receipts started arriving 09.01 (before SEMESTER_START), and courses that run
// behind can still be submitting after SEMESTER_END — so the window is padded
// on both sides. This is the first cohort (1기), so no earlier cohort's mail
// can be mistaken for this one's.
const RECEIPTS_FROM = addDays(SEMESTER_START, -21);
const RECEIPTS_UNTIL = addDays(SEMESTER_END, 42);

const COURSE_SEED = [
  ['al', 'Aesthetic Literacy', 'AL'],
  ['aor', 'Art of Reading', 'AOR'],
  ['bi', 'Beautiful Interface', 'BI'],
  ['ewa', 'Engaging with AI', 'EWA'],
  ['iae', 'Interviewing as Exploration', 'IAE'],
  ['ips', 'Iterative Problem Solving', 'IPS'],
  ['pc', 'Peer Coaching', 'PC'],
  ['rw', 'Readable Writing', 'RW'],
  ['si', 'Self Introduction', 'SI'],
  ['tf', 'Typography as Foundation', 'TF'],
  ['vt', 'Visual Translation', 'VT'],
  ['wi', 'What If', 'WI'],
];
// other spellings resolve to the same course id — never create a separate course for them
const COURSE_ALIASES = { ewa: ['eai'] };
// board / submission-form shortcuts — shared by the DB seed and the public status file (snapshot.js)
const courseLinks = id => ({
  boardUrl: `https://go.phi.design/${id}/board`,
  assignmentUrl: `https://go.phi.design/${id}/assignment`,
  selfFeedbackUrl: `https://go.phi.design/${id}/self-feedback`,
});

function openDb(dbPath) {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]',
  board_url TEXT,
  assignment_url TEXT,
  self_feedback_url TEXT
);

CREATE TABLE IF NOT EXISTS weeks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_no INTEGER NOT NULL UNIQUE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL
);

-- one row per (course, week, kind) — the thing a student is expected to submit
CREATE TABLE IF NOT EXISTS submission_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL REFERENCES courses(id),
  week_id INTEGER NOT NULL REFERENCES weeks(id),
  kind TEXT NOT NULL CHECK (kind IN ('assignment','self_feedback')),
  UNIQUE(course_id, week_id, kind)
);

-- one row per matched confirmation email (kept as history; resubmission = new row)
CREATE TABLE IF NOT EXISTS submission_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_id INTEGER NOT NULL REFERENCES submission_targets(id),
  gmail_message_id TEXT NOT NULL UNIQUE,
  gmail_thread_id TEXT,
  track TEXT,
  received_at TEXT NOT NULL,
  subject TEXT,
  links_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

-- manual override per target — never overwrites/deletes evidence rows
CREATE TABLE IF NOT EXISTS manual_status (
  target_id INTEGER PRIMARY KEY REFERENCES submission_targets(id),
  status TEXT NOT NULL CHECK (status IN ('confirmed_manual','not_applicable')),
  updated_at TEXT NOT NULL
);

-- messages that matched a course/sender but couldn't be auto-resolved
-- (ambiguous course/week/kind, or an unverified self-feedback format)
CREATE TABLE IF NOT EXISTS review_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gmail_message_id TEXT NOT NULL UNIQUE,
  gmail_thread_id TEXT,
  received_at TEXT NOT NULL,
  subject TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- singleton row: Gmail OAuth connection state
CREATE TABLE IF NOT EXISTS gmail_connection (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  connected INTEGER NOT NULL DEFAULT 0,
  email TEXT,
  refresh_token TEXT,
  access_token TEXT,
  token_expiry TEXT,
  last_sync_at TEXT,
  last_sync_error TEXT,
  history_id TEXT
);
`);

  const insertCourse = db.prepare(`
    INSERT INTO courses (id, name, code, aliases, board_url, assignment_url, self_feedback_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, code=excluded.code, aliases=excluded.aliases,
      board_url=excluded.board_url, assignment_url=excluded.assignment_url, self_feedback_url=excluded.self_feedback_url
  `);
  for (const [id, name, code] of COURSE_SEED) {
    const links = courseLinks(id);
    insertCourse.run(id, name, code, JSON.stringify(COURSE_ALIASES[id] || []), links.boardUrl, links.assignmentUrl, links.selfFeedbackUrl);
  }

  // 0주차 ~ 16주차. Dates are approximate (see SEMESTER_START above) — extend
  // SEMESTER_WEEKS if the cohort runs longer; nothing else needs to change.
  const insertWeek = db.prepare(`
    INSERT INTO weeks (week_no, start_date, end_date) VALUES (?, ?, ?)
    ON CONFLICT(week_no) DO UPDATE SET start_date=excluded.start_date, end_date=excluded.end_date
  `);
  for (let w = FIRST_WEEK; w <= SEMESTER_WEEKS; w++) {
    const start = addDays(SEMESTER_START, (w - 1) * WEEK_LENGTH_DAYS);
    const end = addDays(start, WEEK_LENGTH_DAYS - 1);
    insertWeek.run(w, start, end);
  }

  // one assignment + one self-feedback target per course per week. Single-item-
  // per-(course,week,kind) is an explicit, documented assumption (PRODUCT.md) —
  // the schema's UNIQUE constraint is what would need to change if a course
  // ever has more than one assignment in the same week.
  const courseIds = db.prepare('SELECT id FROM courses').all().map(r => r.id);
  const weekIds = db.prepare('SELECT id FROM weeks').all().map(r => r.id);
  const insertTarget = db.prepare(`
    INSERT OR IGNORE INTO submission_targets (course_id, week_id, kind) VALUES (?, ?, ?)
  `);
  for (const courseId of courseIds) {
    for (const weekId of weekIds) {
      insertTarget.run(courseId, weekId, 'assignment');
      insertTarget.run(courseId, weekId, 'self_feedback');
    }
  }

  db.prepare(`INSERT OR IGNORE INTO gmail_connection (id, connected) VALUES (1, 0)`).run();

  return db;
}

let defaultDb = null;
function getDb() {
  if (!defaultDb) {
    const dataDir = path.join(__dirname, 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    defaultDb = openDb(path.join(dataDir, 'assignment-manage.sqlite'));
  }
  return defaultDb;
}

module.exports = { openDb, getDb, COURSE_SEED, COURSE_ALIASES, courseLinks, SEMESTER_START, SEMESTER_END, SEMESTER_WEEKS, FIRST_WEEK, RECEIPTS_FROM, RECEIPTS_UNTIL };
