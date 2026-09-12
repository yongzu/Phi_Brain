# Phi Brain — 작업 상태와 인계

최종 갱신: 2026-09-13 (계속, 마감 팝오버·즐겨찾기 SVG·항목 아이콘 3개) / Claude Code

## 현재 단계

### 커스텀 커서 (2026-09-12)

- `9bcc441`로 32px SVG 커서를 제작·배포했다. 파란 배경은 제외했다.
- 데스크톱 일반 영역·버튼·링크에 적용하며 텍스트 입력, 드래그, 비활성 요소와 터치 환경은 기존 의미 커서를 유지한다.
- OpenAI의 공개 원본 커서 자산·공식 변형 갤러리는 확인되지 않았다. 비교 가능한 표준 커서는 MDN `cursor` 문서에서 확인한다.
- **사용자 검토 결과: 현재 커서는 참고 이미지와 전혀 다르며 승인되지 않았다.** 배포 상태는 유지하지만 완성된 디자인으로 취급하지 않는다.
- **(Claude Code, 2026-09-12) 재작업:** 사용자가 준 레퍼런스 SVG(`Cursor.svg` — 짙은 회색 채움 + 굵은 흰 테두리 + 은은한 검은 그림자, 컬러 글로우 없음)를 그대로 `design/prototypes/cursor-arrow.svg`에 반영해 이전 임시안을 대체했다(32×35, 핫스팟 4 5, `--phi-cursor` 토큰만 갱신). 로컬 정적 서버에서 SVG 렌더링과 `cursor` CSS 파싱, 콘솔 오류 없음을 확인했다. 실제 마우스로 페이지 위에서 보는 최종 확인은 사용자 몫이다.

### Codex UI 수정 인계 (2026-09-12)

- EAI 표기를 EWA로 수정. 기존 Future Items 항목·즐겨찾기 및 저널 과목 선택·본문 과목 박스의 EAI 호환 처리.
- 다룬 과목 General 추가, AL 선택칸 음수 여백 제거, 등록 버튼을 정리하기 왼쪽 미체크 옵션으로 변경, 체크 원 크기 축소.
- 로컬 브라우저에서 미체크 기본값·General 선택·4F 작성·체크 후 General 등록·Future Items EWA 필터를 확인했다.
- JS 문법·차이 공백 검사 및 기존 EAI 데이터 변환의 순수 함수 검증 수행.
- GitHub `main`에 UI 수정(`0e65aeff`)과 캐시 갱신(`4a123e28`)을 반영했다. GitHub Pages에서 General·EWA·AL 노출, 미체크 등록 옵션, Future Items EWA 필터를 다시 확인했다.

### GitHub 자격 증명 창 재발 방지 (2026-09-12)

- 사용자 화면의 `git-remote-https.exe` 메모리 참조 오류는 GitHub의 로그인 거절 안내가 아니라, Codex 격리 계정에서 Windows 자격 증명·TLS 경로를 호출할 때 생긴 프로세스 충돌이다.
- 저장소 로컬 TLS 백엔드를 `openssl`로 지정했다. 이 설정은 이 저장소에만 적용된다.
- Codex는 터미널에서 Windows Git Credential Manager를 사용하는 push를 중단하고, 연결된 GitHub 도구로 원격 쓰기를 수행한다. 따라서 이후 같은 인증 창에서 사용자 조작을 요구하지 않는다.
- 사용자의 일반 PowerShell Git 인증과 전역 Credential Manager 설정은 변경하지 않았다.

프론트엔드 프로토타입 단계. Journaling 화면과 **Future Items 페이지(사용자 구현 지시, 2026-09-12)**가 정적 페이지로
동작한다. 저장은 브라우저 localStorage뿐이며 서버·DB·계정·기기 간 동기화·AI 정리는 없다(백엔드 구현 지시 없음).

**최신 확인:** `4a123e28`까지 원격과 GitHub Pages에 반영했다. Codex는 Future Items 코드·페이지 연결·localStorage 저장과 Claude 인계 기록을 확인하고, 최신 배포 화면을 브라우저로 재검증했다.
Assignment Manage는 메뉴만 있고 본문·Gmail 인증·제출 자동 확인은 아직 없다. 셀프피드백을 저널에 가져오는 기능은 제외한다.
AGENTS.md·PRODUCT.md·DESIGN.md·STATUS.md의 오래된 단계 표현과 저널 재등록 설명을 정리했다. 앱 코드는 수정하지 않았다.

## 완료

- (Codex) GitHub `https://github.com/yongzu/Phi_Brain`을 현재 로컬 작업 폴더에 복제하고 origin 확인.
- (Codex) 요구사항, 데이터·화면 구조 초안, 미니멀 스타일 방향 논의. 공통 문서 및 진입 지침 생성.
- (Claude Code) 로컬 변경 없음 확인 후 origin/main fast-forward 병합(커밋 `fd53677`까지). `PROJECT_CONTEXT.md`는 변경 없음 확인.
- (Claude Code) `CLAUDE.md`, `AGENTS.md`, `PROJECT_CONTEXT.md`, `docs/PRODUCT.md`, `docs/DESIGN.md`, `docs/STATUS.md`를 읽고
  Claude Code 쪽에서 사용자와 논의·확정한 내용 및 이미 만들었다가 되돌린 구현 이력과 대조.
- (Claude Code) 사용자가 제공한 스타일 키트(`theme.css`, `interactions.js`, `README.md`, `example.html`)를
  `design/style-kit/`에 원본 그대로 보존.
- (Claude Code) 스타일 키트를 적용한 홈 화면 정적 프로토타입 작성: `design/prototypes/home.html` +
  `design/prototypes/phi-brain.css`(새 컴포넌트 전용 추가 스타일, 새 색상 토큰 없음). 브라우저에서 로컬 정적 서버로
  렌더링·hover-reveal 인터랙션까지 확인 완료. `docs/DESIGN.md`에 반영 내용 기록.
- (Claude Code) GitHub Pages 배포: `https://yongzu.github.io/Phi_Brain/` (`.github/workflows/design-pages.yml`, `design/` 폴더 게시).
- (Claude Code) 사용자 지시로 홈 화면 반복 수정: 로고·워드마크 이미지 헤더, 좌측 고정 사이드바(Tab1/Tab2, 12개 과목),
  폰트 10pt 통일, 좌측선 정렬, 푸터 단순화, 색상 4색 토큰으로 축소, 사이드바 호버 인터랙션. 확정 내용은
  `docs/DESIGN.md` "Phi Brain 확정 사항" 참고. 기존 과목 reveal-list·Future Item 아코디언 섹션은 사이드바로 대체되며 본문에서 제거됨.

## 진행 중

없음. Assignment Manage 구현 인계, Future Items 재설계 인계 기록 완료(아래).

## Future Items 재설계 인계 (Claude Code, 2026-09-13)

2026-09-12 구현 이후 사용자 요청으로 여러 차례 반복 수정했다. 아래 "Future Items 구현 인계 (2026-09-12)"의
필터·저장 실패 복구·저널 연동 부분은 그대로 유효하고, 그 외 레이아웃·데이터 모델은 이 절 내용으로 갱신됐다.

- **박스 레이아웃 재설계:** 임시(unassigned)+General이 상단 한 줄에 반반 고정(즐겨찾기·드래그 대상 아님, 아래
  "위치" 참고), 나머지 과목·커스텀 박스는 4열 그리드(좁은 화면 2열→1열). 즐겨찾기는 이제 순서에 영향을 주지 않고
  "즐겨찾기"/"과목" 두 그룹으로만 나눈다 — 실제 순서는 사용자가 정하는 `boxOrder` 배열을 따른다.
- **박스 드래그 재배치(상하좌우):** 드롭 대상과의 배열 인덱스 비교로 삽입 방향을 정해서 커서 위치가 아니라 "어디에
  놓았는가"로 항상 동작한다(첫 구현은 좌우만 되던 버그를 이 방식으로 고쳤다). 항목을 다른 박스로 옮기는 기존 드래그와는
  별도 상태(`dragId` vs `dragBoxKey`)로 관리해 서로 간섭하지 않는다.
- **정렬 메뉴:** 그리드 위 "정렬 ▾" 버튼 → 옆에 뜨는 메뉴(최신 추가순 / 마감 급한순 / 알파벳순). 한 번 누르면 `boxOrder`를
  그 기준으로 다시 쓰는 일회성 동작이라, 이후에도 드래그로 계속 다듬을 수 있다(고정 "정렬 모드"가 아님).
