-- Course Agent(사용자 지시 2026-11-23): 과목별 "과목 기억" — 에이전트(Claude Code 스킬 course-agent)가
-- 저널·Findings·과제 공지·과목 폴더 자료를 읽고 정리해 쓰고, 화면의 Course Agent 탭이 읽는다.
-- course_id = courses.id 또는 'general'(과목을 잇는 종합).
CREATE TABLE course_memory (
  id TEXT PRIMARY KEY,                 -- 에이전트가 정한 안정 id("bi:ref-from-problem")
  course_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('overview','insight','method','feedback','mine','apply','next','synthesis')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  sources TEXT NOT NULL DEFAULT '[]',  -- JSON [{type:'journal',date}|{type:'notice',week,round}|{type:'file',path}|{type:'course',id}]
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE INDEX course_memory_course ON course_memory(course_id, section, position);

-- 과목마다 마지막 정리 기록(언제, 어떤 방식으로, 무엇을 읽었는지)
CREATE TABLE course_memory_runs (
  course_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,                  -- 'harvest'(정리) | 'synthesize'(종합) | 'apply'(과제 적용)
  summary TEXT NOT NULL DEFAULT '',
  ran_at TEXT NOT NULL
);
