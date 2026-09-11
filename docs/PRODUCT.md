# Phi Brain — 제품 기획

최종 정리: 2026-09-11

## 상태와 출처

사용자와 Codex의 기획 대화 및 사용자가 제공한 ChatGPT 대화 「구현」을 바탕으로 정리했다.
원본 대화 ID: `6aa40231-545c-83ee-8c23-f983cf17facf`.
이 문서는 대화 전문이 아닌 인계용 요약이다. Claude Code 쪽 논의는 아직 반영하지 않았다.
아래에서 '확정'은 사용자가 직접 요청하거나 명확하게 수용한 범위이고, '제안'은 구현 전에 조정 가능한 설계다.

## 확정된 목표와 범위

Phi Design Institute의 학습 저널을 과목별로 정리·축적하는 AI Learning Second Brain 웹앱을 만든다.
사용자는 12개 과목을 배우며 통합 4F 저널을 디스코드에 날짜순으로 기록하고 있다.
날짜 중심의 기록에서 과목별 학습 흐름과 인사이트를 다시 찾기 어려운 문제가 있다.

Phase 1은 Journal Organizer MVP다.

1. 기존 4F 저널을 입력한다.
2. 내용을 의미 단위(semantic chunk)로 나눈다.
3. 각 내용을 12개 과목 중 하나 이상으로 분류한다.
4. Fact / Feeling / Finding / Future Item으로 구조화한다.
5. 과목별 memory에 저장한다.

먼저 요구사항·데이터 구조·화면을 설계하고 스타일을 논의한다. 구현 시작 지시는 아직 없다.
GitHub 저장소는 `https://github.com/yongzu/Phi_Brain`이다.

## 이후 단계의 비전

- Phase 2: 과목별 저널·인사이트·작업물·피드백을 흡수하는 Course Agent.
- Phase 3: 과목 간 공통 패턴과 사고방식·역량 변화를 찾는 Second Brain / Agent Village.
- Phase 1 설계안은 하나의 AI 처리 흐름과 과목별 context를 전제로 한다. 독립적인 AI 12개를 운영하는 구조는 요구하지 않는다.

## MVP 기능 제안

- 개인용을 우선한다. 다중 사용자·인증 방식은 미정이다.
- 날짜와 제목을 지정하고 저널 원문을 한 번에 붙여넣는다. 4개 입력칸으로 강제하지 않는다.
- AI 결과를 원문과 비교하며 내용·과목·4F를 수정하고 확정한다.
- 과목별 기록을 날짜·4F·검색어로 찾는다.
- Future Item의 미완료·완료를 관리한다. 기한은 선택 사항이다.
- 디스코드 자동 수집, 파일 업로드, Agent 대화, 성장 분석은 후속 단계로 제안한다.

## 데이터 모델 제안

관계형 데이터 모델 초안이며, 특정 DB나 프레임워크는 선택하지 않았다.

| 엔터티 | 목적 | 주요 필드 |
|---|---|---|
| Course | 과목과 분류 기준 | id, name, aliases, description, keywords |
| Journal | 날짜별 통합 저널 | id, owner_id, date, title, current_revision_id |
| JournalRevision | 원문 수정 이력 | id, journal_id, raw_text, version, created_at |
| AnalysisRun | 분석 대상·실행 이력 | id, revision_id, status, model_version, prompt_version |
| Chunk | 원문의 의미 단위 | id, analysis_id, quote, source_start, source_end, order |
| MemoryItem | 정리된 4F 항목 | id, text, four_f_type, review_status |
| MemoryEvidence | 정리 항목의 원문 근거 | memory_id, chunk_id |
| MemoryCourse | 여러 과목과의 연결 | memory_id, course_id, classification_reason |
| ActionItem | Future Item 실행 상태 | memory_id, status, due_at, completed_at |

원문 버전 → 분석 → Chunk ↔ MemoryItem → 여러 Course의 관계다.

### 모델 운영 원칙 제안

- 원문을 보존하고 모든 정리 항목에서 근거를 찾을 수 있게 한다.
- 과목별 memory는 연결된 정리 항목의 집합이다. 과목마다 내용을 복제하지 않는다.
- 정리 항목 하나에는 4F 유형 하나를 부여한다. 복합 내용은 나누고 원문 근거를 공유할 수 있다.
- 없는 감정·통찰·행동을 만들어 채우지 않는다.
- 과목을 판단하기 어려우면 미분류로 남기고 사용자가 정한다.
- 재분석은 새 초안으로 생성한다. 기존 확정 기록을 즉시 덮어쓰지 않는다.
- 재확정 시 중복 기록을 방지한다. 완료 상태·사용자 수정의 보존 및 항목 대응 정책은 구현 전에 구체화한다.
- 원문 위치의 단위, 삭제 정책, 사용자별 접근 제어, 트랜잭션 및 재시도 방식은 구현 설계 때 정한다.

## 화면 구조 제안

상시 메뉴: 저널 / 과목 / 실행.

| 화면 | 내용과 행동 |
|---|---|
| 저널 목록 | 날짜·제목·연결 과목·처리 상태, 새 저널 작성 |
| 저널 작성 | 날짜·제목·큰 원문 영역, 임시 저장, AI 정리 |
| 정리 결과 검토 | 4F 항목 수정, 복수 과목 선택, 제외, 근거 확인, 확정 저장 |
| 과목 목록·상세 | 12개 과목, 날짜별 누적 항목, 4F·기간·검색 필터 |
| 실행 목록 | 전체 Future Item, 과목 필터, 완료 처리, 원문 이동 |

검토 화면은 정리된 글 중심이며, 원문 비교를 켜면 데스크톱에서는 두 열로 보이는 안을 제안했다.
분석 실패 시 원문을 유지하고 재시도할 수 있어야 한다.

## 과목 정보

이전 ChatGPT 대화에는 다음 이름이 등장했다. 현재 수강 과목 및 정식 명칭은 사용자와 최종 대조해야 한다.

Iterative Problem Solving, Beautiful Interface, Visual Translation, Interviewing as Exploration,
Art of Reading, Engaging with AI, Aesthetic Literacy, Typography as Foundation,
Self Introduction, What If, Peer Coaching, Readable Writing.

참고 주소: `https://www.phi.design/programs`.
이번 문서 작성 중 사이트를 재검증하지 않았다. BI·AOR 등 약칭과 과목별 분류 설명은 확정 전이다.

## 제안한 완료 기준

여러 과목이 섞인 저널을 입력하고, 결과를 수정·저장한 뒤 각 과목에서 원문 근거와 함께 다시 찾을 수 있다.
같은 항목이 여러 과목에 연결되어도 수정과 실행 상태가 일관되며, 재분석으로 중복되지 않는다.
