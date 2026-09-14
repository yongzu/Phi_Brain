-- 2026-09-14 사용자 요구사항: Findings 박스 즐겨찾기, 계정 닉네임.
-- Apply: cd worker && npx wrangler@4.131.1 d1 migrations apply phi-brain --remote

-- a starred Findings box = a course key ('general', 'BI', …); starred order = created_at
CREATE TABLE findings_favorites (
  course TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

-- single-user app settings, one row per key (nickname, …)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