- **커스텀 박스:** 그리드 끝 "+ 박스 추가" 점선 타일로 사용자가 이름을 지어 박스를 만든다(`state.customBoxes`,
  `custom:<id>` 소속 키). 박스 "⋯" 메뉴에서 즐겨찾기(모든 과목/커스텀 박스)·이름 바꾸기·삭제(커스텀만) 가능 — 실제
  과목은 고정 커리큘럼이라 이름 변경·삭제 대상에서 뺐다. 삭제 시 그 안 항목은 임시로 이동, 되돌리기 토스트 지원.
- **마감일(dueAt):** 항목에 선택적 마감 날짜/시간(`item.dueAt`, `YYYY-MM-DD` 또는 `YYYY-MM-DDTHH:mm`). 작성 카드의
  마감 체크박스로 켜고 끄거나(2026-09-13 재조정, 아래 참고), 항목 "⋯" → 마감 설정/변경으로 나중에 바꿀 수 있다.
  지난 마감은 배지가 굵게 표시된다.
- **작성 카드 재설계:** 한 줄 바 → 세로 카드(소속 칩 한 줄 + 마감 체크박스/날짜/시간 + 2줄 `<textarea>` + 추가 버튼,
  이 순서는 2026-09-13 안에 두 번 조정됐다 — 처음엔 마감을 textarea 아래에 뒀다가 소속 칩 바로 아래로 옮김). 소속은
  드롭다운 대신 Journaling "다룬 과목"과 같은 칩 스타일(단, 단일 선택). 마감은 처음엔 "날짜를 오늘에서 바꾸거나 시간을
  골라야 붙는" 암묵적 규칙이었으나, 사용자 요청으로 **명시적 체크박스**로 바꿨다 — 체크가 꺼져 있으면 날짜가 무엇이든
  마감 없음, 켜면 그 순간 보이는 날짜(기본 오늘)+시간이 그대로 마감이다. 마감 날짜는 Journaling 날짜 선택창과 동일한
  `.datepicker` 컴포넌트를 별도 인스턴스로 재사용(과거 제한 없이 미래 날짜도 선택 가능). 마감 시간은 브라우저 기본
  `time`/`datetime-local` 위젯이 레이아웃을 깨서(글자가 세로로 밀림) 같은 카드 스타일의 커스텀 3열(오전/오후·시·분)
  선택창으로 새로 만들었다.
- **필터+정렬 한 줄(2026-09-13):** `#fi-filters`와 `#fi-sort`를 `.fi-toolbar`(`justify-content:space-between`)로
  묶어 필터는 왼쪽, "정렬 ▾"은 항상 맨 오른쪽에 오도록 했다(이전엔 정렬이 그리드 바로 위 별도 줄에 있었음).
- **본문 섹션 폭:** Future Item은 `.shell:has(.view-future:not([hidden])){max-width:1100px}`로 Assignment
  Manage(920px)와 별도로 더 넓게 잡았다.
- **좌측 내비게이션 아코디언:** 모바일 폭(≤860px)에서 General/Course가 좌상단 아코디언으로 접힌다(기존
  `StyleKit.createAccordion` 재사용). 데스크톱은 항상 펼쳐진 채 클릭 무시.
- **위치:** `design/prototypes/future.js`(대부분의 로직) · `home.html`(작성 카드·정렬 버튼·아코디언 마크업) ·
  `phi-brain.css`. 데이터는 여전히 `phi-brain:future:v2` 하나에 저장되며 `customBoxes[]`·`boxOrder[]` 필드가 늘었다
  (구버전 데이터는 두 필드가 없어도 빈 배열로 채워져 그대로 열린다).
- **Journaling "다룬 과목"도 같은 방식으로(2026-09-13):** 접힘 아코디언(`<details class="courses">`)을 없애고 평범한
  `<div>`로 바꿔 칩이 항상 펼쳐진 상태로 고정, 날짜 선택 버튼을 헤더(제목 옆)에서 다룬 과목 아래로 옮겼다. 다중 선택
  자체는 그대로다. `journal.js`에서 `coursesEl`/`chosenEl`/`coursesToggle`과 열고 닫는 로직(`closeCourses`, `toggle`
  이벤트, Escape 핸들러)을 전부 제거 — 남은 자동저장은 칩 클릭 때마다 걸리는 기존 `scheduleSave()` 하나로 충분하다.
- **미검증/남은 일:** 실제 사용자 터치 기기에서 드래그 재배치·아코디언 조작 확인 안 함. 커스텀 박스·마감일은
  localStorage 전용(서버 없음, Assignment Manage와 무관). 마감 알림·반복 일정은 범위 밖.

## Future Items 구현 인계 (Claude Code, 2026-09-12)

- **범위:** 필터(All/General/임시/과목 12) · 작성줄 · 과목별 박스 · 즐겨찾기(고정 순서) · 드래그/메뉴 소속 변경 · 되돌리기 ·
  완료/완료 취소/수정/삭제(되돌리기) · 저장 실패 복구 · 주소(`#future-item/…`) · v1→v2 데이터 전환 · 저널 등록 연동.
  디자인 규칙은 `docs/DESIGN.md` "Future Items 페이지", 제품 결정·데이터 충돌은 `docs/PRODUCT.md` "Future Item" 참고.
- **저장:** 브라우저 localStorage 키 `phi-brain:future:v2` `{v:2, items[], favorites[]}`. 항목 필드: id, text, scope
  (course|general|unassigned), courseId, done, doneAt, createdAt, placedAt(현재 소속에 들어온 시각), updatedAt,
  source(저널 날짜·원문 문장 | null). **서버 저장 아님** — 같은 브라우저에서만 유지, 즐겨찾기도 "사용자별"이 아니라 "브라우저별".
- **검증(로컬 정적 서버 + 브라우저, 실제 동작 확인):**
  - v1 데이터 전환(과목 있음→과목, 없음→임시, 완료·원문 연결 유지, v1 키 보존) ✓
  - All에서 미지정 추가 → 임시 영역 / 과목 지정 추가 → 해당 박스 / General·임시 서로 다른 필터·박스 ✓
  - 빈 내용 무시, 한글 조합 중 Enter 제출 안 함, 추가 후 입력칸 비움·포커스 유지, 다른 소속 추가 시 위치 안내 토스트 ✓
  - 드래그로 필터·박스에 이동(도착지 강조, All 제외, 같은 소속 무변화, ID·완료 유지), ⋯ 메뉴로 이동, 되돌리기(이전 소속·순서 복원) ✓
  - 즐겨찾기 고정 순서 유지(다른 활동으로 안 바뀜), 빈 즐겨찾기 유지, 해제 시 최근 순 복귀 ✓
  - 완료(접힌 완료 영역)·완료 취소·수정(Enter 저장/Esc 취소, 순서 불변)·삭제+되돌리기(같은 ID) ✓
  - 박스·필터·All 개수 즉시 일치, 과목 필터에서 바꾼 것이 All에 반영 ✓ / 새로고침 후 항목·완료·즐겨찾기·필터 유지 ✓
  - 저장 실패(저장소 쓰기 오류를 강제로 발생): 화면·저장 모두 원상 복구 + 오류 토스트 + 다시 시도로 적용, 추가 실패 시 입력 문장 유지 ✓
  - 375px 모바일: 가로 넘침 없음, 필터 줄바꿈, 메뉴·토스트 화면 안, 탭으로 소속 변경 ✓
  - 저널 "Future Item에 등록하기" 재등록 시 중복·이동 덮어쓰기 없음, 기존 EAI→EWA 호환, 원문 저널 열기 ✓
  - 키보드: 메뉴 화살표 이동·순환, Esc 닫기와 포커스 복귀, Enter 추가, 편집 Enter/Esc는 실제 키 이벤트로 확인 ✓.
    **버튼·체크박스의 Enter/Space 활성화 자체는 자동 검증 못함**(브라우저 도구가 문자 없는 키 이벤트만 보냄) — 모두 기본
    `<button>`·`<input type=checkbox>`라 브라우저 기본 동작에 의존. 실제 기기에서 한 번 확인 필요.
- **남은 일:** 서버 저장·계정·기기 간 동기화 / 터치 드래그(모바일은 ⋯ 메뉴로만 이동) / 되돌리기는 가장 최근 동작 하나만 /
  데이터 모델 충돌 결정(`PRODUCT.md`) / 실제 기기 키보드·스크린리더 점검.

## Assignment Manage 구현 인계 (Claude Code, 2026-09-12)

