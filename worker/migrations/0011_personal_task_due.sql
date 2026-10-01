-- 2026-10-02 사용자 지시: 개인 할 일에도 마감(날짜·시간, 한국 시각 'YYYY-MM-DDTHH:MM')을 적을 수 있게 — 비우면 마감 없음.
-- 끝내지 않은 개인 할 일은 TO-DO 열에도 마감 순으로 나온다(todo.js).
-- Apply: cd worker && npx wrangler@4.131.1 d1 migrations apply phi-brain --remote

ALTER TABLE personal_tasks ADD COLUMN due_at TEXT;
