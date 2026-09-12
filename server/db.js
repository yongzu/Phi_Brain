// SQLite storage for Assignment Manage. Uses Node's built-in node:sqlite —
// no native module build, no npm dependency.
'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const SEMESTER_START = '2026-09-06';
const SEMESTER_WEEKS = 16;
const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const SEMESTER_END = addDays(SEMESTER_START, SEMESTER_WEEKS * 7 - 1);

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
    insertCourse.run(
      id, name, code, JSON.stringify(COURSE_ALIASES[id] || []),
      `https://go.phi.design/${id}/board`,
      `https://go.phi.design/${id}/assignment`,
      `https://go.phi.design/${id}/self-feedback`
    );
  }

  // Week 1 (09.06~09.12) matches the reference wireframe's example exactly, and
  // design/prototypes' "today" (2026-09-12) lands right on its last day — this is
  // the real current cohort's week 1, not a guess. Extend SEMESTER_WEEKS if the
  // cohort runs longer; nothing else needs to change.
  const insertWeek = db.prepare(`
    INSERT INTO weeks (week_no, start_date, end_date) VALUES (?, ?, ?)
    ON CONFLICT(week_no) DO UPDATE SET start_date=excluded.start_date, end_date=excluded.end_date
  `);
  for (let w = 1; w <= SEMESTER_WEEKS; w++) {
    const start = addDays(SEMESTER_START, (w - 1) * 7);
    const end = addDays(start, 6);
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

module.exports = { openDb, getDb, COURSE_ALIASES, SEMESTER_START, SEMESTER_END, SEMESTER_WEEKS };