- **범위:** 사용자 요구사항(10개 절) 중 화면·백엔드·규칙 엔진·테스트를 전부 구현했다. **실제 Google OAuth 연동과 실제
  Gmail 계정으로 검증한 적은 없다** — Google Cloud 자격 증명이 없어서다(아래 "필요한 설정" 참고). 제품 결정은
  `docs/PRODUCT.md` "Assignment Manage", 화면 규칙은 `docs/DESIGN.md` "Assignment Manage 페이지" 참고.
- **구성:**
  - 프런트엔드: `design/prototypes/assignment.js` + `home.html`의 `#view-assignment`, `phi-brain.css`의 `.am-*`.
    사이드바 "Assignment Manage"에 `data-view="assignment"`를 달아 `future.js`의 뷰 전환에 편승시켰다. `future.js`는
    `show()`가 뷰를 바꿀 때 `phibrain:view` 커스텀 이벤트를 쏘도록, `PhiBrain.getCurrentView()`를 노출하도록 각각 한 줄
    추가했다(해시가 뷰 전환 때 지워지는 기존 동작과 충돌해서 필요했음 — 아래 "실제 버그" 참고).
  - 백엔드: `server/`(Node 내장 모듈만 사용, npm 의존성 0개) — `db.js`(SQLite, `node:sqlite`), `matching.js`(규칙 기반 판별,
    순수 함수), `service.js`(상태 계산·수동 확인·이메일 반영), `googleOAuth.js`·`gmail.js`(OAuth2 웹서버 플로우·Gmail API,
    둘 다 raw `https`), `sync.js`(동기화 오케스트레이션), `index.js`(REST API, CORS, OAuth 라우트).
  - 과목·URL 시드 데이터는 사용자가 준 참고 자료(`Assignmetn Manage.pdf`)의 표를 그대로 옮겼다(주소 패턴을 추측하지 않음).
  - 학기 1주차는 처음엔 참고 자료 예시(09.06~09.12)로 시드했으나, 사용자가 실제 값을 두 차례 정정해 최종
    **09.07~09.13(7일)** 이다(`server/db.js`의 `SEMESTER_START='2026-09-07'`, `WEEK_LENGTH_DAYS=7`). 이후 모든 주차는
    이 두 상수에서 자동 계산되므로, 실제 학기가 다시 바뀌면 두 상수만 바꾸면 된다. 16주로 시드했고, 늘어나면
    `SEMESTER_WEEKS`를 바꾼다. **주의:** 이미 떠 있는 백엔드 프로세스는 이 값을 코드 로드 시점에만 읽으므로, 상수를
    바꾼 뒤에는 `node server/index.js`를 재시작해야 DB의 기존 주차 행이 upsert로 갱신된다(자동 반영 아님).
  - 이후 사용자 요청으로 소소한 화면 조정도 반영: 헤더를 "Course(Figma)"로, 과목명은 클릭 링크가 아니라 호버 시 박스만
    표시되는 라벨로 바꾸고 옆에 별도 ↗ 아이콘으로 Figma 보드 이동을 분리, Assignment/Self-Feedback 헤더 텍스트를 상태
    원의 왼쪽 시작점에 맞춤, 본문 섹션 폭을 Journaling/Future Item과 별도로 920px까지 넓힘. 자세한 내용은
    `docs/DESIGN.md` "Assignment Manage 페이지" 참고.
- **데이터 모델(SQLite, `server/data/assignment-manage.sqlite` — Git 제외):** courses·weeks·submission_targets(과목×주차×
  종류, 유니크 제약으로 "항목당 하나" 가정을 명시) · submission_evidence(메일 1건 = 1행, message_id 유니크로 중복 방지,
  재제출은 새 행으로 쌓여 이력 보존) · manual_status(수동 확인, 메일 근거를 지우지 않음) · review_queue(판별 모호 메일) ·
  gmail_connection(토큰·동기화 상태, 싱글턴 행).
- **판별 규칙(`server/matching.js`):** 발신자 고정, 제목/폼 제목의 대괄호 과목 태그, 본문 라벨의 주차·트랙(안내문 예시 줄은
  제외), EWA 검증 필드(작동하는 작업·TIL 리포트·AI 대화) 추출. **검증된 조합은 `ewa:assignment` 하나뿐** — 그 외 모든
  과목과 모든 셀프피드백은 파싱이 "성공"해도 자동 확인하지 않고 검토 대기열로 보낸다(형식이 같다고 가정하지 않음).
- **검증(Node 내장 테스트 러너, `node --test server/*.test.js` — 23개 전부 통과):**
  - `matching.test.js`(11개): EWA 표본 매칭·링크 추출, 없는 필드는 생략, "(예: 0주차)" 오인 방지, 메일 수신일이 아니라
    본문 주차로 연결(늦게 온 메일도), EAI→EWA 별칭, 미검증 과목·셀프피드백은 검토로, 발신자 불일치·다른 학기 메일은
    무관 처리, 모르는 과목 태그·주차 추출 실패는 검토로.
  - `service.test.js`(7개): 매칭→상태 반영, 같은 message_id 중복 반영 안 함, 재제출은 이력으로 쌓임, 수동 "해당 없음"이
    확인메일과 충돌하면 저장 거부 후 강제 옵션으로만 반영(근거는 안 지워짐), 완료 개수 계산(해당 없음 분모 제외).
  - `gmail.test.js`(5개): text/plain 우선, text/html만 있으면 태그 제거 후 사용, 중첩 multipart 순회, 검색 쿼리 구성.
  - **프런트엔드 수동 확인(로컬 백엔드 + `tools/dev-server.js`):** 표 렌더링, 상세 패널 열기/닫기, 직접 확인 표시 시
    표·진행률 즉시 갱신, 미확인만 보기(양쪽 다 처리된 행만 숨김, 한쪽 처리는 옅게), 주차 이동, 동기화 버튼이 "연결 안 됨"을
    정확히 알림(토스트), **백엔드를 끄면 표를 숨기고 정직하게 안내 문구만 표시**(가짜 데이터 없음).
  - **실제 버그 발견·수정:** `future.js`의 `show()`가 'future'가 아닌 뷰에서는 해시를 지우는데(`history.replaceState`),
    `assignment.js`는 이후 스크립트라 로드 시점엔 이미 해시가 비어 있어 `location.hash`로 자기 차례를 알 방법이 없었다 —
    `phibrain:view` 이벤트 + `getCurrentView()`로 해결.
- **미검증(그대로 보고):** 실제 Google OAuth 인가·토큰 교환·갱신, 실제 Gmail 메시지 조회·파싱, 다른 과목·셀프피드백의
  실제 확인메일 제목/필드 구조(현재는 전부 검토 대기열행). 가상 데이터로 이 부분이 됐다고 보고하지 않는다.
- **필요한 설정(사용자):**
  1. Google Cloud 프로젝트 생성 → Gmail API 사용 설정.
  2. OAuth 동의 화면 구성(테스트 사용자로 본인 계정 추가해도 충분 — 앱 게시 심사 불필요).
  3. OAuth 클라이언트 ID 생성("웹 애플리케이션"), 승인된 리디렉션 URI에 `http://localhost:5600/auth/google/callback` 등록.
  4. `server/.env.example`을 `server/.env`로 복사하고 `GOOGLE_CLIENT_ID`·`GOOGLE_CLIENT_SECRET` 채우기(커밋 금지).
  5. 다른 과목·셀프피드백 확인메일 실 표본(제목·폼 제목·필드 라벨) — `server/matching.js`의 `VERIFIED_FORMATS`와
     라벨 상수에 매핑을 추가해야 자동 확인 범위가 넓어진다.
- **실행 방법:** 백엔드 `node server/index.js`(포트 5600, `.claude/launch.json`에 `phi-brain-assignment-backend`로 등록) +
  프런트 `tools/dev-server.js`(포트 5500, 기존과 동일) 둘 다 띄운 상태에서 `http://localhost:5500/prototypes/home.html#assignment`.
  둘 중 하나라도 안 띄우면 화면이 정직하게 "백엔드에 연결할 수 없어요"만 보여준다.
- **남은 일:** 실제 Gmail 연동 검증, 다른 과목·셀프피드백 매핑 확장, GitHub Pages(정적)에서는 이 백엔드가 동작하지
  않으므로 배포하려면 별도 호스팅(Render 등, 과거 검토 이력 있음) 필요, 모바일 표 레이아웃 실기기 점검, 스크린리더 점검.

## Claude Code 교차 검토 (2026-09-11)

Codex 공통 문서는 Claude Code 쪽 대화를 반영하지 않은 상태로 작성되었다(PRODUCT.md·STATUS.md에 명시).
아래는 Claude Code 쪽 대화 내용과 대조한 결과다. "사용자 확정"은 사용자가 채팅에서 직접 요청·승인한 것만 표시했고,
Codex·Claude 각각의 설계 초안은 "AI 제안"으로 구분했다.

