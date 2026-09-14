-- 온라인 전환 3단계: Journaling on D1.
-- One journal per date (same shape the page kept in localStorage as
-- phi-brain:journal:<date>). Findings and Journal Archive are derived from
-- these rows on the page, so they need no tables of their own.
-- Apply: cd worker && npx wrangler@4.131.1 d1 migrations apply phi-brain --remote

CREATE TABLE journals (
  date TEXT PRIMARY KEY CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  title TEXT NOT NULL DEFAULT '',
  courses TEXT NOT NULL DEFAULT '[]',   -- JSON array of course codes ('general', 'BI', …)
  html TEXT NOT NULL DEFAULT '',
  saved_at INTEGER NOT NULL,            -- ms, the editor's own "초안 저장됨" time
  -- bumped on every write; a device must send the version it last saw, so an
  -- edit made on another device in between is reported instead of overwritten
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

-- Journal Archive stars: one per (date, course) card
CREATE TABLE journal_favorites (
  date TEXT NOT NULL,
  course TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (date, course)
);
