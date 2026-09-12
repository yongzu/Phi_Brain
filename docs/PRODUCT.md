# Phi Brain — 제품 기획

최종 정리: 2026-09-12

## 현재 구현 상태 (Codex 최신 확인)

- 확인한 원격 커밋: `92d1808` — Future Items 구현. 사용자가 배포 완료를 알림.
- Journaling과 Future Items는 브라우저 localStorage를 사용하는 프런트엔드 프로토타입이다.
- 서버·DB·계정·기기 간 데이터 동기화·AI 정리는 미구현이다. GitHub 코드 동기화는 개인 기록 동기화가 아니다.
- Assignment Manage는 메뉴만 있으며 본문·제출 상태 저장·Gmail 연동 모두 미구현이다.
- 아래 초기 데이터·화면 제안은 역사적 초안이다. 현재 구현 상태와 이후 명시된 사용자 확정 사항을 우선한다.

## 상태와 출처

사용자와 Codex의 기획 대화 및 사용자가 제공한 ChatGPT 대화 「구현」을 바탕으로 정리했다.
원본 대화 ID: `6aa40231-545c-83ee-8c23-f983cf17facf`.
이 문서는 대화 전문이 아닌 인계용 요약이다. Claude Code 교차 검토와 구현 이력은 STATUS.md에 기록되어 있다.
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

요구사항·스타일 논의를 거쳐 Journaling·Future Items 프런트엔드 프로토타입 구현이 진행됐다. 백엔드까지 완성된 앱은 아니다.
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

## Future Item (사용자 확정, 2026-09-12)

사용자가 요구사항을 직접 작성해 구현 시작을 지시했다(Claude Code가 `design/prototypes/`에 구현).

- Future Item은 **구체적으로 실행할 행동(Activity)**이며 투두리스트처럼 관리한다. 흐름: 빠르게 작성 → 과목별 분류 → 실행 → 완료.
- **Assignment Manage(과제·셀프피드백 제출 관리)와 별개.** Future Item을 완료해도 과제 제출 상태는 바뀌지 않는다.
- **소속은 항목당 하나:** 특정 과목 / 사용자가 추가한 커스텀 박스 / General / 임시(미지정). General은 "특정 과목이 아님"으로
  분류 완료된 상태, 임시는 아직 분류하지 않은 상태 — 둘을 합치지 않으며 가짜 과목으로 취급하지 않는다.
- 이 원칙은 Future Item에만 적용한다. 저널·인사이트의 복수 과목 연결 정책은 바꾸지 않는다.
- 과목 약어·순서는 기존 과목 목록 하나를 기준으로 통일(EWA 같은 다른 표기는 별도 과목으로 만들지 않음).
- **커스텀 박스(2026-09-13 추가):** 12개 고정 과목 외에 사용자가 이름을 지어 박스를 추가할 수 있다("+ 박스 추가"). 실제 과목과
  달리 이름 변경·삭제가 가능하며, 삭제 시 그 안의 항목은 임시로 이동한다(과목 자체는 삭제·이름변경 불가 — 고정 커리큘럼).
- **마감일(2026-09-13 추가):** 항목에 선택적으로 마감 날짜/시간을 붙일 수 있다("이번 범위 제외"에서 해제됨). 반복 일정, 하위
  할 일, 알림, AI 분류는 여전히 이번 범위 밖.
- **박스 순서(2026-09-13 추가):** General/임시를 제외한 과목·커스텀 박스는 사용자가 드래그로 순서를 바꿀 수 있고,
  최신 추가순/마감 급한순/알파벳순 일괄 정렬도 제공한다. 즐겨찾기는 순서에 영향 없이 그룹만 나눈다.

### 데이터 모델 제안과의 충돌 (미결정 — 사용자 결정 필요)

- 위 "데이터 모델 제안"은 `ActionItem`이 `memory_id`로 `MemoryItem`에 붙고, `MemoryItem`은 `MemoryCourse`로 **여러 과목**에
  연결된다. 이대로면 Future Item이 여러 과목에 속하게 되어 "소속 하나" 확정과 충돌한다.
- 현재 실제로 저장된 데이터에는 충돌이 없다: 프로토타입의 기존 Future Item(v1)은 항목당 과목이 0~1개였고, v2로 자동 전환했다
  (과목 없음 → 임시). 삭제·복제한 연결 없음. v1 저장 키는 백업으로 그대로 둠.
- 전환 제안(에이전트 제안, 미확정): `ActionItem`에 자체 소속 필드(`scope`: course | general | unassigned, `course_id`)를 두어
  `MemoryCourse`와 분리한다. 저널·인사이트 쪽 복수 과목 연결은 유지한다. 여러 과목에 걸친 정리 항목에서 Future Item을 만들 때는
  첫 과목을 자동 선택하거나 과목별로 복제하지 않고, 임시로 넣거나 사용자가 그 자리에서 하나를 고르게 한다.