### 몰랐던 이력: 이미 한 번 구현했다가 되돌림

Codex 문서에는 없는 사실 — 이 저장소에는 문서 커밋(`fd53677`) 전에 다음 이력이 있었다.

1. 커밋 `d0aeb2a`: Claude Code가 Phase 1 MVP를 실제로 전체 구현(Node/Express/Prisma+SQLite 백엔드,
   Vite/React 프런트, Anthropic·OpenAI 이중 LLM 연동, 브라우저에서 종단 테스트까지 완료).
2. 커밋 `49ccfb6`: 사용자가 "스타일을 먼저 정하고 구현을 시작하겠다"며 구현물 전체를 되돌리라고 요청 →
   `PROJECT_CONTEXT.md`만 남기고 전부 삭제.
3. 이후 사용자가 두 레퍼런스 사이트(`yongzu.github.io`, `minwookshin.com`)로 스타일을 설명 → 그 다음에
   이번 Codex 문서 커밋(`fd53677`)이 올라옴.

즉 아키텍처(백엔드/DB/LLM 구성)가 "틀려서" 되돌린 게 아니라, "스타일 합의 전에 구현을 시작하면 안 된다"는
프로세스 문제였다. 아래 Claude 쪽 제안들은 한 번 구현·검증까지 거친 안이라는 점을 감안해서 봐야 한다.

### 일치하는 내용 (양쪽 문서·대화 동일)

- 목표: Phi Design Institute 12개 과목의 통합 4F 저널을 과목별로 정리·축적하는 Phase 1 Journal Organizer MVP.
- 저장소: `https://github.com/yongzu/Phi_Brain`.
- 사용자는 기존처럼 통합 텍스트로 한 번에 작성하고, AI가 과목·4F로 자동 분류한다. 4칸 강제 입력 없음.
- 한 조각(chunk/fragment)이 여러 과목에 동시에 속할 수 있다(다대다).
- 과목 목록은 phi.design/programs의 12개 과목 이름을 잠정 사용하되, 정식 명칭·약어는 아직 미확정.
- Phase 1은 지금 설계·스타일 논의 단계이며, 구현 시작 지시는 아직 없다.
- Phase 2(Course Agent)·Phase 3(Second Brain/Agent Village)는 후속 단계로 미룬다. 처음부터 과목별 독립 LLM 12개를
  운영하는 구조는 요구하지 않는다.
- 디자인 방향: 매우 미니멀 + 애플 스타일. 레퍼런스 두 사이트(`yongzu.github.io`, `minwookshin.com`) 동일.
  다만 두 도구가 관찰한 관점에 차이가 있다 — 아래 "다른 내용" 참고.

### 다른 내용 (문서화되지 않았거나 서로 다른 안)

| 항목 | Claude Code 쪽 | Codex 문서 | 비고 |
|---|---|---|---|
| LLM 제공자 | 사용자가 Anthropic·OpenAI **둘 다** 요청(토큰/한도 부족 대비 자동 폴백). 이미 구현·검증함 | 언급 없음 | 사용자 확정 사항이 Codex 문서에 누락됨 — 반영 필요 |
| 백엔드/DB | 사용자가 "간단한 백엔드 서버" 요청, 로컬은 SQLite로 시작해 추후 배포 시 Postgres 전환, Render 배포 가이드까지 확정 | "특정 DB·프레임워크는 선택하지 않았다"(미정으로 명시) | 충돌은 아니지만 Codex 쪽이 이미 확정된 사용자 결정을 모르는 상태 |
| 데이터 모델 | Course/Journal/JournalFragment/FragmentCourse/FourFClassification/Insight/FutureItem — 단순 구조, 수정 이력은 source(ai\|user) 플래그로만 표시 | Course/Journal/**JournalRevision**/**AnalysisRun**(모델·프롬프트 버전 기록)/Chunk/MemoryItem/MemoryEvidence/MemoryCourse/ActionItem — 원문 리비전·재분석 이력까지 감사 추적 | 둘 다 "제안"일 뿐 사용자 확정 아님. Codex 안이 더 정교하지만 구현 비용도 더 큼 — 방향 결정 필요 |
| 4F 분류 원칙 | 한 조각에 4F 유형을 **여러 개** 동시 허용하도록 구현했었음(예: fact+finding 동시 표시) | "정리 항목 하나에는 4F 유형 하나만 부여, 복합 내용은 나누고 원문 근거 공유"라는 반대 원칙 제안 | 실제로 상충하는 설계 원칙 — 어느 쪽으로 갈지 확정 필요 |
| 화면 구성 | 저널 목록 화면 없이 작성→분석→검토를 한 화면에서 처리, 과목 관리(설정) 화면 별도 존재, 원문-결과 2열 비교 없음 | 저널 목록 / 작성 / 검토를 3단계로 명확히 분리, 데스크톱에서 원문-결과 2열 비교 모드 제안, 과목 관리 화면 언급 없음 | 화면 개수·역할 분리 정도가 다름 |
| 재분석 정책 | 별도 설계 없음(사실상 즉시 덮어쓰기에 가까움) | "재분석은 새 초안으로 생성, 기존 확정 기록을 즉시 덮어쓰지 않는다"는 원칙 제안 | Codex 쪽 제안이 더 안전하지만 사용자 확정 아님 |
| 디자인 세부 수치 | 레퍼런스에서 관찰한 정성적 톤만 공유(여백, 절제된 타이포, 애플식 인터랙션 질감) — 수치 제안 없음 | 본문 약 16px, 펼침·접힘 약 200ms 등 구체적 수치까지 제안 | Codex 쪽이 더 구체적이지만 스스로도 "최종 승인 아님"이라 명시 |
| 레퍼런스 관찰 디테일 | 스크린샷·레이아웃·타이포 중심으로 관찰, 아코디언(펼침·접힘) 동작은 직접 클릭해보지 않음 | `yongzu.github.io`의 log 단계적 탐색, `minwookshin.com`의 work 섹션 접기·펼치기 동작을 실제로 확인 | Codex 관찰이 더 상세함 — Claude 쪽 관찰의 빈틈 |

### 미결정 사항 (양쪽 다 확정 안 됨)

- 정확한 과목 정식 명칭·약어(BI, AOR 등) — phi.design/programs 재검증 및 사용자 최종 대조 필요.
- 다중 사용자·인증 방식.
- 모바일 내비게이션, 원문 비교 UI의 구체적 방식.
- 다크 모드 지원 범위.
- 최종 디자인 시안(정확한 색상·폰트·로고·간격)과 구현 시작 시점.
- 기기 간 작업 동기화 방식(OneDrive 등 공유 폴더 구성) — 사용자가 고려 중이나 아직 요청 전.
- 데이터 모델을 Claude 안(단순)과 Codex 안(리비전·감사 추적 포함) 중 어느 쪽으로 갈지, 또는 절충안.
- 4F 유형을 조각당 하나로 강제할지, 여러 개 허용할지.

## 저장·동기화 상태

- 사용자가 공통 문서의 GitHub 게시를 요청했다. 이 문서 묶음은 `main` 브랜치로 커밋·푸시하는 인계본이다.
- 실제 게시 여부는 원격 `main`의 커밋으로 확인한다. 다른 로컬 복제본에서는 최신 변경을 받아온 뒤 문서를 다시 읽는다.
- 사용자는 데스크톱과 노트북 간 OneDrive 공유 폴더 활용을 고려하고 있다.
- OneDrive 경로 선택·이전·동기화 구성은 요청 전이며 수행하지 않았다.
- GitHub는 코드·문서 공유 저장소로 연결되어 있다. 실제 운영 저널 DB와 API 키는 별도로 관리한다.

## 다음 작업

1. ~~Claude Code에서 이 저장소의 `CLAUDE.md`와 공통 문서를 읽는다.~~ 완료 (2026-09-11, Claude Code).
2. ~~Claude Code 쪽의 기존 논의를 사용자 확정/제안으로 구분해 반영한다.~~ 완료 — 위 "Claude Code 교차 검토" 절 참고.
3. ~~저널 첫 화면 배치를 구체화하고 스타일을 확정한다.~~ 부분 완료 — 홈 화면(`design/prototypes/home.html`)만 초안 나옴.
   이후 Journaling과 Future Items 페이지까지 구현됨. 과목 상세·정리 결과 검토·Assignment Manage 본문은 아직.
