-- 온라인 전환 2단계: Assignment Manage on D1.
-- Same tables as server/db.js, plus the sync bookkeeping a Worker needs
-- (batched runs, seen message ids) and the Gmail refresh token stored encrypted.
-- Apply: cd worker && npx wrangler@4.131.1 d1 migrations apply phi-brain --remote

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]',
  board_url TEXT,
  assignment_url TEXT,
  self_feedback_url TEXT
);

-- week_no = the forms' own "주차" answer (0~16). Dates are an approximation used
-- only to pick the week to open by default (see src/assignment/constants.js).
CREATE TABLE weeks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_no INTEGER NOT NULL UNIQUE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL
);

CREATE TABLE submission_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL REFERENCES courses(id),
  week_id INTEGER NOT NULL REFERENCES weeks(id),
  kind TEXT NOT NULL CHECK (kind IN ('assignment','self_feedback')),
  UNIQUE(course_id, week_id, kind)
);

CREATE TABLE submission_evidence (
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
CREATE INDEX submission_evidence_target ON submission_evidence(target_id);

CREATE TABLE manual_status (
  target_id INTEGER PRIMARY KEY REFERENCES submission_targets(id),
  status TEXT NOT NULL CHECK (status IN ('confirmed_manual','not_applicable')),
  updated_at TEXT NOT NULL
);

CREATE TABLE review_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gmail_message_id TEXT NOT NULL UNIQUE,
  gmail_thread_id TEXT,
  received_at TEXT NOT NULL,
  subject TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- every Forms-sender message id a sync has already judged (any outcome), so a
-- run split into batches never fetches the same message twice. Id only.
CREATE TABLE gmail_seen (
  gmail_message_id TEXT PRIMARY KEY,
  seen_at TEXT NOT NULL
);

-- singleton: Gmail connection + sync state.
--   refresh_token_enc  AES-GCM ciphertext (key: TOKEN_KEY secret), never plaintext
--   sync_since         Gmail after: (unix seconds) fixed for the run in progress
--   sync_pending       1 while a run still has unfetched messages (continued by the next call/cron)
CREATE TABLE gmail_connection (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  connected INTEGER NOT NULL DEFAULT 0,
  email TEXT,
  refresh_token_enc TEXT,
  last_sync_at TEXT,
  last_run_at TEXT,
  last_sync_error TEXT,
  sync_since INTEGER,
  sync_pending INTEGER NOT NULL DEFAULT 0
);
INSERT INTO gmail_connection (id, connected) VALUES (1, 0);

-- ---- seed: 12 courses (server/db.js COURSE_SEED), weeks 0~16, 2 targets each ----
-- (multi-row VALUES, not UNION ALL — D1 caps the number of terms in a compound SELECT)
INSERT INTO courses (id, name, code, aliases) VALUES
  ('al', 'Aesthetic Literacy', 'AL', '[]'),
  ('aor', 'Art of Reading', 'AOR', '[]'),
  ('bi', 'Beautiful Interface', 'BI', '[]'),
  ('ewa', 'Engaging with AI', 'EWA', '["eai"]'),
  ('iae', 'Interviewing as Exploration', 'IAE', '[]'),
  ('ips', 'Iterative Problem Solving', 'IPS', '[]'),
  ('pc', 'Peer Coaching', 'PC', '[]'),
  ('rw', 'Readable Writing', 'RW', '[]'),
  ('si', 'Self Introduction', 'SI', '[]'),
  ('tf', 'Typography as Foundation', 'TF', '[]'),
  ('vt', 'Visual Translation', 'VT', '[]'),
  ('wi', 'What If', 'WI', '[]');
UPDATE courses SET
  board_url = 'https://go.phi.design/' || id || '/board',
  assignment_url = 'https://go.phi.design/' || id || '/assignment',
  self_feedback_url = 'https://go.phi.design/' || id || '/self-feedback';

-- 1주차 starts 2026-09-07 (SEMESTER_START); week n starts (n-1)*7 days after it
WITH RECURSIVE n(week_no) AS (SELECT 0 UNION ALL SELECT week_no + 1 FROM n WHERE week_no < 16)
INSERT INTO weeks (week_no, start_date, end_date)
SELECT week_no,
  date('2026-09-07', ((week_no - 1) * 7) || ' days'),
  date('2026-09-07', ((week_no - 1) * 7 + 6) || ' days')
FROM n;

INSERT INTO submission_targets (course_id, week_id, kind)
SELECT c.id, w.id, k.kind
FROM courses c, weeks w, (SELECT column1 AS kind FROM (VALUES ('assignment'), ('self_feedback'))) k;
