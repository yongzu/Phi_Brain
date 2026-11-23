-- 회차(사용자 지시 2026-11-23): 주차(학기 0~16)는 그대로 두고, 과제를 과목의 "회차"로 표기한다.
-- 한 주에 같은 과목 회차가 둘 이상일 수 있어(TF Fonts 2~8회차를 12~16주차에) 공지·수동 확인을 회차로 나눈다.
-- round = 회차 이름("Magazine 2회차", "11회차"). '' = 회차 없음(예전 공지·제출 그대로).

-- 1) 과제 공지: (과목, 주차) → (과목, 주차, 회차)
CREATE TABLE assignment_notes_new (
  course_id TEXT NOT NULL REFERENCES courses(id),
  week_no INTEGER NOT NULL CHECK (week_no BETWEEN 0 AND 16),
  round TEXT NOT NULL DEFAULT '',
  raw TEXT NOT NULL,
  due_at TEXT,            -- local wall-clock "2026-09-20T23:59" (KST), null = none found/set
  late_due_at TEXT,
  due_manual INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (course_id, week_no, round)
);
INSERT INTO assignment_notes_new (course_id, week_no, round, raw, due_at, late_due_at, due_manual, version, updated_at)
  SELECT course_id, week_no, '', raw, due_at, late_due_at, due_manual, version, updated_at FROM assignment_notes;
DROP TABLE assignment_notes;
ALTER TABLE assignment_notes_new RENAME TO assignment_notes;

-- 2) 확인메일 근거: 어느 회차의 제출인지
ALTER TABLE submission_evidence ADD COLUMN round TEXT NOT NULL DEFAULT '';

-- 3) 직접 확인·해당 없음: 칸(과목 × 주차 × 종류) × 회차
CREATE TABLE manual_status_new (
  target_id INTEGER NOT NULL REFERENCES submission_targets(id),
  round TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('confirmed_manual','not_applicable')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (target_id, round)
);
INSERT INTO manual_status_new (target_id, round, status, updated_at) SELECT target_id, '', status, updated_at FROM manual_status;
DROP TABLE manual_status;
ALTER TABLE manual_status_new RENAME TO manual_status;

-- 4) 검토 대기열: 화면의 "확인 필요"에서 회차를 골라 넣을 수 있게 과목·종류·폼 답·링크를 남긴다
ALTER TABLE review_queue ADD COLUMN course_id TEXT;
ALTER TABLE review_queue ADD COLUMN kind TEXT;
ALTER TABLE review_queue ADD COLUMN round_answer TEXT;
ALTER TABLE review_queue ADD COLUMN links_json TEXT NOT NULL DEFAULT '{}';

-- 5) 과목별 회차 목록(사용자가 알려준 남은 과제, 2026-11-23). 화면의 "+ 회차 추가"로 늘린다
INSERT INTO settings (key, value, updated_at) VALUES ('assignment_rounds', '{"vt":["Magazine 2회차","Magazine 3회차","Magazine 4회차","Magazine 5회차","Magazine 6회차"],"tf":["Fonts 2회차","Fonts 3회차","Fonts 4회차","Fonts 5회차","Fonts 6회차","Fonts 7회차","Fonts 8회차"],"ips":["11회차","12회차","13회차","14회차","15회차","16회차"],"pc":["12회차","13회차","14회차"],"iae":["3회차","4회차","5회차","6회차","7회차"]}', '2026-11-23T00:00:00.000Z')
  ON CONFLICT(key) DO NOTHING;