4. 사용자가 홈 화면 프로토타입을 검토하고 방향(레이아웃·문구·과목 리스트 표현 방식)에 대한 피드백을 준다.
5. 사용자가 위 "다른 내용"·"미결정 사항"을 검토하고 방향을 정한다 (특히: LLM 이중 제공자·백엔드/DB 결정을
   Codex 쪽에도 확정 사항으로 반영할지, 데이터 모델은 단순 안/감사 추적 안 중 무엇으로 갈지, 4F 하나 vs 여러 개).
6. 나머지 화면(정리 결과 검토, 과목 상세, Assignment Manage)의 다음 구현 범위를 정한다. Future Items는 실제 기기 사용성 점검과 서버 저장이 남아 있다.
7. 공유 폴더 경로와 기기 간 작업 방식을 정한다.
8. 사용자의 구현 시작 지시 후 기술 구성과 앱 구현을 진행한다.

## 교차 작업 규칙

- 시작 전: 최신 문서와 Git 변경 확인 → 담당 도구·작업 범위·편집 파일을 진행 중에 기록.
- 종료 후: 실제 변경, 검증, 남은 일, 커밋·푸시 여부를 기록하고 진행 중 표시 해제.
- 같은 파일을 동시에 수정하지 않는다. 상태 표시는 잠금 장치가 아니므로 양쪽 작업을 조율한다.
- 다른 복제본을 쓸 경우 커밋 전달과 변경 수신이 필요하다. 파일 공유와 대화의 자동 공유를 혼동하지 않는다.
- 이 문서에 키·토큰·실제 개인 저널을 넣지 않는다.

## 최근 변경 이력