## Assignment Manage (사용자 확정, 2026-09-12 — 구현 시작 지시)

사용자가 상세 요구사항을 직접 작성해 구현 시작을 지시했다(Claude Code가 `server/`, `design/prototypes/assignment.js`에 구현).
참고 자료: 사용자가 준 와이어프레임·과목 URL 표(`Assignmetn Manage.pdf`) — 형식과 URL 값만 참고하고 스타일은 따르지 않았다.

- 주차별 12개 과목의 과제·셀프피드백 제출 확인과 수업 보드·제출폼 바로가기.
- 셀프피드백을 저널에 가져오지 않는다. Future Item 완료 여부와 제출 상태를 연결하지 않는다(서로 독립).
- 상태 4종 + 1(구현 중 추가): 미확인 / 제출 확인(메일) / 직접 확인 / 해당 없음 / **충돌**(수동 "해당 없음"과 확인메일이 동시에 있는 경우 — 자동으로 어느 한쪽을 택하지 않고 사용자에게 확인을 요청).
- 완료 개수 = 제출 확인 + 직접 확인, 분모에서 해당 없음 제외.
- Gmail 연동은 규칙 기반(AI 미사용)으로 1차 구현: 발신자(`forms-receipts-noreply@google.com`) + 제목/폼 제목의 과목 태그 + 본문의 주차·트랙 추출. 검증된 표본은 **Engaging with AI 과제** 하나뿐이라, 그 조합(`ewa:assignment`)만 자동 확인하고 다른 과목·셀프피드백은 형식이 같다고 가정하지 않고 전부 검토 대기열로 보낸다.
- 메일 수신일이 아니라 본문에 적힌 주차로 연결한다. 안내문의 예시 주차("예: 0주차")를 답변으로 오인하지 않는다.
- EAI/EWA처럼 표기가 다른 과목은 하나의 과목으로 취급한다(Future Item과 같은 원칙).
- 같은 Gmail 메시지 ID는 중복 반영하지 않고, 재제출은 새 근거로 쌓아 이력을 보존한다(기존 근거를 지우지 않음).
- OAuth·토큰·동기화 상태는 서버(SQLite)에 저장하고 프런트엔드 localStorage에는 두지 않는다. Git에는 토큰·DB 파일을 넣지 않는다(`.gitignore`).
- 이번 범위 제외(사용자 지정): 실시간 Gmail Push/Pub-Sub.
- **미검증:** 실제 Google OAuth 연동과 실제 Gmail 메시지 파싱. 규칙 엔진과 상태 전이는 코드 테스트로 검증했지만, 진짜 Gmail 계정으로 끝까지 확인한 적은 없다 — 필요한 Google Cloud 설정은 `docs/STATUS.md`의 인계 절 참고.

## Journal Archive (사용자 확정, 2026-09-13 — 구현 시작 지시)

사용자가 상세 요구사항을 직접 작성해 구현 시작을 지시했다(Claude Code가 `design/prototypes/home.html`·`journal.js`에 구현).

- 지금까지 실제로 저장한 저널을 과목 기준으로 돌아보는 화면이다. 새로 쓰는 화면이 아니고, 새 저장소도 만들지 않는다 —
  Journaling이 이미 쓰는 localStorage 초안을 그대로 읽기만 한다.
- 상단 필터는 Journaling·Future Item과 같은 과목 목록이되, 맨 앞이 "General"이 아니라 "All"이다. All은 전체 보기,
  그 뒤로는 General과 과목 12개가 필터 값으로 온다.
- 저널 하나는 여러 과목에 동시에 속할 수 있다(기존 저널·인사이트 원칙 그대로, Future Item의 "소속 하나" 규칙과는 다름) —
  과목 필터는 "그 과목이 다룬 과목에 포함되면" 보여주는 포함 검사이며, 저널 하나가 여러 필터에 동시에 나타나는 것은
  버그가 아니라 의도된 동작이다.
- 항목을 클릭하면 Journaling 탭에서 그 날짜를 그대로 연다.
- 홈 화면 "이어서 작성하기"가 쓰는 가짜 예시 데이터(EXAMPLES)·검토 목업(REVIEW)은 Archive에 절대 포함하지 않는다 —
  실제로 저장된 것만 다룬다는 원칙을 지킨다.
- 이번 범위 제외: 정리(AI) 결과·검토 상태 표시, 검색·페이지네이션·월별 그룹핑·삭제, 본문 미리보기, 기기 간 동기화.

## 초기 화면 구조 제안 (현재 UI와 구분)

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
