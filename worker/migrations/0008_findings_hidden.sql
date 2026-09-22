-- 2026-09-22 사용자 지시: Findings에서만 지우기 — 원본 저널은 그대로 두고, Findings 화면에서 뺄 박스만 기억한다.
-- key = '날짜::과목::내용지문' (박스 글자의 해시). 순번이 아니라 내용으로 가리켜서, 저널을 고쳐 박스 순서가 바뀌어도
-- 지운 박스가 다른 박스로 옮겨 가지 않는다. 박스 글자를 고치면 지문이 달라져 다시 보인다.
-- Apply: cd worker && npx wrangler@4.131.1 d1 migrations apply phi-brain --remote

CREATE TABLE findings_hidden (
  key TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