| 날짜 | 도구 | 변경 | 인계 |
|---|---|---|---|
| 2026-09-11 | Codex | 공통 제품·디자인·상태 문서와 양쪽 진입 지침 생성 | Claude Code 쪽 맥락 대조 필요, 앱 구현 대기 |
| 2026-09-11 | Codex | 사용자 요청에 따라 공통 문서 GitHub 게시용 상태 갱신 | 원격 main을 받아 CLAUDE.md부터 읽기 |
| 2026-09-11 | Claude Code | origin/main 병합(fd53677) 후 공통 문서 교차 검토, 일치/차이/미결정 정리, 기존 구현·되돌림 이력 기록 | 사용자가 위 "다른 내용"·"미결정 사항" 검토 후 방향 확정 필요. 구현 아직 시작 안 함 |
| 2026-09-11 | Claude Code | 사용자 제공 스타일 키트를 `design/style-kit/`에 반영, 홈 화면 정적 프로토타입(`design/prototypes/`) 작성, `docs/DESIGN.md` 갱신 | 사용자 피드백 대기. 나머지 화면 초안·앱 구현은 아직 시작 안 함 |
| 2026-09-12 | Claude Code | 홈 화면 반복 수정(헤더·사이드바·푸터·10pt·4색 토큰·호버 인터랙션), Pages 배포, `docs/DESIGN.md`에 확정 사항·최소화 원칙 기록 | 나머지 화면·앱 구현은 아직 시작 안 함 |
| 2026-09-12 | Claude Code | Pretendard CDN(dynamic subset) 로드로 미설치 기기 대응, General에 "Assignment Manage" Tab2 추가 | Assignment Manage 화면 내용은 미정 |
| 2026-09-12 | Claude Code | Journaling 본문 프로토타입(맥락·통합 편집기·초안 자동 저장·정리하기 상태·이어 쓰기), `--radius` 토큰 추가, `docs/DESIGN.md`에 구성 기록 | 브라우저 localStorage 저장만 있음(서버 없음). AI 정리·검토 화면·다른 탭 본문은 미구현 |
| 2026-09-12 | Claude Code | 자체 날짜 선택창, 4F 소제목 pill 박스, 호버 시 블러 해제로 나타나는 도움 질문(작성 도움 버튼 제거) | 터치 기기에는 호버가 없어 도움 질문이 보이지 않음 — 필요 시 대안 결정 |
| 2026-09-12 | Claude Code | 기본 빈 문서로 시작(4F는 템플릿 버튼으로만), 안내 문구 변경, 과목 선택창 바깥 클릭·Esc로 닫기(선택 유지) | — |
| 2026-09-12 | Claude Code | 본문 과목 박스(+과목 메뉴), 제목·목록 버튼 제거, 서식 줄(B·I·U·S·인용·코드) 추가, `--radius-sm`·`--font-mono` 토큰 | 서식은 브라우저 execCommand 기반(프로토타입용). 실제 구현 시 에디터 라이브러리 검토 필요 |
| 2026-09-12 | Claude Code | 4F 템플릿 토글(다시 누르면 박스만 제거, 내용 유지), 코드 글꼴 Unifont 적용 | — (다음 작업에서 Unifont 제외) |
| 2026-09-12 | Claude Code | Unifont 제거(코드도 Pretendard, `--font-mono` 토큰 삭제), "Future Item에 등록하기" + 임시 Future Item 탭(과목별 묶음·완료 표시), 지난 할 일을 실제 등록 항목으로 연결 | Future Item 탭 정식 디자인, 과목 판별은 AI 연결 시 교체 |
| 2026-09-12 | Claude Code | **Future Items 페이지 구현**(사용자 요구사항): 필터·작성줄·박스·즐겨찾기·드래그/메뉴 이동·되돌리기·완료/수정/삭제·저장 실패 복구·v2 데이터(v1 전환)·주소 라우팅, 저널 등록을 "새 줄만 추가"로 변경, 기존 EAI→EWA 호환 별칭, `PRODUCT.md`에 확정 사항·데이터 모델 충돌 기록 | 위 "Future Items 구현 인계"의 남은 일. localStorage 전용 |
| 2026-09-12 | Claude Code | 사용자가 제공한 레퍼런스 SVG로 커스텀 커서 재작업(라운드 화살표 + 흰 테두리 + 그림자, 컬러 글로우 없음), 이전 미승인 임시안 대체 | 사용자의 실제 마우스 최종 확인 필요 |
| 2026-09-12 | Claude Code | 커서 크기 단계적 축소(1/4→2배)·테두리 검은 선 원인 수정(중앙 정렬 stroke→흰 halo 뒤+원본 크기 채움 방식), 같은 스타일로 포인터(검지손가락)·텍스트(I-beam) 커서 신규 제작, 버튼·링크·텍스트 입력에 각각 적용 | 사용자의 실제 마우스 최종 확인 필요. 포인터 손 모양은 단순화된 실루엣(사각형 3개 조합) |
| 2026-09-12 | Claude Code | 검지손가락 포인터·I-beam 텍스트 커서 삭제(텍스트 입력은 브라우저 기본 `text` 커서로 복귀), 버튼·링크용 포인터를 화살표와 같은 도형의 색 반전(흰 채움 + 짙은 회색 테두리)으로 재구현 | 화살표 SVG 자체에는 그림자(filter)가 없음 — 이전에 보였다는 얇은 선은 캐시된 이전 커서 이미지였을 가능성. 사용자 재확인 필요 |
| 2026-09-12 | Claude Code | 캐시 삭제 후에도 선이 보인다는 사용자 피드백에 따라 화살표 테두리 색을 흰색→`#F0F0F0`으로 변경(그림자·별도 테두리 라인은 여전히 없음, 파일에는 fill+stroke 두 path뿐) | 여전히 보인다면 SVG 렌더링이 아니라 OS/브라우저의 커서 래스터라이즈 단계 문제일 가능성 — 실제 화면 캡처나 다른 브라우저로 대조 필요 |
| 2026-09-12 | Claude Code | 매번 Pages 배포를 기다리지 않도록 로컬 미리보기 서버 추가(`tools/dev-server.js`, 자동 새로고침 — `design/` 하위 파일이 바뀌면 ~1초 안에 열린 탭이 새로고침됨). 사용자 로컬 `~/.claude/launch.json`에 `phi-brain`(포트 5500) 항목 등록 | 서버 스크립트만 저장소에 커밋; 사용자별 `launch.json` 등록은 이 저장소 밖(사용자 홈 폴더)이라 다른 기기에서는 재등록 필요 |
| 2026-09-12 | Claude Code | 사용자가 실제 화면 사진으로 재확인: (1) 사이드바 등 일부 요소가 커스텀 포인터 대신 OS 기본 pointer를 쓰는 원인 확인 — `.courses summary`·`.resume-row summary`·`.fi-done summary`·`.fi-register`·체크리스트 원(`::before`)이 클래스 선택자라 `@media(pointer:fine)`의 일반 규칙(`summary`, `label`)보다 우선순위가 높아 커스텀 커서를 덮어쓰고 있었음 → 같은 선택자를 그 미디어 쿼리 안에도 추가해 해결. (2) 여전히 보인다는 검은 선 재검토 — 커서 SVG를 같은 파일명으로 여러 번 덮어써서 브라우저/OS의 커서 비트맵 캐시가 옛 이미지를 계속 쓰고 있었을 가능성이 커서, `--phi-cursor`·`--phi-cursor-pointer`에 `?v=3` 캐시 무효화 쿼리를 붙임(다음에 커서 파일을 바꿀 때는 이 번호를 올릴 것) | 사용자가 캐시 무효화 이후에도 실제 화면에서 선이 보이는지 재확인 필요 |
| 2026-09-12 | Claude Code | 2배 확대·그림자 추가·외부 1px 흰 라인 추가까지 시도해도 화살표 커서에 얇은 선이 계속 보인다는 사용자 피드백 → SVG 래스터라이즈 자체를 의심, 기본 화살표를 **PNG로 교체**(`cursor-arrow.png`, 사용자 제공 `cursor.png`를 캔버스로 halo+그림자 합성 후 49×52 저장, 핫스팟 12 9). `cursor-arrow.svg`는 삭제. 포인터(`cursor-pointer.svg`)는 문제가 없다는 사용자 확인에 따라 그대로 둠 | 사용자의 실제 화면 최종 확인 필요 — 그래도 선이 보이면 SVG 문제가 아니라는 뜻이므로 원인을 완전히 다시 봐야 함 |
| 2026-09-12 | Claude Code | 사용자 요청으로 `cursor-arrow.png` 재생성: 그림자 제거, 크기 절반(49×52→21×23, 핫스팟 4 3)으로 축소 | 여전히 선이 보이는지 최종 확인 필요 |
| 2026-09-12 | Claude Code | 화살표·포인터 커서 크기를 19×21.16으로 통일(`cursor-arrow.png` 19×21, 핫스팟 4 3 / `cursor-pointer.svg` 19×21.16, 핫스팟 2 3), 캐시 무효화 버전 갱신 | 사용자 최종 확인 필요 |
| 2026-09-12 | Claude Code | 사용자가 직접 만든 최종 SVG(`Cursor.svg`, `pointer.svg`, 17×19)로 두 커서 모두 교체(`cursor-arrow.png` 폐기, `cursor-arrow.svg`·`cursor-pointer.svg`로 통일, 핫스팟 1 2) | 사용자 최종 확인 필요 |
| 2026-09-12 | Claude Code | 두 커서 크기를 16×17.82로 축소(핫스팟은 반올림하면 그대로 1 2), 캐시 무효화 버전 갱신 | 사용자 최종 확인 필요 |
| 2026-09-12 | Claude Code | 사용자가 새로 만든 `cursor.svg`·`pointer.svg`(13×14)로 교체 — 이번엔 화살표가 흰 채움+짙은 회색 테두리, 포인터는 짙은 회색 단색(테두리색=채움색)으로 배색이 바뀜. 핫스팟 0 1, 캐시 무효화 버전 갱신 | 사용자 최종 확인 필요 |
| 2026-09-12 | Claude Code | 사용자가 만든 `i-beam.svg`(1×14, 얇은 세로선)를 그대로 `cursor-text.svg`로 추가하고 `--phi-cursor-text` 토큰으로 텍스트 입력·contenteditable에 적용(핫스팟 0 7) | 사용자 최종 확인 필요 |
| 2026-09-12 | Claude Code | **Assignment Manage 구현**(사용자 요구사항): `server/`에 Node 내장 모듈만으로 백엔드(SQLite·규칙 기반 Gmail 판별·OAuth2·REST API) 신규 작성, `design/prototypes/assignment.js`+`#view-assignment`로 화면 구현(표 형식, 기존 화면과 다른 레이아웃 유지), 테스트 23개(`node --test server/*.test.js`) 전부 통과, `future.js`에 `phibrain:view` 이벤트·`getCurrentView()` 추가 | 실제 Gmail/OAuth 미검증(Google Cloud 설정 필요) · 다른 과목·셀프피드백 매핑 확장 · 위 "Assignment Manage 구현 인계" 참고 |
| 2026-09-12~13 | Claude Code | Assignment Manage 다듬기: 미확인 항목만 보기 체크박스·설명 문구 삭제, 상태 셀 정렬 버그(`<td>`에 `display:inline-flex` 직접 지정한 게 원인) 수정, 본문 폭 920px 확장, 헤더 "Course(Figma)"로 변경, 과목명을 링크→호버 박스로 바꾸고 별도 ↗ 아이콘 추가, 학기 1주차를 사용자 정정에 따라 09.06~09.12→09.06~09.13→**09.07~09.13**으로 두 차례 수정(`SEMESTER_START`/`WEEK_LENGTH_DAYS` 상수화로 이후 주차 자동 계산) | 백엔드 재시작 필요(코드 로드 시점에만 상수를 읽음) · 테스트 23개 계속 통과 |
| 2026-09-13 | Claude Code | **Future Items 재설계**(사용자 요구사항, 다수 라운드): 임시/General 상단 고정 반반 배치, 과목·커스텀 박스 4열 그리드로 재구성, 박스 드래그 재배치(상하좌우, 인덱스 비교 방식으로 재구현), "정렬 ▾" 플로팅 메뉴(최신 추가순/마감 급한순/알파벳순), "+ 박스 추가"로 커스텀 박스 생성·박스 "⋯" 메뉴(즐겨찾기·이름바꾸기·삭제), 항목 마감일(dueAt)과 ⋯ 메뉴의 마감 설정, 작성 카드 재설계(다룬 과목 스타일 소속 칩 + 2줄 textarea + Journaling과 통일한 커스텀 날짜/시간 선택), 모바일 좌측 내비게이션 아코디언, Future Item 본문 폭 1100px로 확장 | 실제 터치 기기 드래그·아코디언 미검증 · 자세한 내용은 위 "Future Items 재설계 인계" 참고 |
| 2026-09-13 | Claude Code | 백엔드(port 5600) 재시작해 학기 1주차 수정 반영 확인(`/api/weeks` → 09.07~09.13), `docs/PRODUCT.md`·`docs/DESIGN.md` 갱신 | GitHub 배포 진행 |
| 2026-09-13 | Claude Code | 사용자가 실제 Google OAuth 설정을 진행하는 동안 UI 다듬기 병행: Future Item 마감을 암묵적 규칙 대신 명시적 체크박스로 바꾸고 소속 칩 바로 아래로 재배치, 필터·정렬을 한 줄로 합쳐 정렬을 맨 오른쪽에 고정, Journaling "다룬 과목" 아코디언을 제거해 늘 펼친 상태로 바꾸고 날짜 선택을 그 아래로 이동(헤더에서 분리) | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-2, `future.js` 20260913-2, `journal.js` 20260913-1) · GitHub 배포 예정 |
| 2026-09-13 | Claude Code | Journaling "다룬 과목"의 안내 문구("고르지 않아도 괜찮아요…") 삭제, Future Item 마감 체크박스를 기존 `.fi-check`(완료 체크박스와 같은 원형 스타일 — Assignment Manage 상태 원과 동일 계열)로 재사용해 원형으로 변경 | CSS·JS 변경 없음(클래스 재사용), HTML만 수정 |
| 2026-09-13 | Claude Code | Journaling "다룬 과목" 라벨 텍스트 삭제(칩 박스는 유지, `aria-label`로 접근성 이름은 유지), 저널 제목을 다른 화면과 공유하는 `.journal-heading`에서 분리해 `#journal-heading`만 12pt·`#000`으로, 서식 줄(B·I·U·S·인용·코드)을 텍스트 선택 전에는 숨기고 실제 드래그 선택 시에만 나타나도록 변경(`refreshFormatState`가 `hidden` 토글) | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-3, `journal.js` 20260913-2) |
| 2026-09-13 | Claude Code | Future Item 필터+정렬 툴바를 작성 카드 위에서 General/임시 상단 줄 아래·그리드 위로 이동(General/임시는 `#fi-top-row-slot`이라는 별도 정적 슬롯에 렌더링하도록 분리) — 이 과정에서 `listEl`에만 걸려 있던 change/keydown/focusout 위임 리스너가 그 슬롯을 못 보던 실제 버그를 발견해 `topRowSlot`에도 같은 핸들러를 붙여 수정(체크·수정·마감 입력이 General/임시 항목에서도 다시 동작). Journaling 제목 입력("9월 12일 저널")을 `#000`으로 바꾸고 왼쪽 padding을 더해 아래 다룬 과목 첫 칩과 텍스트 시작점을 맞춤. 사이드바 최상단 "Journaling" 탭만 12pt로(`General`/`Course`는 그대로) | 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-4, `future.js` 20260913-3) |
| 2026-09-13 | Claude Code | 사용자가 실제 Gmail 연결에 성공(테스트 사용자 등록 후). DB를 직접 열어 확인 — `submission_evidence` 0건, `review_queue` 7건으로 "전부 미확인"의 원인이 설계대로임을(검증된 조합 `ewa:assignment` 하나뿐) 확인. 실제 확인메일 3건(Beautiful Interface 과제·EWA 셀프피드백·Self-Introduction 과제) 본문을 직접 열람해 필드 구조를 확보했고, Self-Introduction은 실제 제목이 하이픈 표기(`Self-Introduction`)라 과목명("Self Introduction")과 안 맞아 `unknown_course`로 빠지는 별도 버그도 발견(별칭 추가로 해결 가능, 아직 미적용). Future Item 항목 행 레이아웃 버그 수정: 마감 배지가 문장과 한 줄에서 경합해 좁은 박스에서 문장이 세로로 쪼개지던 문제 — 마감을 8pt 박스 배지로 만들어 문장 아래 줄로 분리 | 매칭 규칙 확장(BI/EWA 셀프피드백/SI 자동확인 추가, SI 별칭)은 사용자 승인 대기 · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-5, `future.js` 20260913-4) |
| 2026-09-13 | Claude Code | (기록 누락분) Future Item 마감 배지 스타일을 옅은 회색 테두리 박스에서 배경만 채운 박스로 변경(`dc9fb84`, 테두리 삭제) — 문서화만 뒤늦게 반영, 코드는 이미 배포됨 | 캐시 무효화 버전 `phi-brain.css` 20260913-6(기존 배포분) |
| 2026-09-13 | Claude Code | **Journal Archive 구현**(사용자 요구사항 — 사용자가 직접 작성한 상세 스펙으로 구현 시작 지시): 사이드바의 죽어 있던 "Journal Archive" 링크에 `data-view="journal-archive"`를 달아 `future.js`의 뷰 레지스트리에 등록(`#view-archive` 신규), Future Item과 같은 `.fi-filters` pill로 All/General/과목 12개 단일 선택 필터 구현(과목 필터는 "포함" 검사라 저널 하나가 여러 필터에 동시에 나타날 수 있음 — 의도된 동작), 목록은 `resume-list` 스타일 재사용에 `store.dates()`/`store.get()`만 읽어 실제 저장된 초안만 나열(EXAMPLES·REVIEW 가짜 데이터는 제외), 항목 클릭 시 기존 `window.PhiBrain.openJournal(date)`로 Journaling 탭 이동. 해시 라우팅은 `#journal-archive`/`#journal-archive/AL` 형태로 Future Item과 같은 패턴이되, 필터 읽기·쓰기는 `journal.js`가 `phibrain:view` 이벤트로 직접 관리(Assignment Manage와 같은 방식) — `future.js`의 `show()`는 이 뷰로 넘어갈 때 해시를 지우지 않도록만 예외 처리. 로컬 미리보기에서 여러 날짜·과목 조합(다과목/단일과목/무과목)을 localStorage에 직접 넣어 All·과목별 필터·빈 상태 2종("아직 쓴 저널이 없어요"/"이 과목이 들어간 저널이 아직 없어요")·항목 클릭 시 Journaling 이동·모바일 폭 줄바꿈·해시 유지(딥링크 첫 로드 포함)까지 실제로 확인 후 테스트 데이터 제거. `docs/PRODUCT.md`·`docs/DESIGN.md`에 확정 사항 기록 | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-7, `future.js` 20260913-5, `journal.js` 20260913-3) · GitHub 배포 예정 |
| 2026-09-13 | Claude Code | Journal Archive 다듬기(사용자 요청): 행 클릭 시 Journaling으로 바로 이동하던 것을 그 자리에서 본문이 펼쳐지는 드롭다운으로 변경(`<details class="resume-row">` + `StyleKit.createAccordion` 재사용, `.editor` 클래스를 얹어 헤더·체크리스트 등 본문 스타일 재사용) — 펼친 상태는 필터를 바꿔도 접히지 않고 유지("고정", `.fi-done` 아코디언 상태 보존과 같은 스냅샷 방식). 펼친 내용 안에 "Journaling에서 열기" 버튼을 따로 둬서 실제 편집 이동은 그대로 유지. `.shell:has(.view-archive:not([hidden])){max-width:900px}`로 본문 폭 확장(Assignment Manage·Future Item과 같은 패턴). 로컬 미리보기에서 드롭다운 펼침·필터 전환 시 유지·"Journaling에서 열기" 이동·폭 확장(900px)까지 확인 | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-8, `journal.js` 20260913-4) · GitHub 배포 예정 |
| 2026-09-13 | Claude Code | 사용자 요청 묶음 처리(7건): (1) Future Item 본문 폭 1100px→1300px. (2) Journaling `#editor{max-height:55vh;overflow-y:auto}`로 작성 영역만 자체 스크롤 — 글이 길어져도 위 과목 칩·날짜·도구줄은 항상 그 자리에 고정(`.archive-preview`는 같은 `.editor` 클래스를 쓰지만 이 규칙은 ID 선택자라 적용 안 됨). (3) 서식 줄(B·I·U·S·인용·코드)을 "드래그해야 나타남"에서 상시 노출로 원복(`.format-bar`의 `hidden` 제거, `refreshFormatState()`의 토글 로직만 삭제). (4) Journal Archive 각 행에 Future Item 행과 같은 `⋯` 메뉴 추가("수정하기" → `openJournal`) — `<summary>` 안의 버튼이라 렌더링마다 직접 리스너를 달아 `stopPropagation()`으로 아코디언 토글과 충돌하지 않게 처리, 기존 "Journaling에서 열기" pill은 제거. (5) Archive 미리보기의 4F 박스·과목 박스가 왼쪽으로 잘리던 문제 수정(`.archive-preview h3,.archive-preview .course-box{margin-left:0}`). (6) 본문 삽입 "과목" 박스 메뉴에 General 추가(`courseName`/`courseBoxInner`가 `'general'` 특수 처리). (7) 디스코드 저널 포맷(백틱 `` `fact`/`feeling`/`findings`/`Future item` `` 4F 라벨, `**TF**` 등 굵은 과목 단독줄) 붙여넣기 자동 인식 구현 — 4F 소제목·과목 박스로 변환하고 과목 박스는 기존 `collectFutureItems()` 규칙에 그대로 올라타 Future Item 등록 시 과목별로 자동 분류됨. 같은 붙여넣기 핸들러에서 빈 줄 1개가 3개로 붙여넣어지던 버그도 수정 — 원인은 Windows `\r\n`을 정규화하지 않고 `execCommand('insertText')`에 넘겨 Chrome이 `\r`·`\n`을 각각 별도 줄바꿈으로 처리한 것; 붙여넣기 시 `\r\n?`→`\n` 정규화 후 여러 줄이면 새 변환 경로로, 줄바꿈 없는 한 줄이면 기존 `insertText`로 분기(짧은 텍스트 붙여넣기 동작은 그대로). 로컬 미리보기에서 CRLF로 조인한 디스코드 예시 텍스트를 실제 `paste` 이벤트로 재현해 4F 헤딩·과목 박스·다룬 과목 자동 반영·Future Item 등록(General·SI 박스 정상 분류)·빈 줄 정규화(3줄 아님)까지 전부 확인, 폭 확장(1300px)·에디터 스크롤(max-height 396px 확인)·서식 줄 상시 노출·과목메뉴 General·Archive ⋯메뉴·4F 잘림 수정도 각각 확인 후 테스트 데이터 제거 | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-9, `future.js` 20260913-6, `journal.js` 20260913-5) · GitHub 배포 예정 |
| 2026-09-13 | Claude Code | 사용자 요청 묶음 처리(5건): (1) Journaling도 Journal Archive와 같은 900px로 폭 확장 — 그 과정에서 `#view-journal`에 다른 뷰들과 달리 `view-journal` 클래스가 없어 `:has()` 선택자가 매칭 안 되던 것을 발견해 클래스를 추가. (2) 라이브 에디터의 4F 박스 왼쪽 잘림 수정 — 원인은 바로 전 커밋에서 추가한 `#editor{overflow-y:auto}` 자체의 회귀: 스펙상 한 축만 `auto`로 두면 다른 축(`overflow-x`)도 강제로 `auto`가 돼, `.editor h3`/`.course-box`가 `--tab-pad-x`만큼 왼쪽으로 당기던 음수 마진이 그대로 잘렸다. `#editor h3,#editor .course-box{margin-left:0}`(Archive 미리보기 규칙과 합침)로 해결. (3) Journal Archive "수정하기"가 Journaling 탭으로 이동하던 것을 Journal Archive 탭 안에서 바로 고칠 수 있도록 변경 — `.journal` 작성 섹션 DOM 노드를 `#archive-compose-slot`으로 그대로 옮겨오는 방식(복제 아님, 기존 load/save 로직 무변경)이라 `enterArchiveEdit`/`exitArchiveEdit`만 추가했다. "← Journal Archive 목록으로" 버튼과 `phibrain:view`(다른 탭 이동) 양쪽 다 저장 후 원래 자리로 되돌린다. (4) Future Item 본문 폭 1300px→1500px. (5) Journal Archive에서 특정 과목 필터를 고르면 전체 저널 대신 그 과목 내용만 뽑은 카드 그리드로 전환(`courseChunks()`가 과목 박스~다음 과목 박스/4F 소제목 구간을 그 과목 몫으로 추출, 과목 박스가 없으면 항목 전체로 대체) — Future Item의 `.fi-box` 스타일 재사용, 2열 그리드(720px 이하 1열). 카드 `⋯` 메뉴에 "즐겨찾기"(신규 저장 키 `phi-brain:journal-archive:favorites`, `(date, course)` 단위)를 추가해 즐겨찾기한 카드가 그 필터 안에서 맨 앞에 오도록 정렬. 로컬 미리보기에서 폭 확장(900px/1500px)·4F 잘림 해결·Archive 안에서 편집 시작→저장→"뒤로"·다른 탭 직접 이동 시에도 자동 복귀·카드 그리드(2열 실측)·즐겨찾기 토글과 정렬·모바일 폭(720px 이하 1열)까지 전부 확인 후 테스트 데이터 제거 | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-10, `future.js` 20260913-7, `journal.js` 20260913-6) · GitHub 배포 예정 |
| 2026-09-13 | Claude Code | 사용자 요청 묶음 처리(5건, 항목 ⋯ 메뉴 제거 방식은 AskUserQuestion으로 확인 후 진행 — "원문 저널 열기는 없애고, 삭제는 우측에 x버튼"): (1) Future Item 활동(activity)도 박스처럼 드래그로 순서 변경 가능(`reorderItem` 추가 — `boxOrder` 같은 별도 필드 없이 새 순서대로 `placedAt`을 다시 찍어 인코딩; 드래그 대상이 같은 박스의 다른 행이면 재정렬, 다른 박스면 기존처럼 소속 변경). (2) 행동 문장·마감을 더블클릭하면 바로 수정 상태로 들어가도록 변경(`onListDblClick`), 마감이 없는 항목엔 더블클릭 가능한 옅은 "+ 마감" 표시를 새로 추가. 항목 우측 ⋯ 메뉴(수정·마감·소속 변경·원문 저널 열기·삭제)를 통째로 제거하고 삭제만 작은 `✕` 버튼(`.fi-delete`, 기존 되돌리기 토스트 그대로)으로 남김 — `openItemMenu`/`openScopeMenu`/`scopeListHTML`/`pickScope`와 이제 아무도 안 부르는 `future.js`의 `monthDay`까지 죽은 코드로 함께 제거. (3) 과목/커스텀 박스 우측 상단에 즐겨찾기 별표(`.fi-box-fav`, 항상 ★ 모양, 기본 `--gray`→즐겨찾기 시 `--ink` #333333)를 추가해 클릭 한 번으로 토글 — 기존 ⋯ 메뉴의 "즐겨찾기"/"즐겨찾기 해제" 항목은 없앴고, 그 결과 실제 과목(비커스텀) 박스는 ⋯ 메뉴 자체가 완전히 사라짐(이름바꾸기·삭제 둘 다 커스텀 전용이라). (4) Journal Archive의 카드에도 같은 `.fi-box-fav` 별표를 그대로 재사용해 즐겨찾기 적용 — 카드 ⋯ 메뉴는 다시 "수정하기" 하나로 단순화. (5) `#archive-filters{margin-bottom:10px}`로 필터 줄과 목록/카드 사이 여백 추가. 로컬 미리보기에서 활동 드래그 재정렬(실제 순서 반전 확인)·더블클릭 텍스트 수정/마감 설정·✕ 삭제·과목 박스 별표 클릭 시 색 변경(rgb(153,153,153)→rgb(51,51,51))과 즐겨찾기 섹션 이동·Archive 카드 별표와 메뉴 단순화·필터 여백(10px 실측)까지 전부 확인. 편집 도중 dev-server 자동새로고침이 남긴 것으로 보이는 과거 콘솔 오류(`SyntaxError`/`Cannot destructure COURSES`)는 깨끗한 재로드에서 오류 0건으로 재확인해 현재 상태와 무관함을 확인 | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-11, `future.js` 20260913-8, `journal.js` 20260913-7) · GitHub 배포 예정 |
| 2026-09-13 | Claude Code | 사용자 요청 처리(4건, 사용자가 스크린샷 2장 첨부 — 브라우저 기본 datetime-local 위젯 vs 작성 카드의 pill 두 개 스타일): (1) **마감 선택을 네이티브 위젯에서 작성 카드와 같은 UI로**: 항목의 시계 아이콘을 누르면 뜨던 `<input type="datetime-local">`(브라우저 기본 달력)을 완전히 제거하고, 작성 카드와 똑같이 생긴 "M월 D일 ▾"/"시간 선택 ▾" pill 두 개짜리 플로팅 팝오버(`#fi-rowdue-pop`, `.datepicker`/`.tp-col` 세 번째 인스턴스 — Journaling·작성 카드에 이어, 관례대로 별도 id·상태)로 교체. 순수 헬퍼(`pad2`/`isoDate`/`todayIso`/`dateFromIso`/`timeParts`/`to24h`/`timeLabel`/`MINUTE_STEP`)는 작성 카드 코드와 그대로 공유. 날짜·시간을 고를 때마다 `setDue()`로 바로 커밋, "마감 없음"/"지우기" 버튼도 추가. `editingDueId`·`.fi-due-edit`·관련 렌더 분기는 전부 죽은 코드가 돼서 제거. (2) 즐겨찾기 별표를 텍스트 `★`에서 사용자가 준 SVG 두 장(`star_gray.svg`/`star_black.svg`, `design/prototypes/assets/star-gray.svg`·`star-black.svg`로 복사)으로 교체 — `.fi-box-fav`가 이제 `background-image`를 바꿔 끼우는 방식(색 전환 아님), 좁은 박스에서 찌그러지지 않도록 `flex:0 0 auto` 추가. (3) 마감 없는 행동의 "+ 마감" 안내를 완전히 제거(둘째 줄 자체가 없어짐) — 시계 아이콘이 그 자리를 대신함. (4) 행 우측에 펜(수정)·시계(마감)·✕(삭제) 아이콘 3개를 이 순서로 항상 노출 — 지난 커밋에서 만든 더블클릭 전용 방식을 대체. 펜·시계는 `.ico-quote` 방식(순수 CSS)으론 모양이 안 나와 인라인 SVG(`stroke="currentColor"`, `.pill.pill-icon` 28px 버튼 안 12px 아이콘)로 새로 그림, ✕는 기존 텍스트 글자 유지. **구현 중 발견한 회귀**: 아이콘이 2개 늘면서 좁은 4열 그리드(실측 뷰포트 1024px, 박스 폭 ~149px)에서 `.fi-text`가 다시 글자 단위로 쪼개지는, 이전에 마감 배지로 겪었던 것과 같은 버그가 재발 — `.fi-row-main{flex-wrap:wrap}` + `.fi-text{min-width:80px}`로 해결(좁으면 아이콘 3개가 텍스트 줄 아래로 자연스럽게 줄바꿈). 로컬 미리보기에서 팝오버 열기·날짜/시간 선택 후 즉시 커밋·"마감 없음"으로 지우기(격리된 순차 테스트로 확인 — 처음 합쳐서 테스트했을 때 팝오버를 두 번 눌러 토글-닫힘된 걸 오인해 실패로 착각했던 해프닝 있었음)·별표 SVG 교체와 크기 고정·마감 없는 행 배지 없음·아이콘 3개 줄바꿈까지 전부 확인 후 테스트 데이터 제거 | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-12, `future.js` 20260913-9, `journal.js` 20260913-8) · GitHub 배포 예정 |
