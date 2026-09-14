-- 온라인 전환 4단계: Future Item on D1 — the "simple" way (사용자 확정 2026-09-14):
-- the whole board (items, favorites, custom boxes, box order — the same object
-- the page kept in localStorage as phi-brain:future:v2) is one versioned row.
-- Two devices saving on top of the same version → the second is asked, never merged silently.
-- Apply: cd worker && npx wrangler@4.131.1 d1 migrations apply phi-brain --remote

CREATE TABLE future_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,          -- JSON { items, favorites, customBoxes, boxOrder }
  version INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
