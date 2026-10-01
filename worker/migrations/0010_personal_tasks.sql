-- 2026-10-02 사용자 지시: Assignment Manage 표에 과목이 아닌 개인 할 일을 추가한다.
-- 메일 확인 없이 직접 체크(done). 이름 + 자세히보기 내용(detail).
-- week_no = 만든 주차. 그 주부터 표에 보이고, 끝내지 않았으면 다음 주차 표에도 이어서 보인다.
-- done_week = 체크한 표의 주차 — 끝낸 할 일은 만든 주부터 그 주까지만 보인다.
-- Apply: cd worker && npx wrangler@4.131.1 d1 migrations apply phi-brain --remote

CREATE TABLE personal_tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  week_no INTEGER NOT NULL CHECK (week_no BETWEEN 0 AND 16),
  done INTEGER NOT NULL DEFAULT 0,
  done_week INTEGER CHECK (done_week IS NULL OR done_week BETWEEN 0 AND 16),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
