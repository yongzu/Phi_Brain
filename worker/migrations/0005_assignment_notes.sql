-- 2026-09-14 사용자 요구사항: Assignment Manage 과제 공지 붙여넣기 · 마감 표시.
-- One pasted Discord notice per course × form week (Assignment only, not self-feedback).
-- The page parses the text (design/prototypes/assignment-notice.js) and sends the result;
-- a deadline the user set by hand is marked due_manual and wins over what the text says.
-- Apply: cd worker && npx wrangler@4.131.1 d1 migrations apply phi-brain --remote

CREATE TABLE assignment_notes (
  course_id TEXT NOT NULL REFERENCES courses(id),
  week_no INTEGER NOT NULL CHECK (week_no BETWEEN 0 AND 16),
  raw TEXT NOT NULL,
  due_at TEXT,            -- local wall-clock "2026-09-20T23:59" (KST), null = none found/set
  late_due_at TEXT,
  due_manual INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (course_id, week_no)
);
