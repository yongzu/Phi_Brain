# Phi Brain — 작업 상태와 인계

최종 갱신: 2026-09-19 (Assignment Manage 과목 즐겨찾기 · 과제 내용 이어 붙이기) / Claude Code

**참고(다음에 이 저장소를 여는 사람 — Codex 포함):** 예전에 여기 적혀 있던 "로컬 DB의 `demo-` 가짜 근거 행"은 M1 완료 후 **삭제했다**.
로컬 `server/data/assignment-manage.sqlite`(git 미포함)의 "제출 확인"은 이제 전부 실제 Gmail 확인메일 매칭 결과다.

## 현재 단계

### Assignment Manage: 과제 내용 이어 붙이기 · 팝업 어디든 더블클릭으로 전체보기 (2026-09-19, 사용자 지시 · Claude Code)

- **이어 붙이기**: 저장된 과제 내용을 보는 팝업 맨 아래에 입력창(`.am-note-append`)과 "추가" 버튼. 쓴 내용은 기존 공지 아래에 빈 줄 하나 띄우고 붙어
  **같은 공지 하나로** 저장된다(PUT, `baseVersion` = 보고 있던 버전). Ctrl/⌘+Enter로도 추가. 빈 칸이면 버튼이 꺼져 있다.
  - 마감: 이미 있는 마감은 그대로. 직접 입력한 마감이 아니고 비어 있던 칸만, 합친 글에서 찾은 마감으로 채운다.
  - 추가하면 입력창을 비우고 방금 붙은 곳이 보이게 스크롤, 토스트 "과제 내용을 추가했어요 · 되돌리기"(되돌리면 추가 전 글로 다시 저장).
  - 다른 기기에서 먼저 바뀌었으면(409) 최신 공지를 불러와 보여주고, 쓴 내용은 입력창에 남겨 다시 누르게 한다.
  - 쓰다가 닫아도(✕·Esc·바깥 클릭) 같은 과목·주차를 다시 열면 입력창에 그대로 있다(새로고침 전까지).
- **더블클릭 전체보기 넓힘**: 보기 상태의 팝업은 본문뿐 아니라 제목·마감 줄 등 **어디를 더블클릭해도** 전체보기 ↔ 작게 보기.
  링크·버튼·입력창·⋯ 메뉴 위에서는 제외(입력창 더블클릭은 단어 고르기 그대로). 표의 "자세히보기" 더블클릭은 이전처럼 바로 전체보기.
- Future Item 별표(과목명 왼쪽, 7cc1745)는 사용자 확인으로 그대로 유지.
- `home.html`: `assignment.js?v=20260919-3`, `phi-brain.css?v=20260919-4`.
- 검증(로컬, 가짜 로그인·가짜 API로 만든 임시 페이지 — 확인 후 삭제): 추가 → 저장 글이 "기존

추가", baseVersion 1, 본문에 표시·입력창 비움;
  되돌리기 → baseVersion 2로 원래 글 저장; 충돌 → 최신 글 표시 + 입력 내용 유지; 닫았다 열어도 입력 내용 유지;
  제목 더블클릭 → 전체보기, 마감 줄 더블클릭 → 작게, 입력창 더블클릭 → 무시, 자세히보기 더블클릭 → 전체보기. 실제 서버로는 확인 못 함.

### Assignment Manage: 과목 즐겨찾기 → 표 맨 위로 (2026-09-19, 사용자 지시 · Claude Code)

- **요청**: 과목명 왼쪽에 즐겨찾기 버튼 — 당장 해야 할 과제의 과목을 표 상단에.
  (앞선 같은 요청을 Future Item으로 알아듣고 그쪽 별표를 과목명 왼쪽으로 옮겼는데(7cc1745), 실제로는 이 표를 말한 것이었다. Future Item 쪽은 그대로 두었다.)
- 과목 칸 맨 앞에 Future Item과 같은 별표(`.fi-box-fav.am-fav`). 누르면 그 과목 줄이 표 맨 위 즐겨찾기 묶음으로 올라가고(누른 순서대로 끝에 붙음),
  다시 누르면 원래 과목 순서 자리로 돌아간다. 묶음 마지막 줄 아래 선만 회색(`tr.am-fav-last`)으로 나머지와 가른다.
- 줄은 새 자리로 미끄러져 간다(FLIP 320ms, 동작 줄이기 설정이면 생략). 포커스는 누른 별표에 남고, 열린 팝업은 옮겨 간 칸을 따라간다.
- 저장: 과목 코드 목록을 `localStorage`의 `phi-brain:assignment-favorites`에 — **이 기기(브라우저)에만** 남는다(서버·다른 기기와는 동기화 안 함).
  주차를 바꿔도, 로그인 전 읽기 전용 표에서도 똑같이 적용된다.
- 과목명의 호버 배경이 별표를 덮지 않게 별표 뒤 과목명의 왼쪽 음수 여백을 -6px로 줄였다.
- `home.html`: `assignment.js?v=20260919-2`, `phi-brain.css?v=20260919-3`.
- 검증(로컬, 읽기 전용 표 12과목): BI·IAE를 누르면 순서가 BI, IAE, AL, AOR… 로 바뀌고 IAE 줄에 구분선, 포커스는 IAE 별표, 저장값 ["BI","IAE"];
  다시 누르면 원래 순서로 복귀. 테스트 저장값은 지움.

### Assignment Manage: 과제 내용 "전체보기" (2026-09-19, 사용자 지시 · Claude Code)

- **요청**: "자세히보기" 팝업(440px, 칸 옆)이 답답하다 — 크게 볼 수 있게, 더블클릭이나 ⋯ 메뉴로.
- **전체보기**(`.am-detail.is-expanded`): 화면 가운데 큰 창(최대 880px 폭, 위아래 32px 여백, 길면 창 안에서 스크롤). 본문 줄간격 1.7, 붙여넣기 칸 최소 높이 420px(또는 화면 절반).
  위치는 `placeDetail()`이 계산한다 — 작은 팝업과 같은 좌표 기준을 써야 해서(CSS 가운데 맞춤은 부모 요소 기준이 될 때가 있었다).
- **여는 길 셋**: ① 표의 "자세히보기" **더블클릭**(두 번째 클릭이 팝업을 닫지 않게 `e.detail > 1`은 무시) — 공지가 없는 과목은 큰 붙여넣기 창으로 열린다,
  ② 보기 상태에서 공지 **본문 더블클릭**(다시 하면 작게, 링크 더블클릭은 제외, 더블클릭이 고른 단어 선택은 지움),
  ③ **⋯ 메뉴 맨 위 "전체보기"**(크게 본 상태에선 "작게 보기"), 그 아래 구분선 · 수정하기 · 삭제하기.
- 전환할 때 같은 흐림→선명 등장(popIn)으로 새 자리에 나타난다. 수정 중에 바꿔도 붙여넣은 글과 커서 위치는 그대로.
  닫으면(✕·Esc·바깥 클릭) 다음엔 다시 작은 팝업으로 열린다. 640px 이하 모바일은 화면 가장자리 16px까지 꽉 채운다.
- `home.html`: `assignment.js?v=20260919-1`, `phi-brain.css?v=20260919-2`.
- 검증(로컬, 가짜 로그인·가짜 표 데이터를 넣은 임시 페이지 — 확인 후 삭제): 더블클릭 → 880px 창이 가운데(1280×720에서 좌우 200·위아래 32),
  본문 더블클릭 → 작게, ⋯ → 전체보기/작게 보기 글자 바뀜, 빈 과목 더블클릭 → 큰 붙여넣기 창에 포커스, Esc 뒤 다시 열면 작은 팝업. 실제 서버 데이터로는 확인 못 함.

### 데스크톱 앱에서 Desktop App 상자 숨김 · Future Item 별표를 과목명 왼쪽으로 · 바깥 링크 브라우저 (2026-09-19, 사용자 지시 · Claude Code)

- **Desktop App 상자**: 데스크톱 앱 안에서는 오른쪽 위 내려받기 상자를 지운다(`home.html` 인라인 스크립트).
  앱의 preload가 놓는 `window.phiDesktop` 또는 User-Agent의 `Electron/`으로 알아본다 — 페이지 쪽 변경이라 이미 설치된 앱도 다시 깔 필요가 없다.
  상자가 빠지면 프로필 버튼(`margin-left:auto`)이 오른쪽 끝을 차지한다.
- **즐겨찾기 별표**: 과목·커스텀 박스 머리줄의 별표를 오른쪽 끝에서 **과목명 바로 왼쪽**(손잡이 ⠿ 다음)으로 옮겼다(`.fi-box-fav-lead`).
  동작은 그대로 — 누르면 박스가 맨 위 "즐겨찾기" 줄로 올라가고, 다시 누르면 "과목" 줄로 돌아간다. 커스텀 박스의 ⋯ 메뉴가 대신 오른쪽 끝(`margin-left:auto`).
  Findings·Archive 카드의 별표는 같은 `.fi-box-fav`를 쓰지만 손대지 않았다(여전히 오른쪽 끝).
  누른 뒤 포커스가 없는 `[data-box-menu]`(과목 박스엔 없음)로 가던 것을 별표 자신으로 고쳤다.
- **바깥 링크가 Edge로 열림**: 코드는 이미 `shell.openExternal`(Windows 기본 브라우저)로 연다. 사용자 PC를 확인해 보니
  예전 `UserChoice`는 Chrome이지만 Windows 11이 실제로 쓰는 `UserChoiceLatest`(http/https)가 **Edge(MSEdgeHTM)**였다 — 코드가 아니라 Windows 설정 문제라
  사용자가 설정 → 앱 → 기본 앱 → Chrome → "기본값으로 설정"을 누르면 해결된다. 코드는 바꾸지 않았다.
- `home.html`: `phi-brain.css?v=20260919-1`, `future.js?v=20260919-1`.
- 검증(로컬): 머리줄 순서가 손잡이 → 별표 → 과목명 → 개수, 별표를 누르면 그 박스가 즐겨찾기 줄 맨 앞으로 오고 포커스가 별표에 남음, 다시 누르면 원래대로.
  Electron User-Agent 판별 정규식 확인(일반 Chrome에선 상자 유지). 테스트로 누른 즐겨찾기는 되돌림.

### Future Item: Ctrl+Z로 되돌리기 (2026-09-18, 사용자 제보 · Claude Code)

- **제보**: 행동을 다른 박스로 옮긴 뒤 Ctrl+Z가 아무 일도 하지 않았다. 되돌리기는 토스트의 "되돌리기" 버튼에만 있었고,
  그 버튼은 6초 뒤 사라져 그때부터는 손으로 되돌릴 수밖에 없었다.
- **되돌리기 목록(undoStack)**: 되돌릴 일이 생길 때마다 "원래대로 돌리는 함수"를 최대 30개까지 쌓는다.
  토스트 버튼과 Ctrl+Z는 **같은 항목**을 쓰고, 각 항목은 한 번만 실행된다(버튼으로 되돌린 걸 Ctrl+Z가 또 되돌리지 않는다).
  Ctrl+Z를 다시 누르면 그 다음으로 최근의 일을 되돌린다. 더 없으면 "되돌릴 게 없어요".
- 되돌릴 수 있는 일: **소속 이동 · 삭제 · 완료/완료 취소 · 같은 박스 안 순서 · 박스 순서 · 커스텀 박스 삭제**.
  박스 순서는 되돌릴 때도 FLIP 애니메이션으로 미끄러져 돌아간다.
- 단축키는 **Future Item 화면에서만** 듣는다(Ctrl 또는 ⌘ + Z, Shift·Alt 조합은 제외).
  글자를 치는 칸(작성 textarea, 이름 수정 input, 저널 본문)에서는 가로채지 않고 브라우저의 글자 실행취소를 그대로 둔다.
  체크박스처럼 글자를 담지 않는 요소에 포커스가 있을 때는 동작한다 — 처음 구현에서 `INPUT` 전체를 건너뛰어 체크 직후 Ctrl+Z가 먹지 않던 것을 고쳤다.
- 로그인·로그아웃이나 서버 보드로 바뀌면(`futureStore.replace`) 쌓아 둔 되돌리기는 지운다 — 다른 보드에는 맞지 않기 때문.
- `home.html`: `future.js?v=20260918-3`.
- 검증(로컬, 가짜 항목 2개): 이동 → Ctrl+Z로 원래 박스 복귀(localStorage까지 확인), 한 번 더 누르면 "되돌릴 게 없어요",
  삭제 → 복원, 완료 체크(체크박스 포커스 상태) → 완료 취소, 박스 순서 → 원래 순서, 토스트 버튼으로 되돌린 뒤 Ctrl+Z는 같은 일을 다시 되돌리지 않고 그 이전 일을 되돌림,
  작성 칸 안에서는 keydown을 가로채지 않음(defaultPrevented 아님). 테스트 데이터 삭제.

### Future Item 박스 드래그: 머리줄 손잡이로만 · 꽂힐 자리 선 · 이동 애니메이션 (2026-09-18, 사용자 제보·지시 · Claude Code)

- **버그**: 박스 순서를 바꾸려고 끌었는데 행동(항목)이 다른 박스로 들어가는 일이 있었다.
  원인은 박스 전체가 `draggable`이었던 것 — 박스 본문에는 행(`.fi-row`)도 각자 draggable이라,
  잡은 지점이 행이면 박스가 아니라 **행**이 끌리고, 그대로 다른 박스에 놓여 소속이 바뀌었다.
- **수정**: `draggable`을 박스(`section.fi-box`) → **머리줄(`.fi-box-head`)** 로 옮겼다. 박스는 머리줄에서만 끌린다.
  머리줄 맨 앞에 손잡이 `⠿`(`.fi-box-grip`)를 뒀다 — 평소엔 테두리 색으로 조용히 있다가 박스에 마우스를 올리면 회색으로 또렷해진다.
  머리줄의 별표·⋯ 버튼이나 이름 수정 중에는 드래그가 시작되지 않고(`preventDefault`), 본문·빈 자리에서 시작한 드래그도 막는다.
  상단 고정 박스(General·임시)는 예전처럼 순서 대상이 아니라 머리줄에 `draggable`이 붙지 않는다.
- **인터랙션 3가지**
  1. 끌리는 그림(drag image)은 머리줄이 아니라 **박스 전체**(`setDragImage`) — 무엇을 옮기는지 분명하다.
  2. 놓을 자리는 박스를 칠하는 대신 **세로 선**으로 보여준다(`.box-drop-before/.box-drop-after`, 칸 사이 16px 틈 한가운데).
     `reorderBox`와 같은 규칙이라 선이 그어진 쪽이 실제로 꽂히는 자리다(앞 박스를 끌면 목표 뒤, 뒤 박스를 끌면 목표 앞).
  3. 놓은 뒤에는 순서가 바뀐 박스들이 **새 자리로 미끄러져 들어간다**(FLIP, 320ms). `prefers-reduced-motion`이면 생략.
- 행(항목) 드래그는 그대로다: 박스·필터로 끌면 소속 변경, 같은 박스 안 다른 행 위에 놓으면 순서 변경.
- `home.html`: `phi-brain.css?v=20260918-6`, `future.js?v=20260918-2`.
- 검증(로컬, 가짜 항목 3개, 드래그 이벤트 합성): 박스 본문에서 시작한 드래그는 아무것도 끌지 않음(defaultPrevented),
  머리줄에서 시작하면 박스 드래그 시작, 다른 박스 위에서 `box-drop-before` 선 표시(#333), 놓으면 순서 AL·AOR·BI → AL·BI·AOR로 바뀌고
  FLIP 애니메이션 12개(transform) 실행, 드래그 흔적 클래스 0개. 상단 고정 박스와 "+ 박스 추가" 타일은 박스 드롭을 받지 않음.
  행 드래그는 여전히 다른 박스로 이동(토스트 "AL_Aesthetic Literacy 박스로 옮겼어요"). 테스트 데이터 삭제.
- 남은 것: 터치·키보드로는 여전히 박스 순서를 바꿀 수 없다(HTML5 드래그는 마우스 전용). 필요하면 ⋯ 메뉴에 "왼쪽/오른쪽으로 옮기기"를 넣는 방법이 있다.


### 왼쪽 탭 순서 변경 · 첫 화면 Future Item · Journal Archive → Archive (2026-09-18, 사용자 지시 · Claude Code)

- 가장 중요한 두 기능을 맨 위 대표 탭으로 올렸다: **Future Item**(첫 화면) **→ Assignment Manage** 순서로 나란히.
  둘 다 예전 Journaling 탭이 쓰던 12pt·볼드 — CSS는 `.nav-tab[data-view="journal"]` → `.nav-tab[data-view="future"],.nav-tab[data-view="assignment"]`.
  그룹 머리글(Management·Course Agent)은 기본 크기 그대로.
- **Management 묶음은 삭제**했다(사용자 지시). Journaling · Findings · Archive 세 탭이 머리글 없이 대표 탭 두 개 아래에 선다.
  글자는 기존 tab2(회색·기본 크기) 그대로 두고 들여쓰기만 없앴다 — 위에 머리글이 없으니 대표 탭과 같은 왼쪽 선(32px)에 맞췄다:
  `.side-nav>.nav-group>.nav-tab.tab2{margin-left:0}` (Course Agent 묶음 안의 과목 탭은 예전처럼 들여쓴 채로).
- `Journal Archive` 탭 이름만 **Archive**로 바꿨다. 화면 제목(h1)·해시(`#journal-archive`)·`data-view` 값은 그대로 둬서
  journal.js의 라우팅과 데스크톱 앱 단축키(`desktop/preload.js`의 `[data-view="journal"]`)가 그대로 동작한다.
- 첫 화면: `future.js`의 기본값을 journal → future로 바꿨다(`currentView` 초기값, `show()` 폴백, `route()`).
  해시 없이 열면 Future Item이 뜨고 주소는 `#future-item`이 된다. `#journal`로 들어오면 Journaling을 연다(예전엔 해시 없음 = Journaling).
- 최종 순서: Future Item · Assignment Manage / Journaling · Findings · Archive / Course Agent(12과목).
- Course Agent는 **예전처럼 늘 펼친 목록**이다. 중간에 "호버·클릭으로 열리는 드롭다운 + 펼침 애니메이션"을 넣었다가
  사용자 지시로 **되돌렸다**(드롭다운도 인터랙션도 없앤다). 넓은 화면에서는 클릭해도 접히지 않고, 좁은 화면(860px 이하)에서만 아코디언으로 접힌다 — 예전 동작 그대로.
- `home.html`: `phi-brain.css?v=20260918-5`, `future.js?v=20260918-1`.
- 검증(로컬, 1440px): 첫 로드 = Future Item·`#future-item`, 맨 위/맨 아래 탭 16px·700(예전 Journaling 탭과 동일), Archive 라벨 확인,
  다섯 탭 모두 클릭 시 해당 화면과 active 표시 정상, 대표 탭 둘 16px·700 · 나머지 네 탭 모두 왼쪽 선 32px 정렬 확인.
  Course Agent: 되돌린 뒤 첫 로드부터 과목 12개가 보이고(사이드바 735px), 클릭·호버로 아무 일도 일어나지 않으며 사이드바 애니메이션 0개 확인.
  375px에서 세 탭이 한 줄로 접히고, Course Agent도 접힌 채 시작해 탭하면 열린다(176 → 468px). 가로 스크롤 없음.

### Findings: 즐겨찾기만 모아 보는 필터 (2026-09-17, 사용자 지시 · Claude Code)

- 필터 줄의 All 바로 옆에 **"즐겨찾기" pill**(별표한 박스 수 표시). **별표가 하나도 없으면 그리지 않는다** — 빈 과목 pill을 안 그리는 규칙과 같다.
- 과목 필터와 **배타적**으로 뒀다: 즐겨찾기를 켜면 과목 선택이 풀리고, 즐겨찾기 상태에서 과목을 고르면 그 과목만 본다.
  겹치게 하면 "BI 중 별표"인지 "BI 또는 별표"인지 사용자가 알 수 없다(복수 선택 규칙과 충돌).
- 순서는 별표한 순서 그대로. 저널을 고쳐 사라진 Finding의 별표는 셈과 목록에서 자동으로 빠진다(키가 어떤 카드와도 안 맞으면 무시).
- 별표를 켜고 끌 때 pill 개수도 같이 갱신하고, **즐겨찾기 보기에서 마지막 별표를 끄면 All로 돌아간다**(빈 화면에 갇히지 않게).
  별표가 없는 상태로 `#findings/fav` 딥링크를 열어도 All로 떨어진다.
- 해시: `#findings/fav`. 기존 `#findings/BI,EWA`(복수 과목) 형식은 그대로.
- `journal.js?v=20260917-1`. 검증(로컬, 가짜 저널 2개 · Finding 4개): pill 등장·개수 2, 즐겨찾기 클릭 시 별표 2개만 별표 순서로,
  즐겨찾기→BI 선택 시 BI 2개·해시 `#findings/BI`, 별표 하나 해제 시 1개 남고, 마지막 해제 시 All(4개)·해시 `#findings`,
  `#findings/fav` 새로고침 시 그대로 유지, 별표 없는 상태의 같은 딥링크는 All. 테스트 데이터 삭제.

### macOS 차단 해제 안내 정정 — "우클릭 → 열기"는 더 이상 통하지 않는다 (2026-09-17, 사용자 제보 · Claude Code)

- 사용자가 맥에서 dmg를 열자 **"'Phi Brain'을(를) 열지 않음 / 악성 코드가 없음을 확인할 수 없습니다"** 대화상자가 떴고,
  버튼이 **"완료" 하나뿐**이었다. macOS 15(Sequoia)부터 우클릭 → 열기 우회가 막혔다 — 내가 앞서 적어 둔 안내가 구버전 기준이라 틀렸다.
- 맞는 절차: ① dmg에서 **응용 프로그램으로 옮긴 뒤** 실행(사용자는 dmg 창에서 바로 연 것으로 보인다) → ② 차단 대화상자 완료 →
  ③ **시스템 설정 → 개인정보 보호 및 보안** 아래 "차단되었습니다" 옆 **그래도 열기** → ④ 다시 실행. 터미널 대안 `xattr -dr com.apple.quarantine`.
- 고친 곳: 화면 `home.html`의 내려받기 메뉴 안내 문구(두 줄 → OS별 세 줄, 메뉴 폭 210→260px), `docs/DESKTOP.md` 맥 절차.
- 근본 해결은 Apple Developer Program(연 $99) + 공증뿐 — 그 전까지는 받는 사람마다 이 과정을 한 번 겪는다. **사용자 결정 사항.**

### 머리줄 Desktop App 내려받기 박스 (2026-09-17, 사용자 지시 · Claude Code)

- 프로필을 한 칸 왼쪽으로 밀고 그 끝자리에 **#333333 채움·흰 글씨** 박스를 넣었다(`.profile-trigger`의 `margin-left:auto`는 그대로,
  그 뒤에 온 `.desktop-dl`이 끝자리를 가져간다).
- 누르면 작은 메뉴: **Windows(.exe) · macOS(.dmg)** 두 줄과 한 줄 안내(“Windows는 추가 정보 → 실행, macOS는 우클릭 → 열기”).
  바깥 클릭·Esc로 닫히고, 내려받기를 시작하면 닫힌다. 다른 팝업(`.course-menu`)과 같은 방식이라 새 컴포넌트를 만들지 않았다.
- **파일명에서 버전을 뺐다**(`PhiBrain-Setup.exe` / `PhiBrain.dmg`, 앱 버전 0.1.1). 페이지가 `releases/latest/download/<파일명>`을 가리키므로
  새 버전을 내도 **페이지를 고칠 필요가 없다.** 대신 파일만 봐서는 버전을 알 수 없다(릴리스 태그로 확인).
- 검증: 로컬 1280px — 박스 배경 `rgb(51,51,51)`·글자 흰색, 프로필이 왼쪽(오른쪽 끝 1093px)에 서고 박스가 끝자리(1117~1233px).
  375px에서도 메뉴가 화면 안에 들어오고 가로 스크롤 없음. `v0.1.1` 태그로 실제 배포 → 릴리스에 두 파일 첨부,
  페이지가 쓰는 주소 두 개 모두 206(부분 내려받기 성공)으로 실제 파일 반환 확인.
- 남은 것: 사용자가 요청한 "다운로드 **페이지**"는 머리줄 박스로 구현했다. 별도 랜딩 페이지가 필요하면 추가 작업.

### 배포용 파일: 플랫폼당 하나 + 릴리스 고정 주소 (2026-09-17, 사용자 지시 · Claude Code)

- 사용자 질문("단일 exe로 가능한가") 확인 결과 **이미 단일 파일이었다** — `7za l`로 설치 파일 안에 앱 73개 파일이 모두 들어 있음을 확인.
  `desktop/dist`의 `win-unpacked`·`.blockmap`·`builder-debug.yml`은 빌드 부산물이라 배포 대상이 아니다.
- 다운로드 사이트를 만든다고 해서 파일명을 정리하고 맥을 **유니버설 dmg 하나**로 바꿨다(arm64·x64 따로 두 개 → 하나, 193MB).
  `PhiBrain-Setup-<버전>.exe`(85MB) / `PhiBrain-<버전>.dmg`.
- 워크플로 트리거 변경: main 푸시마다 돌리던 것을 **수동 실행 + `v*` 태그**로. 맥·윈도우 러너를 매번 쓰지 않기 위해서다.
  태그를 밀면 `gh release`로 두 파일이 **GitHub Releases에 첨부**되어 사이트에서 링크할 고정 주소가 생긴다.
- 검증: `v0.1.0` 태그 실제 푸시 → [run 35216915406](https://github.com/yongzu/Phi_Brain/actions/runs/35216915406) 맥·윈도우 모두 성공,
  [릴리스 v0.1.0](https://github.com/yongzu/Phi_Brain/releases/tag/v0.1.0)에 두 파일 첨부 확인.
- **사이트에 적어야 할 것:** 서명 없는 빌드라 Windows는 "추가 정보 → 실행", macOS는 "우클릭 → 열기"가 필요하다.
- 남은 숙제: 파일명에 버전이 들어가 있어 새 버전을 낼 때 사이트 링크도 같이 고쳐야 한다. 링크를 고정하려면 `artifactName`에서 버전을 빼면 된다(사용자 판단).

### 데스크톱 맥용 설치 파일 (2026-09-17, 사용자 지시 · Claude Code)

- **맥 앱은 맥에서만 만들 수 있다**(애플 `codesign`이 macOS 전용, Apple Silicon은 서명 없는 바이너리를 실행하지 않음).
  그래서 윈도우 PC에서 만들지 않고 `.github/workflows/desktop-build.yml`이 깃허브 맥 러너에서 빌드하게 했다(공개 저장소라 무료).
- 워크플로: `desktop/**` 변경 push 또는 수동 실행 → macos-14와 windows-latest에서 `npm ci` → `npm test` → `electron-builder`.
  `fail-fast: false`라 한쪽이 실패해도 다른 쪽 설치 파일은 받을 수 있다. 결과는 그 실행의 Artifacts(14일 보관), 저장소에는 넣지 않는다.
- `desktop/package.json`에 `mac` 설정 추가: dmg(arm64 + x64), 카테고리 productivity, **`identity: null`(서명 안 함)**.
  `CSC_IDENTITY_AUTO_DISCOVERY: false`로 러너가 인증서를 찾다 실패하지 않게 했다.
- 첫 실행 결과: [run 35216501888](https://github.com/yongzu/Phi_Brain/actions/runs/35216501888) 맥·윈도우 **둘 다 성공**.
  산출물 `phi-brain-mac` 215MB(dmg 2종), `phi-brain-windows` 85MB.
- **맥에서 처음 열 때 Gatekeeper가 막는다** — 앱 우클릭 → 열기로 한 번만 넘기면 된다. 정식 배포하려면 Apple Developer Program(연 $99)과 공증이 필요하다.
- **미확인:** 맥 실제 설치·실행·로그인 복귀(확인할 맥 기기가 없다). 윈도우 설치본도 사용자 확인 대기.
- 7단계(자동 업데이트)는 사용자 판단으로 **보류** — 화면은 서버에서 오므로 앱 껍데기가 바뀔 때만 의미가 있다.

### 데스크톱 6단계: Windows 설치 파일 (2026-09-17, 사용자 지시 · Claude Code)

- `desktop/package.json`에 electron-builder 설정 추가(`npm run dist` → `desktop/dist/Phi Brain Setup 0.1.0.exe`, 89MB).
  appId는 `design.phi.brain`(main.js `setAppUserModelId`와 일치), 아이콘은 기존 `assets/logo.png`.
  `files`에는 앱 파일만 — 화면은 배포 주소에서 읽으므로 `design/`은 넣지 않는다.
- `protocols: phibrain` 등록 — 설치본에서도 2단계 로그인 복귀가 되려면 필요하다(개발 실행은 `app.setAsDefaultProtocolClient`가 맡는다).
- NSIS: 관리자 권한 불필요(사용자 폴더 설치), 설치 경로 선택 가능, 바탕화면·시작 메뉴 바로가기, **제거해도 세션·창 상태는 남긴다**.
- `.gitignore`에 `desktop/dist/` 추가 — 설치 파일은 저장소에 올리지 않는다(7단계에서 GitHub Releases로 올릴 예정).
- **빌드 걸림돌과 해결(문서: docs/DESKTOP.md 6단계):** electron-builder가 winCodeSign 꾸러미를 풀며 macOS용 `.dylib` 심볼릭 링크를
  만들지 못해 실패(윈도우 심볼릭 링크는 관리자/개발자 모드 필요). 윈도우 빌드에 필요 없는 부분이라 `-xr!darwin`으로 캐시를 직접 만들어 통과시켰다.
  `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`. 관리자 PowerShell 빌드나 개발자 모드로도 해결된다.
- **코드 서명 없음** — 설치할 때 "알 수 없는 게시자" 경고가 뜬다. 본인 사용이면 무시 가능, 배포하려면 인증서 필요(사용자 결정 사항).
- **남은 확인(사용자):** 설치 → 바탕화면 아이콘 실행 → 로그인 유지 → 트레이·단축키. 특히 **설치본에서 `phibrain://` 복귀**가 되는지
  (개발 실행과 등록 경로가 다르다). 설치본과 개발 실행은 같은 `userData`를 쓰므로 로그인은 그대로 이어진다.

### 데스크톱 단축키: 숨기기 Ctrl+Backspace · Ctrl+X는 잘라내기 (2026-09-17, 사용자 지시 · Claude Code)

- 4단계 실동작 확인 결과 사용자 OK(X/Ctrl+X 숨김·트레이 복원, 확대·축소, Ctrl+Alt+J, Gmail 신규 연결 복귀 모두 동작). 이어 단축키만 조정.
- `desktop/shell.js`: 트레이 숨기기를 `Control+X` → `Control+Backspace`로, 잘라내기는 `Shift+Delete` 지정을 없애 기본 `Ctrl+X`로 환원.
  `before-input-event`에서 가로채는 키도 `x` → `backspace`(Shift 조합은 그대로 흘려보냄).
- `desktop/test/shell.test.cjs`: 해당 테스트를 "Ctrl+X는 가로채지 않는다 + Ctrl+Backspace로 숨는다 + 메뉴 가속기 표시"로 교체. 데스크톱 16개 통과.
- **알아둘 점(사용자 판단 필요):** 글을 쓰는 중 `Ctrl+Backspace`는 원래 **앞 단어 지우기**다. 이제 앱 어디서든 숨기기가 먼저 잡혀 그 기능을 쓸 수 없다.
  불편하면 `Ctrl+Shift+Backspace`나 다른 키로 옮기면 된다.

### 별표 순서가 간헐적으로 뒤바뀌던 것 수정 (2026-09-17, Claude Code)

- Codex가 4단계 회귀 검사에서 "Findings 별표 순서 테스트 1개 실패"로 남긴 항목의 원인을 찾아 고쳤다. **테스트 문제가 아니라 제품 버그였다.**
- 원인: `ORDER BY created_at, course`. `created_at`이 밀리초라 별표를 연달아 누르면 값이 같아지고, 그때 **과목 이름 알파벳순**으로 정렬돼 사용자가 누른 순서가 깨졌다.
  `test/settings.test.js`를 10회 돌려 8회 중 3회 실패로 재현.
- 수정 `worker/src/settings.js`·`worker/src/journals.js`: 동점일 때 넣은 순서(`rowid`)로 정렬. Journal Archive 즐겨찾기(`journal_favorites`)도 같은 문제라 함께 고쳤다.
- 검증: 같은 테스트 10회 연속 통과, 워커 전체 89개 통과. 배포 완료(버전 `2eb5fece-de96-4df6-ac25-851db5be11f7`). 마이그레이션 불필요(질의만 변경).
- 참고: 화면은 서버가 준 순서를 그대로 쓰므로 별도 변경 없음. 로그아웃(localStorage) 상태는 원래 배열 순서라 영향 없었다.

### 데스크톱 Ctrl+X 트레이 숨김 · 확대 단축키 수정 (2026-09-17, Codex)

- 사용자 요청 범위 두 가지: Ctrl+X로 트레이 숨김, 축소만 되고 확대가 안 되는 문제 수정.
- desktop/shell.js: Ctrl+X를 앱 내부 숨김에 배정, 잘라내기는 Shift+Delete로 충돌 해소. 확대는 Ctrl+=·Ctrl++·숫자패드 +를 직접 처리하고 메뉴도 같은 zoom 함수 사용. Ctrl+- 축소, Ctrl+0 원래 크기 유지.
- 변경 파일: desktop/{shell.js,test/shell.test.cjs}, docs/{DESKTOP,STATUS}.md. 서버·화면 파일 변경 없음.
- 검증: 데스크톱 테스트 16개 통과(Claude Code 재확인). 실행 중인 사용자 앱은 종료하지 않음; 적용하려면 트레이 종료 후 재시작 필요.

### 데스크톱 4단계 구현·검증 완료 (2026-09-17, Codex)

- 사용자 지시: 다음 작업 시작. 트레이·자동 실행·전역 단축키·메뉴 구현. 기본값은 Codex 구현 선택이며 사용자 실동작 확인 대기.
- 닫기(X) → 트레이 숨김, 트레이 클릭 → 복원. 트레이 메뉴 종료/앱 안 Ctrl+Q → 완전 종료. 숨겨진 창도 로그인·Gmail 복귀 및 두 번째 실행 시 표시.
- Ctrl+Alt+J → 창 복원·Journaling 이동·본문 포커스. 페이지 재로드 없이 현재 초안·날짜 유지. 등록 충돌은 메뉴에 안내, 앱 안 단축키는 사용 가능. 종료 시 단축키 및 트레이 해제.
- Windows 시작 시 실행은 트레이/Alt 메뉴에서 켜고 끔(기본 꺼짐, OS 설정 읽기). 개발 실행 경로의 공백 처리, --hidden으로 트레이 시작. 트레이 실패 시 창 표시·일반 종료. 실제 자동 실행 설정은 에이전트가 켜지 않음.
- Alt 메뉴: 앱·편집·보기. Ctrl+R/F5, Ctrl+Shift+R/Ctrl+F5, Ctrl+Shift+I. 기존 로고를 네이티브 아이콘으로만 재사용, 화면 번들 없음.
- 변경: desktop/{main.js,preload.js,shell.js,assets/logo.png,test/shell.test.cjs,test/login.test.cjs}, docs/{DESKTOP,STATUS}.md. 서버·화면 파일 변경 없음, 배포/캐시 버전 변경 불필요.
- 검증: 데스크톱 node --test desktop/test/*.test.cjs 14개 통과, JS 구문 검사. 실제 Electron 38.1.0 격리 테스트에서 트레이·숨김 시작·닫기 숨김·메뉴·전역 키 등록과 종료 시 해제, contextIsolation preload 저널 이동·본문 포커스·가상 초안 보존 확인.
- 서버 회귀 검사: 89개 중 88개 통과, 기존 Findings 박스 별표 순서 테스트 1개 실패(단독 재실행도 재현). 이번 서버 파일 변경은 없음. worker/src/settings.js는 created_at 밀리초가 같으면 course 문자열로 정렬하여 입력 순서와 달라질 수 있음. 별도 후속 수정 사항으로 남김, 통과로 기록하지 않음.
- 남은 사용자 확인: 앱 완전 종료 후 재실행 → X로 숨김/트레이 복원·Ctrl+Alt+J·메뉴. 자동 실행은 사용자가 켠 뒤 다음 Windows 로그인 때 확인. 6단계 설치 파일은 아직 시작하지 않음.


### 데스크톱 Gmail 기존 연결 표시 확인 (2026-09-17, Codex)

- 사용자 확인: 앱의 Assignment Manage에서 Gmail이 이미 연결되어 있음.
- 기존 연결은 유지. 새 Gmail 연결 → 브라우저 동의 → 앱 복귀의 실동작은 아직 확인하지 않았으며, 완료로 간주하지 않는다. 다음 재연결이 필요할 때 확인할 항목으로 남긴다.
- 3단계 구현·서버 및 화면 배포, 자동 테스트 통과는 이전 기록 참고. 4단계는 아직 대기.

### 데스크톱 2단계 사용자 확인 · 3단계 Gmail 복귀 구현 (2026-09-17, Codex)

- 사용자 확인: 로그인 동작 및 앱 재시작 후 로그인 유지 성공. 2단계 완료.
- 3단계 구현: Gmail 연결은 시스템 브라우저에서 진행하고 phibrain://gmail?gmail=<결과>로 앱의 Assignment Manage 화면에 복귀. 연결 상태는 서버에서 다시 읽고 성공 시 기존 새로고침 흐름 실행.
- worker/src/secrets.js: phibrain://gmail 문자열 하나만 허용(다른 host·경로·query·fragment 불허). 웹 returnTo 허용은 유지, OAuth state 서명·만료 검증 재사용. Google에 등록된 HTTPS callback은 변경 없음.
- desktop/gmail.js(신규): Google Gmail 읽기 전용 동의 URL 및 고정 결과만 허용. desktop/{main,preload}.js: 검증된 앱 메인 프레임 IPC로 기본 브라우저를 열고 딥링크 수신 시 과제 화면 표시. 로그인 팝업 가로채기와 분리.
- design/prototypes/assignment.js: 앱은 전용 bridge, 일반 웹은 기존 페이지 이동. home.html 캐시 assignment.js?v=20260917-1.
- 검증: worker node --test 89개, desktop/test/*.test.cjs 7개 통과. 신규 테스트는 악성 복귀 주소, OAuth 성공·취소·권한 누락·refresh token 누락, 앱 복귀 결과 처리 포함. JS 구문·git diff 검사 통과.
- 서버 배포 완료: Wrangler 4.131.1, 버전 1e9700c7-4896-4869-8d7d-7238ceae90e7. DB 변경 없음.
- 후속 사용자 확인: 앱에서 기존 Gmail 연결됨 표시 확인. 신규 연결 → 브라우저 동의 → 앱 복귀 실동작은 다음 재연결 시 확인하며, 기존 연결은 유지한다.
- docs/DESKTOP.md: 2단계 완료, 3단계 기존 연결 표시 확인·신규 연결 복귀 미확인으로 담당표 갱신.

### 데스크톱 로그인 클릭 무반응 수정 (2026-09-17, Codex)

- 사용자 확인: Google 계정으로 로그인 클릭 시 아무 반응 없음. 화면은 FedCM 버튼인데 앱은 팝업만 가로채므로 로그인 시작이 연결되지 않음.
- 앱 전용 버튼 → preload의 제한된 startLogin bridge → 메인 프로세스 → 기본 브라우저로 직접 연결. 앱에서는 GIS 버튼·One Tap을 실행하지 않으며 웹의 로그인 방식은 유지.
- IPC는 앱 창의 배포 페이지 메인 프레임만 허용. 브라우저 열기 실패는 화면에 안내.
- 로그아웃을 앱에 즉시 알리고, 새 로그인 복귀 시 이전 signed-out 표시 때문에 새 세션이 삭제되지 않게 preload 복원 순서 수정.
- 변경: desktop/{main,preload,auth}.js, design/prototypes/{auth.js,home.html}(auth.js?v=20260917-2), docs/{STATUS,DESKTOP}.md.
- 검증: desktop/test/login.test.cjs 5개(클릭·실패 안내·웹 로그인 유지·로그아웃 전달·재로그인 세션 복원) 통과, worker node --test 86개 통과, JS 구문·diff 검사 통과. 실제 Google 인증·앱 복귀·재시작 유지 확인 후 3단계 진행.

### 데스크톱 앱 2단계: 브라우저 로그인 + `phibrain://` 복귀 (2026-09-17, 사용자 지시 · Claude Code)

- 흐름: 앱에서 "Google로 로그인" 클릭 → 앱이 그 팝업을 가로채 **기본 브라우저**로 `…/home.html?desktop=<state>` 열기 →
  거기서 평소처럼 로그인 → 화면이 1회용 코드를 받아 `phibrain://auth?state=…&code=…` 로 앱을 깨움 →
  앱이 코드를 세션으로 교환 → 페이지 새로고침. 앱 안에서 직접 로그인하지 않는 이유는 Google 정책(내장 브라우저 차단)이고, 우회는 하지 않는다.
- 서버: `worker/migrations/0007_desktop_login_codes.sql`(코드·email·state·만료), `worker/src/desktop.js`
  (`POST /api/session/desktop/code` 세션 필요 → 코드 발급 / `POST /api/session/desktop/exchange` 세션 없이 → 토큰).
  코드는 무작위 256비트·**60초·1회용**, 성공하든 실패하든 조회 즉시 삭제, 실패 이유는 구분해 주지 않는다(찔러보기 단서 차단).
  만료분은 발급·교환 때마다 청소. 토큰을 복귀 주소에 싣지 않는 이유: 주소는 브라우저 기록·로그에 남는다.
- 화면 `auth.js?v=20260917-1`: `?desktop=<state>`가 붙어 열리면 (이미 로그인 상태면 즉시, 아니면 로그인 직후) 코드를 받아 `phibrain://`로 넘긴다.
  state는 `sessionStorage`에 둬서 로그인 도중 주소가 바뀌어도 잃지 않는다.
- 앱: `desktop/auth.js`(프로토콜 등록·state 생성·교환·세션 보관), `desktop/preload.js`(페이지 스크립트보다 먼저 세션을 localStorage에 놓기),
  `main.js`(두 번째 실행·`open-url`로 복귀 주소 수신, Google 팝업 가로채기, 로그아웃 시 앱 세션도 삭제).
  세션은 **`safeStorage`로 암호화**해 `userData/session.bin`에 저장 — 5단계 몫을 여기서 같이 처리했다.
- 검증: `worker/test/desktop.test.js` 6개 추가(1회용·state 불일치 시 폐기·만료·형식 거부·세션 없이 발급 401) → `node --test` **86개 통과**.
  배포: 마이그레이션 0007 적용 ✅, 워커 배포(버전 `85da644f-7bdc-45e2-a2b5-ce6a6fa171e3`).
  배포본 확인 — 잘못된 코드로 교환 시 `{"error":"bad_code"}`, 세션 없이 발급 시 401.
- **남은 확인(사용자):** 실제 Google 계정으로 앱 → 브라우저 → 앱 복귀까지의 실동작. 에이전트가 대신 로그인할 수 없다.
- 다음: 3단계(Gmail 연결도 같은 복귀 경로 사용 — `worker/src/secrets.js`의 `safeReturnTo`에 `phibrain://` 허용 추가).

### 데스크톱 앱 1단계: 배포 화면을 여는 Electron 창 (2026-09-17, 사용자 지시 · Claude Code)

- 계획·인계 문서 신설: **`docs/DESKTOP.md`** — 7단계, 담당표, 파일 경계, 하지 않기로 한 것. 다른 도구가 이어받을 때 이 문서부터 읽는다.
- 사용자 확정: 온라인 전용(오프라인·로컬 저장 범위 밖) · Electron · **화면은 배포 주소를 그대로 연다**(앱에 번들하지 않음 — 원점이 바뀌면 CORS·Google 로그인 등록·Gmail 복귀 주소가 전부 따라 바뀐다).
- `desktop/` 신설: `package.json`(electron 38.1.0, `npm start`), `main.js`.
  창 크기·위치·최대화 기억(`userData/window-state.json`), 바깥 링크는 기본 브라우저로(`setWindowOpenHandler`·`will-navigate`),
  로드 실패 시 안내 화면 + 다시 시도, `nodeIntegration:false`·`contextIsolation:true`(원격 페이지를 여는 창이라 고정), 단일 인스턴스 잠금(2단계의 `phibrain://` 수신 자리).
- 검증: `npm install` 후 `npm start` → 프로세스 정상, 창 상태 파일 기록됨(1280×860). **화면 내용·로그인 동작은 사용자 눈으로 확인 필요**(에이전트가 Electron 창을 캡처할 수단이 없다).
- 다음: 2단계 로그인(시스템 브라우저 + `phibrain://` 복귀 + 1회용 코드 교환). 1단계에서 앱 안 로그인이 막히는 것은 정상 — Google 정책.

### VT 보드 링크: go.phi.design 단축주소 → Figma 보드 직접 링크 (2026-09-17, 사용자 지시 · Claude Code)

- 값: `https://www.figma.com/board/eAeCinqhdU8SMb0aEi8MRM/-1%EA%B8%B0-B--Visual-Translation?node-id=0-1`
  (사용자가 준 주소에서 `t=` 공유 토큰은 뺐다 — 세션용 꼬리표라 링크에 박아 둘 값이 아니다. `node-id`는 유지.)
- 보드 주소를 쓰는 곳 세 군데를 모두 맞췄다:
  - `server/db.js`: `BOARD_URL` 예외 표 신설(`courseLinks()`가 여기 있으면 그 값을, 없으면 예전처럼 `go.phi.design/<id>/board`).
    주간 동기화가 쓰는 스냅샷도 이 함수를 거치므로 다음 동기화부터 같은 값이 나간다.
  - `worker/migrations/0006_vt_board_url.sql`(신규): 서버 DB의 `courses.board_url` UPDATE.
  - `design/prototypes/data/assignment-status.json`: 로그아웃(읽기 전용) 화면이 보는 파일도 지금 바로 맞춰 둠.
- 적용함: `npx wrangler@4.131.1 d1 migrations apply phi-brain --remote` → `0006_vt_board_url.sql` ✅.
  적용 후 확인 쿼리 — vt는 Figma 주소, bi는 `go.phi.design/bi/board` 그대로. 워커 코드 변경은 없어 재배포하지 않았다.
  (처음 한 번은 D1 query API가 7403으로 실패했다가 그대로 다시 실행하니 통과 — 일시적. `d1 list`·읽기 쿼리는 그 사이에도 정상이었다.)
- `worker/test/service.test.js`에 vt board_url 검사 추가 → `node --test` 81개 통과.

### Findings 별표: 과목 단위 → 박스(Finding) 하나 단위 (2026-09-16, 사용자 지시 · Claude Code)

- 이유(사용자): 같은 과목 안에서도 중요한 Finding과 덜 중요한 Finding이 다르다.
- 박스 키 `날짜::과목::그 날 그 과목의 몇 번째` (예: `2026-09-16::BI::1`). 저널을 고쳐 Finding 순서가 바뀌면 별표도 그 자리를 따라간다 — 파생 데이터라 안정된 id가 없다.
- `journal.js?v=20260916-4`: `findingsEntries()`가 `key`를 달고, 카드의 별표·정렬이 그 키를 쓴다. 정렬은 별표한 순서대로 앞(안정 정렬이라 나머지는 원래 순서 유지),
  과목 필터를 고른 상태에서도 그 안에서 별표가 앞. 안내문 "별표한 박스는 앞으로 와요."
- `worker/src/settings.js`: `/api/findings/favorites/:key`가 새 박스 키를 받도록 `FINDING_KEY_RE` 추가. 예전 과목 키(`BI`·`general`)도 계속 받는다 —
  이미 별표해 둔 것을 지울 수 있어야 해서. 테이블·컬럼(`findings_favorites.course`)은 그대로고 담기는 값만 넓어져 마이그레이션은 없다.
  `worker/test/settings.test.js`에 새 키 저장·순서·삭제·잘못된 키 400 테스트 추가 → `node --test` 81개 통과.
- **배포함(2026-09-16, 사용자 지시 · Claude Code):** `npx wrangler@4.131.1 deploy` → 버전 `026a2467-7691-489b-9930-a9176415dab2`,
  `https://api.phibrain.workers.dev`, 크론 2개(`59 14 * * SUN`, `*/10 15-16 * * SUN`) 그대로. 마이그레이션은 이번에 없어 적용하지 않았다.
  이 배포로 지각/미제출 판정에 쓰는 `confirmedAt`(첫 확인메일 수신 시각)과 Findings 박스 단위 별표 키가 서버에 올라갔다.
  배포 후 확인: 인증 없는 `/api/assignment/weeks/1/matrix`·`/api/findings/favorites/...` 모두 401(정상 — 세션 필요). 로그인 상태 실제 동작은 사용자 확인 필요.
- 남은 일: 예전에 과목 단위로 별표해 둔 값은 이제 어떤 박스와도 맞지 않아 그냥 목록에 남는다(화면에는 영향 없음).
- 검증(로컬 정적 서버, 로그아웃, 가짜 저널 3개 · 같은 날 같은 과목 2건 포함): BI 9/14만 별표 → 그 박스만 맨 앞(나머지 BI는 제자리),
  9/16 BI 두 번째도 별표 → 별표 순서대로 둘이 앞, 새로고침 뒤에도 유지(`phi-brain:findings:favorites`에 키 2개). 테스트 데이터 삭제.

### Findings: 과목별 큰 박스 제거 · 즐겨찾기 먼저 · 2열 고정 (2026-09-16, 사용자 지시 · Claude Code)

- 과목별 큰 박스를 없애고 **Finding 하나가 박스 하나**. 머리줄에 과목 이름 · 날짜 · 별표가 들어간다(과목 박스에 있던 개수 뱃지는 없앰 — 필터 pill이 같은 수를 보여준다).
- 순서: 별표한 과목의 박스가 별표 순서대로 앞, 나머지는 화면 순서(General → 과목 코드 순), 같은 과목 안에서는 날짜 내림차순.
  "즐겨찾기 / 과목" 구분 줄은 없앴다. 과목 필터를 고른 상태에서는 고른 순서 그대로.
- 별표는 여전히 **과목 단위**(localStorage·서버 API `/api/findings/favorites/<course>` 모두 과목 코드) — 한 박스에서 켜면 그 과목 박스가 전부 앞으로 온다.
  화면 안내문도 "그 과목의 박스가 앞으로 와요"로 고쳤다.
- `journal.js?v=20260916-3`: `findingsBoxHTML()` → `findingsCardHTML(key, entry)`, `renderFindingsList()`이 순서대로 flatMap.
  `phi-brain.css?v=20260916-6`: `.findings-list`는 `repeat(2,minmax(0,1fr))` 고정(박스가 하나여도 절반 폭), 560px 이하 1열. `.findings-rows`·`.findings-item` 규칙 삭제.
- 검증(로컬 정적 서버, 로그아웃, 가짜 저널 3개 — BI 3·TF 1·WI 1): 1280px에서 한 줄에 2개·각 443px(내용 901px),
  순서 BI9/16·BI9/15·BI9/14·TF·WI → WI 별표 후 WI가 맨 앞, BI 필터에서 BI 3개만, 375px 1열·가로 스크롤 없음. 테스트 데이터 삭제.

### Shift+Enter 줄바꿈 (2026-09-16, 사용자 지시 · Claude Code)

- 지시: 모든 텍스트 입력 구간에서 Shift+Enter는 줄바꿈. 닉네임만 제외.
- 손댄 곳 — Future Item(`future.js?v=20260916-1`):
  - 작성칸(`#fi-input`, textarea): Enter는 예전처럼 추가, **Shift+Enter는 기본 동작(줄바꿈)에 맡긴다**. 예전에는 Shift 여부를 안 보고 무조건 막았다.
  - 행 수정칸(`.fi-edit`): `<input>` → `<textarea rows="1">`. Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소. `growEdit()`이 내용만큼 높이를 늘린다.
  - `phi-brain.css?v=20260916-5`: `.fi-edit`에 `font:inherit·resize:none·overflow:hidden`, `.fi-text`는 `white-space:pre-wrap`으로 저장된 줄바꿈을 그대로 보여준다.
- 이미 되던 곳(확인만): 저널 본문(contenteditable), 과제 공지 붙여넣기 칸 — Enter를 가로채지 않아 Shift+Enter가 원래 줄바꿈이다.
- 그대로 둔 곳(한 줄짜리 이름칸이라 줄바꿈 자체가 없다): 닉네임(지시대로 제외), 저널 제목(`#title-input`), 검색(`#search-input`),
  Future Item 박스 이름(`.fi-box-name-edit`)·새 박스 이름(`.fi-box-add-input`). 여기를 여러 줄로 만들려면 저장·목록 표시까지 바꿔야 해서 사용자 확인 필요.
- 검증(로컬 정적 서버, 로그아웃): 작성칸 Shift+Enter 이벤트 `defaultPrevented=false`·Enter는 추가, 수정칸 TEXTAREA·높이 26→45px·Enter 저장 후
  본문이 "첫 줄\n둘째 줄"로 저장되고 두 줄(47px)로 보임, 저널 본문 Shift+Enter 막히지 않음. 테스트 데이터 삭제.

### Assignment Manage: 지각 마감도 넘긴 제출은 "미제출" (2026-09-16, 사용자 지시 · Claude Code)

- 세 갈래로 정리: 마감 안 → 제출 확인 / 마감은 넘겼고 지각 마감 안 → 지각 제출 / **지각 마감도 넘김 → 미제출**.
  지각 마감이 없는 과제는 마감만 보고 지각까지만 가른다.
- `assignment.js?v=20260916-2`: `isLate()` → `lateness()`(`null`|`late`|`missed`). 미제출 칸은 점·글자색도 '미확인'과 같은 회색으로
  (`cellStatusKey()`) — 글자만 미제출인데 점이 검정이면 낸 것처럼 보인다. "완료 N" 세기에서도 미제출 칸을 뺀다
  (서버 `progress`는 마감을 모르고 세므로 화면에서 차감). 자세히 보기도 같은 이름·같은 점, 확인메일 수신 시각은 그대로 남는다.
- 검증(로컬, 가짜 세션 + `fetch` 스텁, 마감 9/14 23:59 · 지각 마감 9/15 23:59): 9/15 10:00 제출 → 지각 제출,
  9/16 제출 → 미제출(회색 빈 점)·완료 4/4 → 3/4, 지각 마감 없는 과제의 9/20 제출 → 지각 제출, 9/14 제출 → 제출 확인. 스텁 삭제.
- **미배포로 인한 사용자 증상(미해결):** "BI 1주차 9/15 제출이 지각으로 안 보인다" — `confirmedAt`은 2026-09-16에 넣은 Worker 변경이라
  `worker/` 배포(`npm run deploy`) 전까지 화면은 계속 '제출 확인'만 보여준다. 배포 뒤에도 그대로면 그 주 과제 내용의 `dueAt`을 확인해야 한다
  (공지를 안 붙여넣었거나 다른 주차에 붙여넣었으면 견줄 마감이 없다).

### Assignment Manage: 마감 뒤 확인메일은 "제출 확인" 대신 "지각 제출" (2026-09-16, 사용자 지시 · Claude Code)

- 판정 기준: 그 칸의 **첫 확인메일 수신 시각**(재제출이 있어도 처음 낸 때)이 그 주 **과제 내용에 적힌 마감(`dueAt`)** 보다 뒤면 지각.
  지각 마감(`lateDueAt`)은 판정에 쓰지 않는다 — 지각 마감 안에 냈어도 마감은 지난 것이라 "지각 제출"이다.
- `worker/src/assignment/service.js`: 주차 매트릭스 쿼리에 `min(received_at)` 추가 → 각 칸에 `confirmedAt`(확인메일 없으면 `null`).
  `worker/test/service.test.js`에 회귀 테스트 1개 추가(첫 수신 시각·빈 칸 null). `node --test` 80개 전부 통과.
- `assignment.js?v=20260916-1`: `isLate()`/`cellLabel()` — 표의 칸과 자세히 보기 패널이 같은 기준으로 "지각 제출"을 쓴다.
  점·글자색은 제출 확인과 같다(확인된 제출이므로). 마감을 붙여넣지 않은 과목은 견줄 기준이 없어 예전처럼 "제출 확인".
- 검증(로컬 정적 서버, 가짜 세션 + `window.fetch` 스텁): 마감 9/15 23:59 KST 기준 — 9/16 14:00 제출 "지각 제출",
  9/15 14:00 제출 "제출 확인", 마감 정보 없는 과목 "제출 확인", 미확인 칸 그대로. 자세히 보기도 "지각 제출". 스텁·가짜 세션 삭제.
- 남은 일 2가지:
  - **Worker 배포 필요** — `confirmedAt`은 API가 내려주는 값이라 `worker/`를 배포(`npm run deploy`)하기 전까지 화면은 계속 "제출 확인"만 보여준다.
  - 로그아웃(읽기 전용 `data/assignment-status.json`) 화면은 마감·수신 시각이 파일에 없어 지각 판정을 못 한다. 필요하면 스냅샷에 값을 추가해야 한다.

### Findings 박스 가로 우선 배치 · 머리줄(프로필 버튼) 고정 (2026-09-16, 사용자 지시 · Claude Code)

- `phi-brain.css?v=20260916-4` 두 가지:
  - Findings: 과목 박스 목록을 2열 → 1열(`.findings-list`)로 넓히고, 그 안의 Finding 박스를 `repeat(auto-fill,minmax(260px,1fr))`
    그리드로 — 가로로 먼저 채우고 모자라면 다음 줄. 과목 박스가 좁을 때는(2열) 아무리 해도 세로로만 쌓여서 바깥 열 수부터 바꿨다.
  - 머리줄: `.toolbar{position:sticky;top:0;z-index:15;background:var(--bg)}` — 어디로 스크롤해도 프로필 버튼이 같은 자리에 남는다.
    팝업(z-index 20~30)과 `<dialog>` 서랍은 그대로 머리줄 위에 뜬다.
- 검증(로컬 정적 서버, 1280px, 가짜 저널 3개 — BI 3건·TF 1건): BI 박스 안 3개가 한 줄(top 285, left 347/641/934, 각 284px),
  TF 1개. 스크롤 후에도 프로필 버튼 위치 동일(top 25), 머리줄 배경 흰색으로 본문 가림. 서랍·날짜 팝업 정상. 테스트 데이터 삭제.

### Findings: 저널마다 따로 박스 (2026-09-16, 사용자 지시 · Claude Code)

- 증상: 한 과목(예: BI)의 Finding이 저널 두 개에서 나와도 한 과목 박스 안에서 얇은 선으로만 나뉘어 하나로 읽혔다.
- `phi-brain.css?v=20260916-3`: `.findings-item`을 선 구분에서 박스로 — 테두리·radius·패딩(10px 12px 8px), 박스 사이 10px,
  날짜는 박스 안 아래(위 6px). 과목 박스(`.fi-box`)의 제목·개수·즐겨찾기 별표는 그대로라 필터·즐겨찾기·서버 API(과목 단위)는 변화 없음.
- 검증(로컬 정적 서버, 로그아웃, 가짜 저널 2개 — BI 2건·TF 1건): All에서 BI 박스 안에 9/16·9/15 박스 2개, TF 1개.
  BI 필터에서도 박스 2개, 375px에서 1열·가로 스크롤 없음. 테스트 데이터 삭제.

### Journal Archive 수정: 버튼 "저장하기" · 문구 "변경 사항이 저장되었어요." (2026-09-16, 사용자 지시 · Claude Code)

- Journal Archive → ⋯ → 수정하기로 들어간 편집은 AI 정리가 아니라 저장이다. 그런데도 같은 버튼이라 "정리하기"로 보이고,
  누르면 1.6초 뒤 "정리하지 못했어요 · AI가 아직 연결되지 않았어요"가 떠서 저장 실패로 읽혔다(사용자 문의).
- `journal.js?v=20260916-2`: `editingInArchive`를 상태 변수로 올리고(`resetOrganize()`가 읽어야 해서) Archive 편집 중에는
  버튼 이름 "저장하기", 누르면 저장 후 바로 "변경 사항이 저장되었어요." — 가짜 1.6초 대기와 AI 실패 문구는 이 경로에서 제외.
  빈 본문 경고도 "저장할 내용을 먼저 적어주세요"로. 목록으로 돌아가거나 그 저널을 지우면 버튼은 "정리하기"로 되돌아간다.
- Journaling 탭의 정리하기 흐름(가짜 지연 → 로그아웃이면 "이 브라우저에 저장했어요", 아니면 AI 미연결 문구)은 그대로.
- 검증(로컬 정적 서버, 로그아웃, 가짜 저널 1개): Journaling "정리하기" → Archive 수정 진입 "저장하기" → 클릭 시 "변경 사항이 저장되었어요."·본문 저장 확인 →
  목록으로 돌아가면 "정리하기" 복귀 → Journaling 탭 클릭 시 예전 흐름 유지. 테스트 데이터 삭제.
- 남은 일: 로그인 상태에서 Journaling 탭 정리하기는 저장돼도 AI 미연결 문구만 보인다(2026-09-14 문구 변경이 로그아웃만 다룸). 사용자 확인 필요.

### 붙여넣기 굵게 인식: `**` 안쪽 공백 허용 (2026-09-16, 사용자 지시 · Claude Code)

- 증상: 디스코드에서 붙여넣은 `**레퍼런스를 … 출발한다. **` 처럼 닫는 `**` 앞(또는 여는 `**` 뒤)에 공백이 있는 줄이 굵게로 바뀌지 않고 `**`가 그대로 보였다.
- 원인: `journal.js`의 `inlineBold`가 `(?=\S)` · `(?<=\S)`로 `**` 바로 안쪽의 공백을 허용하지 않았다.
- 수정 `journal.js?v=20260916-1`: `/\*\*(\s*)(\S(?:(?:(?!\*\*)[\s\S])*?\S)?)(\s*)\*\*/g` → `$1<b>$2</b>$3`. 안쪽 공백은 `<b>` 밖에 그대로 남아 붙던 단어가 붙지 않는다. 짝이 없는 `**`와 `****`는 예전처럼 원문 유지.
- 검증(로컬 정적 서버 `design/`, 붙여넣기 이벤트): `**TF**` 과목 박스 유지, `… 출발한다. **이런` · `… 있도록한다. **` · `… 조정. **` 모두 굵게, `**정상**과 **짝없음`은 앞만 굵게. 테스트 초안 삭제.
- 남은 일: 이미 저장된 저널의 `**`는 붙여넣을 때 한 번만 변환되는 구조라 그대로다 — 다시 붙여넣어야 굵게가 된다.

### Future Item 긴 문장 줄바꿈 · 프로필 서랍 "출결 및 과제현황" 링크 (2026-09-15, 사용자 지시 · Claude Code)

- `phi-brain.css?v=20260915-1`: `.fi-text` 한 줄 말줄임(…) 제거 → 여러 줄로 넘김(`overflow-wrap:anywhere`로 긴 단어·URL도 박스 안에서 끊김).
  `.fi-row-main`을 위 정렬로 바꾸고 `.fi-text` 위아래 4px, 체크 원 위 9px, 번호 위 4px — 여러 줄이어도 체크·번호·아이콘이 첫 줄에 맞음. 한 줄일 때 모습은 그대로. 수정 입력칸(`.fi-edit`)은 가운데 정렬 유지.
- `home.html`: 프로필 서랍 "공간예약하기" 아래에 "출결 및 과제현황" 링크(Google 스프레드시트, 새 탭) — 기존 `drawer-link` 스타일.
- 검증(배포 페이지에 같은 CSS를 주입, 1400px, 가짜 항목 1개): 긴 문장 2줄, 첫 줄 가운데 208px에 체크·번호·삭제 아이콘 정렬, 수정 모드 정렬 정상. 테스트 항목 삭제. 로컬 서버 미실행이라 수정 파일 자체의 화면 확인은 배포 후 필요.

### Future Item: 박스 추가하면 같은 박스가 하나 더 생기던 버그 수정 (2026-09-14, 사용자 지시 · Claude Code)

- 원인: "+ 박스 추가" 입력칸에서 Enter → `addCustomBox()` → `render()`가 포커스된 입력칸을 지우면서 `focusout`이 다시 `addCustomBox()`를 호출해 새 id로 박스가 한 번 더 저장됐다.
  두 번째 호출의 화면 갱신은 바깥 `innerHTML` 교체에 덮여 안 보이다가, 다음 저장(할일 추가·이동 등) 때 중복 박스가 나타났다. Esc(취소)도 같은 경로로 박스를 만들었다.
- 수정 `future.js?v=20260914-9`: `addCustomBox()` 첫 줄에 `if (!addingBox) return;` — 한 번 들어온 추가/취소 이후의 `focusout` 호출은 무시.
- 검증(로컬, 로그아웃, 가짜 데이터, 실제 키 입력): 수정 전 Enter 한 번에 저장값 박스 2개(화면 1개) 재현 → 수정 후 Enter 1개, Esc 0개, 입력 후 다른 곳 클릭 1개, 새 박스에 할일 추가 후에도 박스 1개. 테스트 데이터 삭제.
- 남은 일: 이미 생긴 중복 박스(빈 쪽)는 자동으로 지우지 않았다 — 사용자가 ⋯ → 삭제로 정리.

### Future Item 마감: 날짜만 고르면 오후 11:59 · 분 1분 단위 (2026-09-14, 사용자 지시 · Claude Code)

- `future.js?v=20260914-8`: `DEFAULT_DUE_TIME = '23:59'` — 작성 카드는 마감 체크를 켜거나 날짜를 고를 때 시간이 비어 있으면 오후 11:59, 행 마감 팝오버는 날짜를 고를 때 시간이 비어 있으면 오후 11:59로 채워 저장.
  시간 "지우기"로 날짜만 남길 수 있음(그 경우 정렬·지남 판단은 예전처럼 23:59). 이미 저장된 날짜만 있는 항목은 그대로.
- `MINUTE_STEP` 5 → 1: 분 목록 00~59(60개), "지금"도 반올림 없이 현재 분.
- 검증(로컬, 로그아웃, 가짜 항목): 마감 체크 → "9월 14일 · 오후 11:59"(시간 창 오후/11/59 선택 표시), 분 60개(00~59), 07 선택 → 오후 11:07, 지우기 후 날짜 선택 → 오후 11:59.
  행 팝오버: 마감 없는 항목에서 날짜 9/20 선택 → "오후 11:59"·저장값 2026-09-20T23:59. 테스트 항목 삭제.

### Assignment Manage: 열 사이 간격 80px 통일 (2026-09-14, 사용자 지시 · Claude Code)

- 측정(1680px, 가짜 데이터 중 가장 넓은 내용 — IAE 과목명·"직접 확인 ↗"·"지각 마감 9월28일 23:59"): 간격이 74 / 71 / 92, 마지막 열 뒤 93px로 제각각이었음.
- `phi-brain.css?v=20260914-34`: 과목명 286px, Assignment 19.09%, 과제 내용 31.11%, Self-Feedback 남는 폭, 본문 최대 1054px(표 990px = 286/189/308/207).
  내용 끝 → 다음 열 내용 시작 세 곳과 마지막 ↗ → 표 오른쪽 끝을 모두 80px로. 좁은 창에서는 비율대로 간격만 줄어듦(과목명 열 고정).
- 검증(로컬, 가짜 API·가짜 세션): 1680px 간격 80.4 / 80.4 / 80.5 / 80.4·스크롤 없음, 1280px 열 286/172/280/163·칸 넘침 0·스크롤 없음.
  두 자리 월(10월~)의 지각 마감 배지는 과제 내용 뒤 간격이 약 7px 줄어듦.

### Journal Archive 즐겨찾기 카드 흰색 유지 · 왼쪽 메뉴 Course → Course Agent (2026-09-14, 사용자 지시 · Claude Code)

- `phi-brain.css?v=20260914-33`: `.archive-card.is-fav{background:fill}` 삭제, `.archive-card` 배경 흰색(`--bg`) — 즐겨찾기는 별표로만 구분.
- `home.html`: 왼쪽 메뉴 그룹 이름 "Course" → "Course Agent"(과목 목록·동작 그대로).
- 검증(로컬, 가짜 저널 1개·즐겨찾기): 즐겨찾기 카드 배경 rgb(255,255,255), 메뉴 "Management / Course Agent". 테스트 데이터 삭제.

### Assignment Manage: 과제 내용 열 40px 왼쪽으로 (2026-09-14, 사용자 지시 · Claude Code)

- `phi-brain.css?v=20260914-32`: Assignment 22% → 18%, 과제 내용 280 → 320px, Self-Feedback 폭 지정 없음(남는 폭). 본문 1064px(표 1000px)에서 280/180/320/220 —
  과제 내용 시작점 40px 왼쪽, Self-Feedback 시작점은 그대로. 641px 이상 표 최소 폭 780 → 900px(더 좁으면 표만 가로 스크롤).
- 검증(로컬, 읽기 전용 표): 1680px 창 280/180/320/220·스크롤 없음·"제출 확인 ↗" 칸 안, 1280px 창 280/162/320/139·스크롤 없음·Assignment/Self-Feedback 내용이 칸 안(여유 30/12px).

### 프로필 서랍 더 빠르게·흐림 약하게 · Assignment Manage 표 폭 맞춤 (2026-09-14, 사용자 지시 · Claude Code)

- `phi-brain.css?v=20260914-31`: 서랍(theme.css §6) 덮어쓰기 — 열고 닫기·배경 전환 520ms → 360ms, 열린 배경 흐림 8px → 5px. 이징·style-kit 원본은 그대로.
- Assignment Manage: 과제 내용 열 270 → 280px(Self-Feedback 약 14px 오른쪽), Assignment·Self-Feedback 모두 22%, 본문 최대 폭 1200 → 1064px(표 1000px = 280/220/280/220) —
  Self-Feedback 오른쪽에 남던 빈 폭을 없앰.
- 검증(로컬): 서랍 transition 0.36s·phi-brain.css의 blur(5px) 규칙이 theme.css 뒤에 적용. 1680px 창 열 280/220/280/220·가로 스크롤 없음, 1280px 창 280/171/280/171·스크롤 없음.
  (창이 가려져 흐림 정도·속도는 눈으로 확인 못 함)

### Assignment Manage: Self-Feedback 왼쪽으로 · 마감 날짜 붙여쓰기 · 제출 확인 칸 링크 메뉴 (2026-09-14, 사용자 지시 · Claude Code)

- `phi-brain.css?v=20260914-30`: 과제 내용 열을 자동 폭 → 고정 270px("자세히보기 + 지각 마감 9월20일 23:59" 한 줄), 남는 폭은 Self-Feedback 열로.
  1440px 창 기준 Self-Feedback 시작점이 약 108px 왼쪽으로. 1280px 창에서는 원래 과제 내용 열이 ~279px라 거의 그대로.
- `assignment-notice.js?v=2` `dueLabel`·`dueLabelWithDow`: "9월 14일" → "9월14일"(표 배지·팝오버 모두). 테스트 기대값도 수정 → notice 7/7.
- `assignment.js?v=15`: 로그인 상태에서 상태가 "제출 확인"(메일)인 칸의 ↗는 메뉴 버튼 — "과제 제출폼 ↗" / "제출한 메일 ↗"(가장 최근 확인메일의 Gmail 스레드,
  누를 때 `/targets/:id`에서 가져옴, 없으면 "제출한 메일 없음"). 직접 확인·미확인·읽기 전용 표는 예전처럼 제출폼 바로 열기. 밖 클릭·Esc·스크롤로 닫힘, 방향키 이동.
  `home.html` `#am-link-menu`(course-menu 카드 재사용). Worker 변경·배포 없음.
- 사용자 요청 4(로그인 시 과제 내용 서버 저장): 이미 구현·배포돼 있음(`PUT /api/assignment/notes`, D1 `assignment_notes`) — 실서버 해당 경로 토큰 없이 401 확인. 코드 변경 없음.
- 검증(로컬 dev-server + 가짜 API·가짜 세션): 열 폭 280/171/270/180(1280px), 배지 "마감 9월19일 23:59", 메일 확인 칸 2개에만 메뉴 버튼, 메뉴 항목 href(제출폼·mail.google.com 스레드)·새 탭,
  열 때 첫 항목 포커스·가져온 뒤에도 포커스 유지, 버튼 아래 위치·오른쪽 끝은 화면 안으로. 스크린샷은 창이 가려져 못 찍음. 실제 로그인 상태는 사이트에서 확인 필요.

### 프로필 서랍: 닉네임 위치 · 계정 한 줄 · 링크 호버/클릭 박스 (2026-09-14, 사용자 지시 · Claude Code)

- `home.html`: 서랍 제목 아래 "학습 아카이브 · Phase 1" 삭제, 그 자리에 `#auth-nickname`(동작·auth.js 변경 없음). 로그인 상태는 `.drawer-account-row` 한 줄에
  "계정" · 이메일 · 로그인됨 · 로그아웃(오른쪽 끝, 좁으면 줄바꿈·이메일 말줄임). 로그아웃 상태는 "계정" 아래 안내·Google 버튼 그대로.
- `phi-brain.css?v=20260914-29`: `.drawer-nickname` margin 4px 0 10px(아래 여백 10px), `.drawer-link` — pill과 같은 박스, 호버·포커스 `--fill`, 누르는 동안 `--line`·scale(.98).
- 검증(로컬, 로그인 화면은 DOM으로 임시 표시): 닉네임 아래 여백 10px, 계정·이메일·로그아웃 같은 줄(세로 중앙), Phi LMS 호버 박스 스크린샷 확인, 링크 글자 왼쪽 = 서랍 글자 왼쪽.
  로그아웃 상태: 닉네임 숨김, "계정" 아래 안내. 실제 로그인 상태는 로컬에서 확인 못 함.

### 서버로 올리기 삭제 · 프로필 서랍 링크 정리 (2026-09-14, 사용자 지시 · Claude Code)

- 사용자 지시: 로그아웃 상태에서 쓴 기록을 로그인 뒤 서버로 올리는 기능 삭제 — 서버 저장은 로그인 상태에서만. 로그아웃 상태의 브라우저 저장 자체는 그대로 둠(내 해석).
- 삭제: `import-dialog.js`, `home.html` `#import-dialog`, `phi-brain.css` `.import-*`, `journal-store.js` `importCandidates/importLocal`, `future-sync.js` 같은 함수·공개 항목,
  `journal.js` Archive 안내의 "올리지 않은 저널" 문구. `future.js` `localBoard`는 로그아웃 시 브라우저 보드 복원에 계속 쓰여 주석만 수정.
  서버 `POST /api/journals/import`는 그대로 둠(프런트에서 호출 안 함, Worker 배포 없음). `privacy.html` 문구 "서버로 옮겨지지 않습니다"로 수정.
- 프로필 서랍: "과목 관리"·"데이터 내보내기"·"GitHub 저장소" 삭제, 그 자리에 "Phi LMS"(https://lms.phi.design/, 새 탭), 그 아래 "공간예약하기"(https://booking.phi.design/, 새 탭). 푸터 GitHub 링크는 그대로.
- 캐시 버전: `phi-brain.css?v=20260914-28`, `future.js?v=20260914-7`, `future-sync.js?v=3`, `journal-store.js?v=4`, `journal.js?v=20260914-15`.
- 검증(로컬 dev-server, 로그아웃): 서랍 링크 "Phi LMS" 하나·href·target 확인, `#import-dialog` 없음, `futureSync` 공개 항목 mode/pending/version/loaded, 스크립트 오류 없음(GSI 로컬 경고만).
  로그인 상태는 로컬에서 확인 못 함.

### Assignment Manage: 과목명이 미확인과 겹치던 문제 수정 (2026-09-14, 사용자 지시 · Claude Code)

- 원인: 과목명을 한 줄로 고정한 뒤 과목명 열이 표 폭의 28%라, 창이 좁으면(1100px 창 기준 202px) 가장 긴 이름(224px 필요)이 다음 열로 넘침.
- `phi-brain.css?v=20260914-27`: 과목명 열 고정 280px, Assignment 칸 `padding-left` 1.5배(18px), 641px 이상 `.am-table{min-width:780px}` + 섹션 `overflow-x:auto`.
- 검증 중 발견: 처음 쓴 `width:max(28%, 264px)`는 Chrome 표 레이아웃에서 무시돼(열이 자동 폭으로 균등 분배) px 고정으로 바꿈. 또 900px 창에서 과제 내용 열이 43px로
  줄어 "자세히보기"가 넘칠 수 있어 최소 폭·가로 스크롤 추가.
- 검증(로컬, 로그아웃 읽기 전용 표): 1100px — 열 280/137/167/137, 겹침 0, 과목명과 상태 최소 간격 62px, 페이지 가로 스크롤 없음. 900px — 겹침 0, 자세히보기가 칸 안,
  표만 가로 스크롤(페이지는 없음), 스크린샷 확인. 1440px — 280/202/378/202, 겹침 0. 프런트만 바뀌어 Worker 배포 없음.

### Assignment Manage: 본문 폭 1200px · 과목명 한 줄 · 마감 글자 크기·높이 맞춤 (2026-09-14, 사용자 지시 · Claude Code)

- `phi-brain.css?v=20260914-24`: `.shell:has(.view-assignment…){max-width:920px → 1200px}`, `.am-course-name{white-space:nowrap}`,
  `.am-note-due{font-size:1em; align-self:center}`(패딩은 `.fi-due` 2px 6px 그대로).
- 검증 중 발견: 처음엔 글자 크기만 맞춰도 글자 시작 높이가 2px 어긋났고 정렬 방식을 바꿔도 그대로 → 재사용한 `.fi-due`의 `align-self:flex-start`가 원인. 이 탭에서만 center로.
- 검증(로컬, 1440px, 가짜 세션·가짜 공지): 본문 폭 1125px(좌우 패딩 제외), 과목명 12개 모두 한 줄(높이 27px), "자세히보기"·마감 글자 13.33px, 배지 패딩 2px 6px,
  글자 위 441.8px / 아래 457.8px로 두 요소 동일, 간격 6px, 행 높이 변화 없음(44px). 프런트만 바뀌어 Worker 배포 없음.

### Assignment Manage: 제출 확인 칸 검정 · 마감 배지 간격 좁힘 (2026-09-14, 사용자 지시 · Claude Code)

- `assignment.js?v=14` `confirmedClass()`: 상태가 `confirmed_mail`("제출 확인")·`confirmed_manual`("직접 확인")이면 `.is-confirmed`(버튼·읽기 전용 라벨 모두).
  "직접 확인"도 제출이 확인된 상태라 같이 검정으로 함(내 판단).
- `phi-brain.css?v=20260914-23`: `.am-status.is-confirmed{color:ink}`, `.am-note-due` margin-left auto → 0(칸 gap 6px), `.am-note-cell` flex-wrap,
  `.am-note-btn{flex:0 0 auto}`, `.am-status{white-space:nowrap}`.
- 검증 중 발견·수정: 좁은 창(표 폭이 좁을 때)에서 "미확인"이 세로로 꺾이고 배지를 붙이자 "자세..."로 잘림 → nowrap·버튼 줄어들지 않게·배지 줄바꿈.
- 검증(로컬, 가짜 세션): AL 과제 직접 확인 → "직접 확인" rgb(51,51,51), 셀프피드백 "미확인" rgb(153,153,153)(테스트 뒤 직접 확인 해제).
  1440px: PC "자세히보기"와 "마감 9월 19일 23:59" 같은 줄·간격 6px. 좁은 창: 상태 한 줄·"자세히보기" 온전·배지 다음 줄. 프런트만 바뀌어 Worker 배포 없음.

### Assignment Manage 과제 내용 칸 글자 "자세히보기"로 고정 (2026-09-14, 사용자 지시 · Claude Code)

- `assignment.js?v=13` `renderNoteCell`: 저장 전·후·읽기 전용 모두 칸 글자 "자세히보기"(저장 후 제목 한 줄 표시 제거). 저장 전 회색·저장 후 검정(`.is-set`)과 마감 배지는 그대로,
  `aria-label` "<과목> 과제 공지 붙여넣기 / 과제 내용 보기". 팝업 안 제목·정리 보기는 변경 없음.
- 참고: 작업 시작 시 `home.html`에 커밋 안 된 `assignment.js?v=12` 변경(코드 변경 없이 버전만)이 있어 v13으로 이어서 올림.
- 검증(로컬, 가짜 세션·가짜 공지 PC 2주차): AL "자세히보기"(회색·배지 없음), PC "자세히보기"(검정)·"마감 9월 19일 23:59". 프런트만 바뀌어 Worker 배포 없음.

### Assignment Manage 팝업 밖 클릭으로 닫기 (2026-09-14, 사용자 지시 · Claude Code)

- `assignment.js?v=11`: `document` `pointerdown` — 팝업이 열려 있고 누른 곳이 팝업·토스트·팝업을 연 칸이 아니면 `closeDetail()`.
  같은 칸 다시 클릭 = 닫기(토글), 다른 칸 = 전환. 저장 안 한 붙여넣기는 `unsavedDrafts`(과목:주차, 메모리)에 남겨 다시 열 때 복원, 저장 성공 뒤에는 남기지 않음.
- 검증(로컬, 가짜 세션): 상태 팝업 안 클릭 유지 / 제목 영역 클릭 닫힘 / 같은 칸 두 번 = 닫힘 / 다른 칸 = 전환(AL) / 과제 내용 붙여넣기 후 진행률 줄 클릭 닫힘 →
  다시 열면 붙여넣은 내용·마감 미리보기 그대로 / 주차 이동 버튼 클릭 닫힘. 프런트만 바뀌어 Worker 배포 없음.

### Assignment Manage 과제 공지 붙여넣기 · 마감 표시 (2026-09-14, 사용자 요구사항 · Claude Code)

**명세:** 사용자와 함께 쓴 프롬프트(실제 공지 3개로 파싱 규칙·테스트 고정값 확정). 비워 둔 선택 3개는 각 첫 번째 안으로 진행 —
저장 후 제목 한 줄 표시 / 마감 지나면 지각 마감으로 바꿔 표시 / 로그아웃은 입력 불가·로그인 안내. 셀프피드백 제외, 시간 없으면 23:59.

**파싱:** `design/prototypes/assignment-notice.js`(순수 함수, 브라우저·Node 겸용) — `마감 기한`(앞에 "지각" 없는 것)·`지각 마감 기한` + `M/D(요일) HH:MM`,
연도는 8월 이후 2026·그 전 2027, 요일 불일치 표시, "N주(차) 과제" 중 "안내" 20자 이내 우선, 과목은 `go.phi.design/<code>/` 링크 → 과목명 순,
제목 = 과제 섹션 첫 목록 줄/첫 문장(괄호 링크 제거). 줄바꿈이 사라진 붙여넣기 대응: ■ 앞, "■ 섹션명" 뒤, 문장 끝에 붙은 섹션명("…안내드립니다. 과제") 앞에서 줄 나눔.
정리 보기 `renderNotice`(전부 escape, URL만 링크). 테스트 `worker/test/assignment-notice.test.js` 7개 — **실제 공지 3개를 구조 그대로 두고 강사 이름·외부 링크만
가짜로 바꾼 fixture**(공개 저장소), 명세 표의 값 전부 일치 + 날짜 없는 "목요일 마감" 무시·연도·시간 없음·2/30·XSS escape.
검증 중 발견: 예시 2의 "…안내드립니다. 과제⏎"(섹션명이 인사 줄 끝에 붙음)에서 제목을 못 찾음 → 줄 나눔 규칙 추가로 해결.

**서버:** `migrations/0005_assignment_notes.sql`(course_id·week_no PK, raw, due_at, late_due_at, due_manual, version), `src/assignment/notes.js` —
`PUT/DELETE /api/assignment/notes/:courseId/:weekNo`(버전 확인·409 서버 사본·force, 원문 비면 400·20,000자 초과 413·마감 형식 검사·없는 과목/주차 400),
주차 표(`getWeekMatrix`)의 각 행에 `note`. 테스트 `test/assignment-notes.test.js` 4개 → **Worker 79/79**. 제출 상태·진행률과 무관.

**프런트:** `assignment.js?v=10`, `assignment-notice.js?v=1`, `home.html` 헤더, `phi-brain.css?v=20260914-22`. 팝오버 앵커를 targetId → 선택자로 일반화(상태 상세와 공유).
입력칸은 다시 그리지 않고 아래 미리보기만 갱신(한글 조합·커서 유지 — 처음 구현에서 입력마다 전체를 다시 그리던 것을 테스트 전에 바로잡음).
`privacy.html`: "과제 내용" 저장 항목 추가.

**검증(로컬 wrangler dev + 로컬 D1, 가짜 세션, 오늘 = 2026-09-14):** 헤더 4열·"과제 내용" 회색 → 클릭 시 팝오버·입력칸 포커스·저장 비활성 → 예시 3 붙여넣기:
같은 입력칸·포커스 유지, 미리보기 "마감 9월 15일(화) 23:59 · 지각 마감 9월 16일(수) 23:59 · 1주차 · VT", 주차 선택 "1주차 (공지)✓ / 2주차", 마감 입력칸 채워짐 →
저장 → "1주차에 저장했어요"·1주차로 이동·칸 "원하는 컷에 대한 … / 마감 9월 15일 23:59"·보기에 섹션 5개·링크. ⋯ → 수정하기(원문 채워짐, 주차 선택 없음) → 마감 9/17 18:00 직접 →
배지·"직접 입력" 표시. ⋯ → 삭제하기 → "과제 내용을 삭제할까요?" → 삭제 → 칸 "과제 내용" → 되돌리기 → 복구. 지난 마감(9/13)+지각 9/20·미확인 → "지각 마감 9월 20일 23:59" 진하게,
지난 마감·지각 없음 → "마감 9월 13일 23:59" 진하게. 1280px 스크린샷(아래 행은 팝오버가 위로 뒤집힘), 375px 하단 시트 좌·우·하 16px·가로 스크롤 없음.

**배포:** 원격 D1 `0005` → Worker `a871e882` → push. 실서버: health 정상, `/api/assignment/notes/*` 토큰 없이 401, 원격 assignment_notes 0·Gmail 연결·journals 유지.
**남은 일:** 사용자가 실제 공지 붙여넣어 확인(다른 형식의 공지가 오면 fixture·규칙 추가).

### Journal Archive: All 목록 아래 즐겨찾기 묶음 (2026-09-14, 사용자 지시 · Claude Code)

- 해석이 두 가지라 질문 → 사용자 선택: "All 목록 아래에 즐겨찾기 묶음"(과목 필터 카드 화면은 변경 없음).
- `home.html` `#archive-favs`(라벨 + `#archive-fav-cards`), `phi-brain.css?v=20260914-21` `.archive-favs{margin-top:10px}`,
  `journal.js?v=20260914-14` `renderArchiveFavorites()` — All일 때만, 저장된 즐겨찾기 키 중 저널·과목이 실제로 있는 것만 카드로(최신 날짜 → 과목 순, 과목 표시), 없으면 숨김.
- 검증(로컬, 로그아웃, 가짜 저널 3개·즐겨찾기 2개): 목록 3행 아래 간격 10px·카드 2장(12일 BI, 10일 EWA), 별표 끄면 즉시 빠짐·전부 끄면 묶음 숨김,
  과목 필터(BI)에서는 묶음 숨김, All로 돌아오면 다시 표시. 스크린샷 확인. 프런트만 바뀌어 Worker 배포 없음.

### Future Item 순서 번호 · 수정칸 10pt (2026-09-14, 사용자 지시 · Claude Code)

- `future.js`(`?v=20260914-6`) 행에 `<span class="fi-num" aria-hidden="true">` 추가(스크린리더는 목록 순서로 충분해 번호는 숨김).
  `phi-brain.css`(`?v=20260914-20`): `.fi-rows{counter-reset}`·`.fi-row{counter-increment}`·`.fi-num::before{content:counter(fi-row) "."}`(목록마다 1부터, 완료 목록 따로),
  `.fi-due` margin-left 20px → 42px, `.fi-edit` 8pt → 10pt.
- 검증(로컬, 로그아웃, 가짜 항목 3개 + 완료 1개 + 마감 1개): 스크린샷 "1. 2. 3." / 완료한 항목 "1.", 마감 배지 왼쪽 = 문장 왼쪽(691px), 더블클릭 수정칸 13.33px·번호 유지.
  프런트만 바뀌어 Worker 배포 없음.

### Findings 박스 즐겨찾기 · 닉네임 · Future Item 글씨 10pt (2026-09-14, 사용자 요구사항 3건 · Claude Code)

**서버:** `migrations/0004_findings_favorites_settings.sql`(`findings_favorites` course PK·created_at, `settings` key/value), `src/settings.js` —
`PUT/DELETE /api/findings/favorites/:course`, `GET/PUT /api/settings`(닉네임 공백 정리·20자 초과 400·빈 문자열이면 삭제). `GET /api/journals`에 `findingsFavorites` 추가.
테스트 `test/settings.test.js` 3개 → **Worker 68/68**.

**프런트:**
1. Findings 별표 — `journal-store.js`(`?v=3`) `findingsFavorites.all()/toggle()`(로그아웃 = `phi-brain:findings:favorites`, 로그인 = 서버 + 계정 캐시, 실패 시 되돌리고 토스트),
   서버로 올리기 때 브라우저 별표도 추가. `journal.js`(`?v=20260914-13`) 박스 헤더 별표, All에서 즐겨찾기/과목 줄로 나눔, 필터 시 고른 순서 유지.
2. 닉네임 — `auth.js`(`?v=3`): 로그인 시 `/api/settings`로 불러와 `phi-brain:nickname:<email>`에 사본, 더블클릭/Enter/F2로 인라인 입력(한글 조합 중 Enter 무시),
   저장 실패 시 되돌리고 토스트, 우상단 버튼 = 닉네임 || "프로필". `home.html` `#auth-nickname`(계정 제목 위), CSS `.drawer-nickname`·`.profile-trigger` 말줄임.
3. `.fi-text` 8pt → 10pt. (`phi-brain.css?v=20260914-19`)
- 옛 문구 정리: 상단 프로토타입 안내·Findings 안내·서랍 로그아웃 안내의 "이 브라우저에만 저장/데이터 이전은 준비 중"(3·4단계 이후 사실과 다름).

**검증(로컬 wrangler dev + 로컬 D1, 가짜 세션·가짜 테스트 저널):** 로그아웃 — Findings 박스 3개 별표 3개, EWA 별표 → [즐겨찾기] EWA★ [과목] general BI, general 추가 →
EWA★ general★ 순서, 포커스 유지, 필터 BI,EWA → 필터 순서 그대로, 서랍 닉네임 숨김·버튼 "로그인". 로그인 — 닉네임 "닉네임을 입력해보세요"(회색, 계정 제목 위) →
더블클릭 입력 "  파이   테스트  " Enter → "파이 테스트"·우상단 버튼 "파이 테스트"·서버 저장, 새로고침 후 유지, Esc → 변경 없음. Findings BI 별표 → 서버 `["BI"]`,
브라우저 별표는 그대로. `.fi-text` 계산값 13.33px. 스크린샷으로 Findings 즐겨찾기 줄·Future Item 글씨·우상단 닉네임 확인.

**배포:** 원격 D1 `0004` 적용 → Worker `1f754cd2` 배포 → push. 실서버: health 정상, `/api/settings`·`/api/findings/favorites/*` 토큰 없이 401, 원격 settings 0·findings_favorites 0·journals 2·future_state 1(사용자 데이터 유지). 사용자 확인 대기(실제 사이트에서 닉네임·Findings 별표).

### 서버로 올리기: 안내 문구 버튼 → 팝업 (2026-09-14, 사용자 지시 · Claude Code)

- 이유(사용자): 화면 위쪽 안내 문구에 있어 잘 안 보임.
- `import-dialog.js`(신규, 마지막에 로드) + `home.html` `#import-dialog` + `phi-brain.css` `.import-dialog`(`?v=20260914-18`): 로그인 상태에서 저널 저장소와
  Future Item 동기화가 모두 `loaded`가 되면 후보 개수를 세어 있으면 `showModal()`. [서버로 올리기] = Future Item `importLocal()`(동기) → 저널 `importLocal()`(서버) →
  닫고 토스트 "서버로 올렸어요 · Future Item N개 · 저널 N개 · (건너뛴/실패 수)". [나중에]/Esc/배경 = `sessionStorage` `phi-brain:import-dismissed`(이 탭 동안만).
- `journal.js`(`?v=20260914-12`): Archive 안내의 올리기 버튼·로그인 직후 토스트·`importLocalJournals` 제거(건너뛴 날짜 문구는 유지).
  `future-sync.js`(`?v=2`): 안내 문구의 올리기 버튼·토스트 제거, `importLocal()`이 올린 개수 반환, `futureSync.loaded/importCandidates/importLocal` 공개,
  서버 도착 시 `phibrain:future-changed` 발송(팝업이 기다림).
- 검증(로컬 wrangler dev + 새 로컬 D1, 가짜 세션·가짜 테스트 데이터): 브라우저 저널 2·Future Item 3 + 로그인 → 새로고침 후 팝업 열림(가운데, 1280×800·375px 모두 확인,
  기본 포커스 올리기, 개수 "저널 2개 Future Item 3개", 토스트 없음) → 올리기 → 서버 저널 2·Future Item 3(v1), 브라우저 원본 유지 → 브라우저에만 항목 1개 추가 후
  새로고침 → 팝업 "Future Item 1개" → 나중에 → 새로고침해도 안 뜸. 테스트 데이터 삭제. 프런트만 바뀌어 Worker 배포 없음.

### 온라인 전환 4단계: Future Item 서버 저장(단순한 방식) + 자동 로그인 (2026-09-14, 사용자 지시 · Claude Code) — **배포 완료, 사용자 확인 대기**

**사용자 결정:** Future Item은 항목 단위 병합 대신 **보드 전체를 한 문서로 저장하는 단순한 방식**(동시 수정 시 물어봄). 자동 로그인도 함께.

**서버:** `migrations/0003_future_items.sql`(`future_state` 1행: data JSON·version), `src/future.js` — `GET /api/future`(없으면 `{data:null, version:0}`),
`PUT /api/future`(baseVersion 다르면 409 + 서버 사본, force로만 덮어씀, UPDATE `WHERE version = ?`, 형태 검사·잘못된 항목 제거·1MB 초과 413).
`POST /api/session/refresh`(유효한 세션 → 새 30일 토큰). 테스트 `test/future.test.js` 5개 → **Worker 65/65**.

**프런트:**
- `future.js`(`?v=20260914-5`): 저장 경로만 교체 가능하게 — `loadState`에서 `normalizeBoard` 분리, `commit()`이 `backend.save` 사용,
  `PhiBrain.futureStore`(`snapshot`/`localBoard`/`replace`/`useBackend`), 교체 시 `phibrain:future-changed` 이벤트(journal.js "지난 할 일" 다시 그림).
  로그아웃 동작·기존 키 `phi-brain:future:v2`는 그대로.
- `future-sync.js`(신규, auth.js 뒤): 로그인 = 서버 보드(계정별 캐시 `phi-brain:future-sync:v1:<email>`로 즉시 표시 후 GET), 모든 commit을 최신 보드
  통째로 한 번에 하나씩 PUT, 끊기면 20초 뒤·online 때 재시도, 409인데 서버 사본이 같으면 저장된 것으로(3단계와 같은 대비), 다르면 `#fi-sync-hint`에 선택지.
  "서버로 올리기" = 이 브라우저 보드 중 서버에 없는 id의 항목·박스·즐겨찾기·순서를 합쳐 저장(브라우저 원본은 그대로).
- `auth.js`(`?v=2`): 세션이 하루 넘었으면 로드 때 `/api/session/refresh`로 30일 연장(=기존 `/api/me` 확인 대체), GIS `auto_select`·`use_fedcm_for_prompt` +
  세션 없고 `phi-brain:signed-out` 표시 없으면 `google.accounts.id.prompt()`(자동 로그인), 로그인 도중 세션이 풀리면(401) 한 번 더 시도.
  로그아웃 누르면 표시를 남겨 자동 로그인 안 함, 다음 직접 로그인 때 지움. 자동으로 들어오면 토스트 "○○로 자동 로그인했어요".
- `home.html` `#fi-sync-hint`, 스크립트 순서 future → auth → future-sync → journal-store → journal, `phi-brain.css?v=20260914-17`, `journal.js?v=20260914-11`.
- `privacy.html`: Future Item 서버 저장, 세션 자동 연장·자동 로그인 사실 반영.

**검증(로컬 wrangler dev + 로컬 D1, 가짜 세션):** 로그아웃에서 항목 2개 추가 → 브라우저 저장·안내 문구. 3일 된 세션으로 새로고침 → 토큰 교체·만료 30일 후,
서버 보드 비어 있음 + 토스트·안내 "이 브라우저에만 있는 Future Item 2개" → 올리기 → 서버 v1에 2개·브라우저 원본 유지·안내 숨김 → 로그인 상태에서 추가 → 서버 v2.
다른 기기 흉내(API로 A 수정) 후 D 추가 → 충돌 안내 + pill 2개 → 다른 기기 내용 → A 수정본·D 없음·v3. 다시 충돌 → 이 기기 내용 → 서버 v5에 F 포함, 대기 없음.
Journaling "지난 할 일"에 서버 항목 표시. 로그아웃 → 브라우저 보드(A·B)로 복귀, 표시 저장, prompt 호출 0. 서버에서 거부되는 세션으로 새로고침 → 401 → 로그아웃 상태 →
Google 자동 로그인 시도 확인(콘솔 "Not signed in with the identity provider" — 테스트 브라우저엔 Google 계정이 없어서). **실제 Google 계정 자동 로그인은 배포 후 사용자 확인 필요.**
참고: 로그인 직후 저널·Future Item 가져오기 토스트가 동시에 뜨면 나중 것만 보임(토스트가 하나) — 각 화면의 안내 문구에는 계속 남음.

**배포:** Worker 버전 `92228e82`(배포가 먼저 끝나고 원격 마이그레이션 첫 시도는 Cloudflare API 일시 오류 → 재시도 성공, 그 사이 프런트는 push 전이라 영향 없음). 실서버: health 정상, `/api/future` GET·PUT 토큰 없이 401, 위조 토큰 refresh 401, 원격 future_state 0행·journals 1행(사용자 사용 시작)·Gmail 연결 유지. push 후 Pages 반영 확인.
**남은 일:** 사용자 — 기기마다 Future Item "서버로 올리기", 실제 Google 계정 자동 로그인 확인(로그아웃 누르지 않은 브라우저에서 로그인이 풀렸을 때).

### Archive 펼친 본문 여백 10px · 빈 저널 저장 안 함 (2026-09-14, 사용자 지시 · Claude Code)

- `phi-brain.css`(`?v=20260914-16`): `.archive-entry .accordion-content` 위 패딩 0 → 10px(펼친 본문과 제목 줄 사이).
- `journal.js`(`?v=20260914-10`): `hasContent()` — 제목 없음 + 글자 없음(4F 템플릿 소제목·과목 박스 라벨 제외, 직접 쓴 소제목·img·hr는 내용)이면 빈 저널.
  `save()`는 빈 저널을 저장하지 않고, 그 날짜에 저장본이 있으면 `store.remove`(로그인 상태면 서버에서도 삭제 — 즐겨찾기도 함께 사라짐). 상태 줄은 비움.
  `archiveEntries()`·이어쓰기 목록은 예전에 저장된 빈 저널을 숨김(데이터는 지우지 않음). 내 판단: 템플릿만 누른 상태도 빈 것으로 봄.
- 검증(로컬, 로그아웃): 입력 → 저장됨 → 전부 지움 → 저장본 삭제·상태 줄 비움, 4F 템플릿만 → 저장 안 됨, 템플릿만 있던 옛 저장본(09-11) → Archive·이어쓰기 목록에서 숨김,
  내용 있는 09-12만 표시, 펼친 본문 간격 0 → 10px. 테스트 데이터 삭제.

### 정리하기 문구: 로그아웃 상태는 "이 브라우저에 저장했어요", 버튼 "다시 정리하기" (2026-09-14, 사용자 지시 · Claude Code)

- `journal.js`(`?v=20260914-9`): 정리하기 1.6초 뒤, 로그아웃(`store.mode === 'local'`)이고 실제로 저장된 저널이 있으면
  "이 브라우저에 저장했어요"(일반 색), 아니면 기존 실패 문구. 버튼 이름은 두 상태 모두 "다시 시도" → "다시 정리하기".
  로그인 상태 문구는 사용자가 따로 말하지 않아 그대로 둠(바꿀지 확인 필요).
- 검증(로컬, 로그아웃): 입력 → 정리하기 → "정리 중…" → "이 브라우저에 저장했어요"(is-error 아님)·버튼 "다시 정리하기". 테스트 저널 삭제.

### 온라인 전환 3단계: 저널을 서버로 (2026-09-14, 사용자 지시 · Claude Code) — **배포 완료(원격 D1 0002·Worker e4f79989·push), 사용자 가져오기 대기**

**사용자 결정(착수 시 질문):** ① 기존 브라우저 저널 가져오기를 5단계로 미루지 않고 **3단계에 포함**(로그인하면 기존 저널이 안 보이게 되므로).
② 로그아웃 상태에서도 **지금처럼 브라우저에 저장**해 쓸 수 있게(로그인 강제 안 함).

**서버(`worker/`):**
- `migrations/0002_journals.sql`: `journals`(date PK·title·courses JSON·html·saved_at·**version**·updated_at), `journal_favorites`(date, course).
  Findings·Archive는 저널에서 파생이라 테이블 없음.
- `src/journals.js` + `index.js` 연결(전부 세션 필요): `GET /api/journals`(전체+즐겨찾기), `PUT /api/journals/:date`(baseVersion 필수 —
  서버 버전과 다르면 409 + 서버 사본, `force`로만 덮어씀, UPDATE는 `WHERE version = ?`로 경쟁 방지), `DELETE …?baseVersion=`(오래된 버전이면 409,
  즐겨찾기도 삭제), `PUT/DELETE /api/journals/:date/favorites/:course`, `POST /api/journals/import`(없는 날짜만 추가·같은 내용은 same·
  다른 내용은 conflicts로 보고, **덮어쓰지 않음**, 요청당 최대 20개·SELECT 1번+batch 1번 — 무료 플랜 D1 쿼리 수 한도 고려).
  검증: 실제 달력 날짜만, 과목 코드 형식(`general`/대문자 2~4자) 외 제거, 제목 500자·본문 500KB 초과 413.
- 테스트 `test/journals.test.js` 6개 → **Worker 60/60**.

**프런트:**
- `design/prototypes/journal-store.js`(신규, `journal.js` 앞에 로드): journal.js의 동기식 `store.get/set/remove/dates`·`favorites` 모양 그대로.
  로그아웃 = 기존 localStorage 키(`phi-brain:journal:*`, 즐겨찾기) 그대로. 로그인 = 서버 목록의 메모리 사본, 쓰기는 즉시 반영 후 날짜별로 한 번에
  하나씩 전송(보낸 동안 또 쓰면 끝난 뒤 재전송), 끊기면 20초 뒤·`online` 때 재시도. 계정별 캐시 `phi-brain:sync:v1:<email>`에 사본·안 보낸 변경을
  보관(탭 닫힘 대비, `pagehide`에 즉시 기록). 409면 충돌로 멈추고 화면에 선택지. **409인데 서버 사본이 이 기기 내용과 똑같으면 충돌이 아니라
  "응답만 못 받은 저장"으로 보고 버전만 맞춤**(로컬 검증 중 실제로 재현된 경우). 로그인 전환 직전 journal.js가 남은 입력을 먼저 저장(`onBeforeModeChange`).
- `journal.js`(`?v=20260914-8`): 저장 상태 줄(아래 DESIGN), 충돌 선택 pill, 서버 데이터 도착 시 편집 중이 아니고 내용이 다를 때만 다시 불러오기,
  Archive·Findings 열려 있으면 다시 그림, 로그인 직후 가져오기 토스트 1회, Archive 안내 문구·"서버로 올리기". `home.html` `#archive-hint`,
  `phi-brain.css?v=20260914-15`(`.archive-hint .pill` 간격 한 줄).
- `design/privacy.html`: 배포되면 "저널은 브라우저에만 저장" 문장이 거짓이 되므로 **사실 부분만 수정** — 로그인 시 저널·즐겨찾기 서버 저장,
  Future Item은 여전히 브라우저, Gmail 갱신 토큰 암호화 저장·접근 토큰 미저장·확인한 메시지 ID 기록(2단계분), 저장 위치 Cloudflare, 제3자에 Cloudflare 추가.
  시행일·전체 재검토는 5단계.

**검증(로컬 wrangler dev + 로컬 D1, 가짜 세션·가짜 테스트 저널):** 로그아웃 입력 → "이 브라우저에만 저장됨"·Archive 3행. 로그인 → 서버 0개 + 토스트
"이 브라우저에만 있는 저널 3개" + 안내 문구 버튼 → 올리기 → 서버 3개·즐겨찾기 1개 이전·Findings에 BI 발견 표시·브라우저 원본 3개 유지, 오늘 편집기에
가져온 내용 표시. 입력 → "저장 중…" → "초안 저장됨"(서버 v2). 다른 기기 흉내(API로 먼저 저장) 후 입력 → 충돌 문구+pill 2개 → "다른 기기 내용 불러오기"
→ 그 내용으로 교체·saved. 다시 충돌 → "이 내용으로 저장" → 서버 v5에 이 기기 내용. 과목 필터 카드 즐겨찾기 → 서버 반영. 삭제 확인 → 서버에서 삭제·
즐겨찾기 삭제 → 되돌리기 → 서버 복구. Worker 중지 후 입력 → "서버에 연결되지 않아 이 기기에 보관 중" + 캐시에 pending → 재시작·새로고침 →
서버 반영·saved(여기서 위 409 동일 내용 버그 발견·수정 후 재확인). 로그아웃 → 즉시 브라우저 저널(로그아웃 때 쓴 원래 내용)로 전환.

**남은 일:**
1. ~~원격 D1 `0002` 적용 → Worker 배포 → push~~ 완료. 실서버: health 정상, `/api/journals` 토큰 없이·위조 토큰 401, github.io에서 PUT CORS 허용, 원격 journals 0개, Gmail 연결 유지. Pages 반영 확인.
2. 사용자: 기기마다(데스크톱 localhost·github.io, 노트북) 로그인 → "서버로 올리기". **주의:** localhost:5500과 github.io는 브라우저 저장소가
   따로라 각각 한 번씩. 같은 날짜가 기기마다 다르면 건너뛴 날짜로 표시됨 — 어느 쪽을 남길지는 그 저널을 열어 직접 정리(자동 병합 없음).
3. 남은 계획: 4단계 Future Item(`future.js`는 아직 브라우저 저장 — Journaling의 "Future Item에 등록하기"도 아직 브라우저), 5단계 나머지 가져오기·
   개인정보처리방침 전체 재검토, 6단계 백업. 2단계 정리(옛 GitHub Actions 동기화 제거)도 대기 중.

### 온라인 전환 2단계: Assignment Manage 서버 이전 (2026-09-14, 사용자 지시 · Claude Code) — **완료(실사용 확인), 옛 주간 동기화 정리 대기**

**작업 환경 메모:** 이번 세션 PC에는 기존 클론·`server/.env`·로컬 DB가 없어 저장소를 새로 받아 작업했고, 처음엔 wrangler가 로그인돼 있지 않아
배포를 사용자 로그인 뒤로 미뤘다(아래 "배포"). Windows에서 `wrangler dev`/`d1 --local`은 경로가 길면(scratch 경로 등) 전부 `internal error`로 실패 —
짧은 경로(`%TEMP%\pbw`)에 복사해서 돌렸다.

**추가·변경:**
- `worker/migrations/0001_assignment_manage.sql`: `server/db.js`와 같은 테이블 + 시드(12과목·0~16주차·과녁 408개, 주차 날짜 동일).
  추가 테이블 `gmail_seen`(판정 끝난 메시지 ID만 — 배치 사이 중복 조회 방지). `gmail_connection`은 `refresh_token_enc`(AES-GCM 암호문,
  평문·access token은 저장 안 함), `last_run_at`, `sync_since`, `sync_pending`. **D1은 compound SELECT 항 개수 제한이 있어**
  12개 `UNION ALL` 시드가 실패 → 다중 행 `VALUES`로(node:sqlite 테스트로는 안 잡히고 로컬 D1에서 발견).
- `worker/src/assignment/`: `constants.js`(학기·수신 허용 범위), `matching.js`(`server/matching.js` ESM 이식, 규칙 동일),
  `google.js`(OAuth·Gmail을 `fetch`로, 본문 base64는 UTF-8 디코드, 오류는 Google 오류 코드만 전달), `service.js`(D1 비동기 —
  주차 표는 칸마다 쿼리 2번 대신 쿼리 1번), `sync.js`(배치 동기화, 아래).
- `worker/src/secrets.js`: 토큰 암호화/복호화(`TOKEN_KEY`), Gmail 연결 `state` 서명·검증(SESSION_SECRET에서 별도 라벨로 파생한 키라
  state를 세션으로 못 쓰고 그 반대도 불가, 10분 만료, 허용 이메일 재확인, 돌아갈 주소는 `ALLOWED_ORIGINS`만).
- `worker/src/index.js`: 세션 필요 `/api/assignment/` — `GET weeks`, `GET weeks/:n/matrix`, `GET targets/:id`, `POST targets/:id/manual`,
  `GET connection`, `POST connection/disconnect`(Google에 토큰 revoke 시도 후 삭제), `POST gmail/connect`(→ Google 동의 URL),
  `POST sync`. 세션 불필요 `GET /auth/google/callback`(서명된 state로만 인정 → code 교환 → **gmail.readonly가 실제로 허용됐는지 확인** →
  refresh token 암호화 저장 → 원래 페이지 `?gmail=connected|denied|scope_missing|no_refresh_token|error`로 복귀). `scheduled()` 크론.
- **배치 동기화(무료 플랜 한도 대응):** Worker 1회 호출은 외부 요청 50개·CPU ~10ms. 첫 동기화는 수신 허용 범위 시작부터 전부 읽어야 해서
  한 번에 `SYNC_BATCH`(15)통만 가져오고 `done`/`remaining`을 돌려준다. 검색 시작점은 한 회차 동안 `sync_since`로 고정(= 마지막 성공 − 1일,
  첫 회는 `RECEIPTS_FROM`), 끝났을 때만 `last_sync_at` 전진. `invalid_grant`면 토큰 삭제 + `reconnect_required`(화면에 "연결하기" 다시 표시).
- `wrangler.jsonc`: 크론 `59 14 * * SUN`(일 23:59 KST 시작) + `*/10 15-16 * * SUN`(월 00:00~01:50 KST, 남은 메일 있을 때만 이어서),
  `SYNC_BATCH`, 새 Secrets 설명(`GOOGLE_CLIENT_SECRET`, `TOKEN_KEY`). Gmail도 로그인과 같은 OAuth 클라이언트(`GOOGLE_CLIENT_ID`)를 쓴다.
- 프런트 `assignment.js`(`?v=9`): `localhost:5600` 대신 `PhiBrain.auth.fetch('/api/assignment/…')`. **로그아웃 상태 = 기존 공개 JSON 읽기 전용**
  (상태 줄 끝에 "· 로그인하면 상세·새로고침을 쓸 수 있어요"), 로그인했는데 서버 응답이 없으면 같은 JSON에 "· 서버에 연결할 수 없어 저장본을
  보여줘요", JSON도 없으면 안내 문구. 로그인/로그아웃 시 즉시 모드 전환. 새로고침은 `done`까지 반복(최대 40회, 진행 중 "메일 N통 확인").
  "연결하기" → API가 준 URL로 이동 → 돌아오면 `?gmail=` 읽어 토스트 후 주소에서 제거, 방금 연결됐으면 바로 새로고침.
  서버 오류 코드는 한국어 안내로(`not_connected`, `reconnect_required`, `server_not_configured`, `gmail_429`). `home.html` 안내 문구
  "백엔드에 연결할 수 없어요 — node server/index.js…" → "서버에 연결할 수 없어요 — 잠시 뒤 다시 열어 주세요."
- 테스트(`worker/test/`, **54/54**): `d1.js`(node:sqlite 위 D1 흉내 + 실제 마이그레이션 적용), `fixtures.js`(서버 픽스처 ESM 복사),
  matching 16개 이식, service 11개(시드·주차 날짜·충돌·진행률·잘못된 입력 포함), google 6개(UTF-8 디코드·동의 URL 범위),
  sync 5개(가짜 Google로 배치 분할·중복 조회 없음·워터마크·invalid_grant·설정 누락), routes 6개(모든 assignment 경로 401·다른 계정 토큰 거부,
  로그인 후 전체 흐름, state 반환 주소 제한·state↔세션 교차 사용 불가, 콜백 위조/만료/다른 계정 거부, 콜백 암호화 저장·권한 체크 해제 시 미저장,
  크론 조건). 서버 테스트 39/39 유지.

**검증(로컬 `wrangler dev` + 로컬 D1 + `tools/dev-server.js`, 개발용 가짜 Secrets·가짜 세션):** 마이그레이션 적용 → 과녁 408·0주차 08-31~
16주차 12-27·EWA 별칭. 로그아웃 → 읽기 전용 24칸(버튼 0)·기존 JSON 문구. 로그인 → 2주차 표 버튼 24·"Gmail 연결 안 됨"+연결하기.
BI 과제 상세 → 직접 확인으로 표시 → "저장했어요"·"직접 확인"·완료 1/24, 3주차 이동, 새로고침 → "Gmail을 먼저 연결해 주세요".
연결하기 URL = accounts.google.com·gmail.readonly·offline·login_hint. 그 state로 콜백 직접 호출(가짜 code) → Google `invalid_client`(가짜
Secrets라 정상) → `home.html?gmail=error`로 복귀 → 토스트 "Gmail을 연결하지 못했어요"·주소에서 파라미터 제거. 로그아웃 → 즉시 읽기 전용.
`/__scheduled?cron=59+14+*+*+0` 200. 실제 Gmail·실서버 검증은 아직 없음.

**배포(2026-09-14):** 사용자가 `wrangler login` 승인. `TOKEN_KEY`는 에이전트가 무작위 생성·등록(값 출력 없음), 마이그레이션은 사용자가 원격 적용.
첫 `deploy`(사용자 실행)는 코드 업로드 후 크론 `59 14 * * 0`이 `invalid cron string`으로 거부돼 부분 실패 — **Cloudflare 크론은 요일에 `0`을
받지 않는다**(SUN 또는 1~7, GitHub Actions와 다름). `SUN`으로 고쳐(`wrangler.jsonc`, `index.js`의 `WEEKLY_CRON`, 테스트) 재배포 성공
(버전 `1dba4195`, 크론 2개 등록). 실서버 확인: health `{ok:true}`, 토큰 없이/위조 토큰으로 `/api/assignment/*` 401, 위조 state 콜백 400,
CORS는 github.io만 허용, 원격 D1 과녁 408·과목 12·0주차 08-31·Gmail 미연결. Secrets = ALLOWED_EMAIL·GOOGLE_CLIENT_ID·SESSION_SECRET·
TOKEN_KEY — **`GOOGLE_CLIENT_SECRET`은 아직 없음.**
**Windows 메모:** 사용자 PowerShell에서 `npx`는 실행 정책(`npx.ps1` 차단)에 걸린다 → 명령을 안내할 때는 `npx.cmd`로 쓸 것.

**실사용 확인(2026-09-14 11:23 KST):** 사용자가 `GOOGLE_CLIENT_SECRET` 등록 — 기존 보안 비밀번호는 다시 볼 수 없어 Google 콘솔에서
**새 비밀번호를 추가**(기존 `****EE3a`는 GitHub Actions용으로 유지). 첫 등록은 복사 없이 붙여넣어 틀린 값이 들어가 연결 실패 → 새 값으로
덮어써 해결. **배포 사이트(github.io)에서 로그인·Gmail 연결 성공**(1단계 미확인 항목도 해결). 동기화는 배치로 나뉘어 끝까지 완료:
`sync_pending 0`, 판정 메시지 35통, 메일 근거 30건, 검토 대기 0, `last_sync_error` 없음. 확인 칸 25칸(0주차 17·1주차 6·2주차 2) —
기존 공개 JSON의 22칸이 **전부 포함**되고, 추가 3칸(1주차 AL·EWA·IPS 셀프피드백)은 JSON 마지막 동기화(02:59) 이후 제출분.
(중간 조회 때 `sync_pending 1`·0주차 EWA/VT 셀프피드백 누락은 아직 안 읽은 배치였고, 끝난 뒤 채워짐.)

**남은 일(순서대로):**
1. 사용자가 화면에서 몇 칸(상세·직접 확인 등) 더 써 보고 문제없다고 확인하면: `.github/workflows/assignment-sync.yml`·`server/export-snapshot.js`·`server/snapshot.js`·공개 JSON 제거, GitHub Secrets
   `GMAIL_REFRESH_TOKEN` 등 삭제, `assignment.js`의 읽기 전용 폴백을 "로그인해 주세요" 안내로 교체, `server/` 전체 정리 여부 결정
   (지금은 matching 규칙이 `server/`와 `worker/`에 두 벌 — 규칙을 고치면 둘 다 고칠 것).
2. 참고: 이전 로컬 DB의 수동 표시(직접 확인/해당 없음)는 이 PC에 없어 옮기지 않았다. 공개 JSON에는 `"manual"`이 0칸이라 메일 근거는 첫 동기화로 전부 다시 채워진다.
   개인정보처리방침에 새 저장 항목(메시지 ID 판정 기록, 서버 저장 위치 Cloudflare) 반영은 5단계에서.

### 온라인 전환 0~1단계: Cloudflare 준비 + 서버 뼈대·로그인 잠금 (2026-09-14, 사용자 지시 · Claude Code) — **완료, 다음은 2단계**

계획·결정은 `docs/PRODUCT.md` "온라인 전환"(A안: 화면은 GitHub Pages 유지 + Google 로그인, 저널·Future Item까지 전부 서버 DB로).

**0단계(완료):** 사용자 Cloudflare 가입·wrangler OAuth 허용. workers.dev 서브도메인이 이메일 아이디로 자동 생성돼 사용자 선택으로
`phibrain`으로 변경(API는 이름 변경 불가 → 워커 0개 상태에서 삭제 후 재등록, 실패 시 원복하도록 처리). 사용자가 Google OAuth 클라이언트에
JS 원본 `https://yongzu.github.io`·`http://localhost:5500`, 리디렉션 URI `https://api.phibrain.workers.dev/auth/google/callback` 추가.

**1단계(구현·배포 완료):**
- `worker/`(신규): Cloudflare Worker `api` → **`https://api.phibrain.workers.dev`**, D1 `phi-brain`(APAC, id는 `wrangler.jsonc`에 — 비밀 아님).
  wrangler는 `npx wrangler@4.131.1`로 고정(설치 파일 없음). Secrets: `GOOGLE_CLIENT_ID`, `ALLOWED_EMAIL`, `SESSION_SECRET`(무작위 생성, 값은 출력 안 함).
- `worker/src/auth.js`: Google ID 토큰을 직접 검증(RS256 서명·Google JWKS 1시간 캐시·iss·aud·exp(60초 여유)·email_verified·허용 이메일) →
  자체 세션 토큰(HMAC, 30일) 발급. **쿠키가 아니라 Bearer 토큰** — github.io와 workers.dev가 다른 사이트라 제3자 쿠키 차단에 걸리기 때문.
  세션 검증 때마다 허용 이메일 재확인(`ALLOWED_EMAIL`/`SESSION_SECRET` 교체로 전체 로그아웃 가능).
- `worker/src/index.js`: `GET /api/health`, `POST /api/session`, `GET /api/me`(세션 필요). CORS는 `ALLOWED_ORIGINS`(github.io, localhost:5500)만.
  이후 단계의 데이터 API는 모두 `requireSession()` 뒤에 붙인다.
- 프런트: `design/prototypes/config.js`(API 주소·Google 클라이언트 ID — 공개값), `auth.js`(GIS 버튼 → `/api/session` → 세션을 localStorage
  `phi-brain:session`에 보관, `PhiBrain.auth.fetch()`가 Bearer 헤더 부착·401이면 로그아웃 상태로), 프로필 서랍 맨 위 "계정" 섹션
  (로그아웃 상태: 안내 + Google 버튼 / 로그인: 이메일 · 로그인됨 + 로그아웃), 툴바 버튼 라벨 로그인 전 "로그인"·후 "프로필".
  데이터는 아직 전부 브라우저 저장(2단계부터 이전).
- 테스트 `worker/test/auth.test.js` 8개(가짜 RSA 키로 만든 JWKS: 정상·대소문자·다른 계정·다른 서명·페이로드 위조·aud/iss/exp/미인증 이메일/
  알 수 없는 키/alg none·세션 왕복·세션 위조/만료/비밀 교체/계정 교체) **8/8**, 서버 테스트 39/39 유지.

**검증(실서버):** health `{ok:true}`; 토큰 없이/위조 토큰으로 `/api/me` → 401; 가짜 credential → `malformed_token`; CORS 사전요청은
github.io만 허용 헤더를 받고 다른 출처는 못 받음. 로컬 화면: GIS 버튼 렌더, 페이지에서 API 호출(health) 성공, 로그인 전 `/api/me` 401,
Journaling·Future Item 정상 로드. **사용자가 본인 Chrome(localhost:5500)에서 실제 Google 로그인 성공 확인.** 첫 시도는
`no registered origin`(invalid_client) — GIS는 로컬 테스트 시 `http://localhost:5500`과 함께 **포트 없는 `http://localhost`도** JS 원본에
있어야 해서 사용자가 추가한 뒤 성공. 배포 주소(github.io)에서의 로그인은 push 후 아직 미확인 — 다음 세션 첫 확인 항목.

**다음 세션에서 이어서 — 2단계(Assignment Manage 서버 이전):** `server/`의 스키마·`matching.js`·Gmail 조회를 Worker+D1로(ESM 변환,
`node:https`→`fetch`, `node:sqlite`→D1 비동기), Gmail 연결 콜백 `https://api.phibrain.workers.dev/auth/google/callback`(Google에 등록 완료)에서
refresh token을 D1에 암호화 저장, Cron Trigger `59 14 * * 0`, 프런트 `assignment.js`를 `PhiBrain.auth.fetch`로. 검증 후 GitHub Actions 주간
동기화·공개 JSON 제거. 이후 3단계 저널 → 4단계 Future Item → 5단계 데이터 가져오기(데스크톱 localhost·github.io, 노트북)·개인정보처리방침 수정
→ 6단계 백업·안정화(`docs/PRODUCT.md` "온라인 전환").

### M3: 일요일 23:59 주간 자동 동기화 + 배포 사이트 읽기 전용 표 (2026-09-14, 사용자 요구사항 · Claude Code 구현)

**사용자 사전 작업(완료):** OAuth 앱 프로덕션 전환(인증은 받지 않음, 1인 사용), 전환 뒤 Gmail 재연결, GitHub Secrets
`GOOGLE_CLIENT_ID`·`GOOGLE_CLIENT_SECRET`·`GMAIL_REFRESH_TOKEN` 등록.

**추가:**
- `server/snapshot.js`(순수 함수): 누적 상태 파일의 전체 격자(0~16주차 × 12과목 × 과제/셀프피드백) 정규화 — 손으로 고친 파일의 오타·
  모르는 키는 버리고 빈칸은 `null`, 확인메일은 `"mail"`(수동 `"manual"`보다 우선), `--full` 시 `"mail"`만 지우고 `"manual"` 유지,
  검색 시작점 = 첫 실행/전체면 수신 허용 범위 시작, 아니면 **마지막 성공 동기화 − 1일**(Gmail `after:` 초 단위), 과목당 한 줄 직렬화.
- `server/export-snapshot.js`: 토큰 갱신 → 검색 → `matchEmail` → 파일 기록. 성공 시에만 `lastSyncedAt` 전진, 실패 시 `lastError`(토큰 없는
  짧은 사유, `invalid_grant`면 재연결 안내)만 기록하고 종료 코드 1. 로그에는 개수만(공개 저장소의 Actions 로그는 공개). 로컬에선
  `server/.env` + 로컬 DB의 refresh token을 자동 사용.
- `.github/workflows/assignment-sync.yml`: cron `59 14 * * 0`(일 23:59 KST) + 수동 실행(`full` 옵션) + 동기화 코드 변경 push 시 1회.
  동기화 실패도 파일에 기록·커밋한 뒤 실행을 실패 처리. **GITHUB_TOKEN으로 한 커밋은 `design-pages.yml`을 트리거하지 않으므로**
  같은 워크플로의 `deploy` 잡이 Pages를 직접 재배포(동기화 실패여도 배포 — 화면에 실패가 보이도록).
- `design/prototypes/data/assignment-status.json`: 초기 파일(로컬에서 실제 Gmail로 생성, 확인 22칸). 공개 파일 검사: 이메일·학번·이름·
  제출 링크·메시지 ID 없음(과목 바로가기 URL만).
- `assignment.js`: 백엔드 연결 실패 시 이 파일로 읽기 전용 표(위 DESIGN.md). 검증 중 발견한 버그 수정 — 읽기 전용 칸 클릭이 상세 API를
  호출해 늦게 실패하면서(Windows 연결 거부 ~2초) 표를 숨기고 백엔드 안내를 띄우던 문제(클릭은 버튼만, 실패 처리는 파일 모드에서 무시).
  캐시 버스터 `assignment.js?v=8`, `phi-brain.css?v=20260914-13`.
- `server/db.js`: 과목 바로가기 URL을 `courseLinks()`로 공용화, `COURSE_SEED` export. 테스트 `server/snapshot.test.js` 8개 추가 — **전체 39/39**.

**검증(로컬, 실제 Gmail):** 첫 실행 32통 → 확인 22칸(DB와 일치). 곧바로 재실행(증분) → 최근 2통만 읽고 변경 없음. 수동 `"manual"` 표시 후
`--full` → 메일 칸 재계산, 수동 칸 유지(테스트 표시는 원복). 백엔드 끈 상태로 화면 → 읽기 전용 라벨 24칸·"읽기 전용 · 9월 14일 오전 2:42 동기화"·
0주차 17/24·1주차 3/24·2주차 2/24, 칸 클릭·탭 전환 3.5초 뒤에도 표 유지. 백엔드 켠 상태 → 기존 버튼·상세(링크 3개) 정상.
**GitHub 첫 실행(2026-09-14 02:46 KST) — 실패, 사용자 조치 대기:** 파이프라인 자체는 설계대로 동작(실패 사유를 파일에 기록·커밋 →
Pages 재배포 → 사이트에 "마지막 동기화 실패" 표시, 기존 확인 22칸 유지). 사유 `invalid_client`. 값 노출 없는 형식 점검(실행 annotation)
결과 `GOOGLE_CLIENT_SECRET`만 정상, **`GOOGLE_CLIENT_ID`가 `.apps.googleusercontent.com`으로 끝나지 않고 `GMAIL_REFRESH_TOKEN`이
`1//`로 시작하지 않음** → 사용자에게 두 Secret 재입력 요청. 이를 위해 `export-snapshot.js`에 붙여넣은 값 앞뒤 공백 제거, `invalid_client`
안내 문구, 인증 오류 시 예/아니오 형식 점검 로그·annotation 추가(값·길이·일부 문자열은 절대 출력 안 함). 워크플로의 checkout·setup-node를
v5로 올림(Node 20 폐기 경고) — 사용자가 Secrets를 고친 뒤 push해 재실행.
**재실행(02:59 KST) — 성공.** 사용자가 두 Secret을 재입력(값은 Claude Code가 화면 출력 없이 클립보드로만 옮기고 예/아니오 형식 점검 후 붙여넣기 안내).
[run 34773210879](https://github.com/yongzu/Phi_Brain/actions/runs/34773210879): sync·deploy 모두 성공, 봇 커밋 `deed542`, `lastError: null`.
배포 사이트 확인: `https://yongzu.github.io/Phi_Brain/prototypes/home.html#assignment` → "읽기 전용 · 9월 14일 오전 2:59 동기화",
기본 2주차(2/24), 0주차 17/24, 백엔드 안내 없음. 다음 자동 실행은 **2026-09-20(일) 23:59 KST**.
남은 경고: `actions/configure-pages@v5`·`deploy-pages@v4`가 Node 20 대상이라 Node 24로 강제 실행된다는 안내(동작에는 문제 없음, 새 버전 나오면 교체).

### M1: 제목 기준 과목·과제/셀프피드백 인식, 폼 주차(0~16) 기준 표 (2026-09-14, 사용자 요구사항 · Claude Code 구현)

**사전 확인(실제 데이터):** 사용자가 Gmail을 프로덕션 앱으로 재연결한 뒤, 실제 Forms 확인메일 32통을 읽어 규칙을 설계했다
(본문은 로컬에서만 조회, 저장·커밋 안 함). 발견한 사실:
- 과제·셀프피드백 모두 제목이 `[과목명 또는 코드] 과제|셀프피드백 제출 양식을 작성해 주셔서 감사합니다`로 일정 → 제목만으로 판단 가능.
- **셀프피드백은 과목마다 메일이 따로 온다** — 예전에 계획한 "한 메일에 여러 과목 → 본문 보조 검사"는 실제로 필요 없음(스크린샷의 묶음은 Gmail 스레드 표시로 추정).
- 폼의 "주차"는 과목마다 달력과 어긋난다(0주차 웜업 제출이 08.24부터, 같은 시기에 EWA 2주차 / AL·IPS 1주차). → 사용자 결정:
  **표의 주차 = 폼에서 고른 주차 번호(0~16), 날짜 범위 표시 없음.**
- 셀프피드백 폼의 주차 설명문에 "0주차를 … 16주차를"이 먼저 나와 기존 "첫 N주차 줄" 파서가 틀리게 읽음. 트랙(a/b) 같은 라디오 질문은
  확인메일에 선택지가 전부 찍혀 선택값을 알 수 없음. `[Phi] …`·"희망 팀원" 같은 과제 외 폼도 같은 발신자로 옴.

**변경:**
- `server/matching.js` 재작성: 제목(없으면 본문 제목 줄)의 `[태그] 과제|셀프피드백 제출`로 과목·구분 판단, **`VERIFIED_FORMATS` 게이트 제거**
  (모든 과목·구분 자동 확인). 과목명 비교는 대소문자·공백·하이픈 무시(`[Self-Introduction]` → Self Introduction). 주차는 `주차 *` 질문
  아래 "그 줄 자체가 N주차"인 답만(`Image 0주차` 같은 드롭다운 라벨 허용, 설명문 속 숫자 무시). 제출 링크는 질문 블록의 마지막 줄이
  URL일 때만(설명문 속 폴더 링크 제외, 푸터에서 멈춤). 트랙은 추출하지 않음(`null`). 과제·셀프피드백 제출이 아닌 폼은 `unrelated`.
- `server/db.js`: 주차 0~16(17개), 확인메일 수신일 허용 범위 `RECEIPTS_FROM`(학기 시작 −21일)~`RECEIPTS_UNTIL`(끝 +42일) —
  주차는 날짜로 정하지 않고 "이번 기수 메일인지"만 거른다(1기라 이전 기수 메일 없음). 저장된 주차별 날짜는 기본으로 열 주차 계산용 근사치.
- `server/service.js`: 매칭 시 예전 규칙으로 검토 대기열에 들어갔던 같은 메일 삭제, "오늘"을 한국 날짜로 계산(UTC라 새벽에 전주가 열리던 문제).
  `server/sync.js`: 검색 시작일을 `RECEIPTS_FROM`으로.
- `design/prototypes/assignment.js`: 주차 라벨 `Week 02 (09.14~09.20)` → `2주차`. 캐시 버스터 `assignment.js?v=6`.
- 테스트: 가짜 `질문:/답변:` 형식 대신 실제 확인메일 구조를 본뜬 `server/test-fixtures.js`(이름·학번·링크는 가짜)로 재작성,
  설명문 속 주차·드롭다운 라벨·하이픈 과목명·0주차·과제 외 폼·검토 대기열 정리 케이스 추가. **31/31 통과.**

**검증(실제 메일):** 저장 없이 새 규칙만 돌린 결과 과목 확인메일 27통 전부 인식·과제 외 폼 5통 제외·검토 대기 0. 08.17 이전 수신은
2025년 무관 폼 2통뿐. 가짜 `demo-` 근거 2행 삭제 후 실제 동기화 → `matched 27 / review 0 / unrelated 5`. 화면: 0주차 완료 17/24
(IAE 과제만 미확인), 1주차 AL·EWA·IPS 과제 확인, 기본으로 2주차가 열림.
**관찰(사용자 확인 필요할 수 있음):** 09.07에 낸 EWA 셀프피드백은 폼에서 "2주차"를 골라 2주차 칸에 들어갔다(EWA 과제 2주차는 09.11 제출).
표는 폼에 고른 값을 그대로 따른다.

**다음:** M3 — 일요일 23:59(KST) 주간 동기화, 지난 동기화 이후 메일만 가져와 누적 JSON에 기록, 배포 사이트가 그 파일을 읽기(PRODUCT.md).

### 개인정보처리방침·서비스 약관 페이지 (2026-09-14, 사용자 요구사항 · Claude Code)

- 목적: Google OAuth 동의 화면을 "프로덕션"으로 전환하려면 브랜딩 정보(앱 이름·지원 이메일·홈페이지·개인정보처리방침)가
  필요해 "앱 게시" 버튼이 비활성화돼 있었다(M3 사전 조건 — 테스트 상태면 refresh token 7일 만료).
- 추가: `design/privacy.html`, `design/terms.html`, 공용 스타일 `design/legal.css`(앱과 같은 4톤, 새 색 없음).
  배포 주소 `https://yongzu.github.io/Phi_Brain/privacy.html`, `.../terms.html`.
- 내용은 실제 동작 기준으로 작성: 저널류는 localStorage만, Gmail은 `gmail.readonly`·Forms 확인메일 발신자만 조회,
  DB 스키마(`server/db.js`)에 실제 저장되는 항목(토큰, 과목·주차·구분·제목·수신 시각·메시지/스레드 ID·제출 링크)을 그대로 나열,
  본문 미저장, Google API 사용자 데이터 정책 Limited Use 문구 포함. M3 주간 동기화(미구현)는 "사용하는 경우"로 적고
  공개 파일엔 제출 여부만 들어간다고 명시 — **M3 구현 시 이 약속(메일 ID·제목·링크·수신 시각 비공개)을 지켜야 한다.**
  문의처는 개인 이메일 대신 GitHub Issues. 법률 검토를 받은 문서는 아님.
- 검증: 로컬에서 두 페이지 렌더·로고·글꼴·링크 확인.

### Assignment 상세 정리 · 박스 1개일 때 늘리지 않기 · Archive 카드 높이 (2026-09-14, 사용자 요구사항 3건 · Claude Code)

1. **Assignment Manage 상세 팝업** (`assignment.js`): 근거 없을 때의 "아직 확인된 근거가 없어요." 문구와 "해당 없음으로 표시" 버튼 제거.
   남은 버튼은 "직접 확인으로 표시"·"수동 확인 취소". 서버의 `not_applicable` 처리·충돌(conflict) 안내는 그대로 둠 —
   예전에 이미 '해당 없음'으로 표시된 칸은 "수동 확인 취소"로 풀 수 있다.
2. **Future Item 필터 하나만 골라도 1/4 칸 고정** (`phi-brain.css`): 공용 `.fi-list>.fi-box:only-child{grid-column:1/-1}`
   (박스 하나면 전체 폭) 규칙을 삭제. 같은 이유로 Findings에 따로 걸어 뒀던 `:only-child{grid-column:auto}` 덮어쓰기도 삭제 —
   이제 두 화면 모두 기본값으로 1칸(Future Item 1/4, Findings 1/2). `+ 박스 추가`·섹션 라벨 전체 폭은 유지.
3. **Journal Archive 카드 높이** (`phi-brain.css`): `.archive-cards`에 `align-items:start` — 그리드 기본 stretch 때문에 같은 줄의
   긴 카드 높이만큼 짧은 카드가 늘어나던 문제.

**검증(1440×900):** 미확인 칸 팝업 텍스트 = 제목·상태·버튼 2개뿐, 제출 확인 칸은 메일 근거 그대로. Future Item `#future-item/BI` 박스
253px(목록 1061px의 1/4), All의 박스 추가 타일은 전체 폭 유지. Findings 박스 1개 523px(1/2). Archive에서 짧은/긴 카드 나란히 →
높이 131px / 457px로 각자 내용만큼. 테스트 저널 삭제. 캐시 버스터 `phi-brain.css?v=20260914-12`, `future.js?v=20260914-4`, `assignment.js?v=5`.

### Journal Archive 필터 복수 선택 (2026-09-14, 사용자 요구사항 · Claude Code)

- `journal.js`: `archiveFilter`(문자열) → `archiveFilters`(배열, 빈 배열 = All, `orderArchiveFilters`로 General→과목 순 정규화),
  해시 `#journal-archive/BI,EWA`(모르는 코드는 버림). 카드 목록은 (날짜, 과목) 쌍으로 펼쳐 즐겨찾기 → 최신 날짜 → 과목 순 정렬,
  2개 이상 골랐을 때만 `archiveCardHTML(..., showCourse)`가 메타에 과목 코드 표시. CSS 변경 없음(기존 2열 `.archive-cards`).
- 검증: 저널 3건(BI / BI·EWA / AL) 심어 → BI 1개: 2장(과목 표시 없음), AL·BI·EWA: T2가 BI·EWA 두 장으로 나뉘어 총 4장 + 과목 표시,
  T2::EWA 즐겨찾기 → 맨 앞, 전부 끄면 목록(All) 모드 복귀, 딥링크 `#journal-archive/ewa,bi,XYZ` → `BI,EWA`. 테스트 저널 삭제.
- **정리:** 이 테스트 브라우저의 9/14 초안 `courses`에 앞선 붙여넣기 테스트(`**BI**` 줄은 다룬 과목에 자동 추가됨)에서 남은 `BI`가
  섞여 있어 제거(본문에 BI 태그 없음 확인). 사용자 실제 브라우저 데이터와는 무관. 캐시 버스터 `journal.js?v=20260914-7`.

### 버튼 없는 토스트 오른쪽 여백 18px (2026-09-14, 사용자 지적 · Claude Code)

- 증상: "…완료했어요"처럼 버튼 없는 토스트는 글자가 오른쪽 끝에 붙어 보임. 원인: 토스트 패딩이 좌 18px / 우 6px
  (우 6px는 되돌리기 버튼용). `phi-brain.css`에 `.toast:has(> .toast-act[hidden]){padding-right:18px}`.
- 검증: 버튼 없음 좌 18 / 우 18, 버튼 있음 좌 18 / 버튼까지 6(기존 유지), 버튼 있는 토스트 뒤 다시 없는 토스트 → 18 / 18.
  캐시 버스터 `phi-brain.css?v=20260914-10`.
- 후속: 상하 패딩 6px → 8px(모든 토스트). 검증: 버튼 없음 `8px 18px`(높이 31→35px), 버튼 있음 `8px 6px 8px 18px`(43→47px).
  캐시 버스터 `phi-brain.css?v=20260914-11`.

### Assignment Manage 상세 팝업을 누른 칸 위치에 (2026-09-14, 사용자 요구사항 · Claude Code)

- 상태 배지(미확인 등) 클릭 시 뜨는 `#am-detail`: 화면 우하단 고정(`right/bottom:32px`) → 누른 배지 바로 아래.
  `assignment.js`에 `placeDetail()`(아래 공간 부족 시 위로 뒤집기, 가장자리 16px 클램프, scroll(capture)·resize 시 재배치,
  앵커는 `targetId`로 기억해 `loadWeek()` 재렌더 뒤에도 유지), CSS `.am-detail`은 `top/left:0` 기본값으로 바꾸고 JS가 채움.
  640px 이하 모바일은 인라인 위치를 비우고 기존 하단 시트 유지.
- 검증(1440×900, 실제 로컬 서버 데이터 24칸): 위쪽 행 → 배지 아래 6px·왼쪽 정렬, 화면 아래쪽 행 → 배지 위 6px로 뒤집힘,
  스크롤 후에도 간격 6px 유지, 닫기 정상, 375px에서 좌·우·하 16px 시트. 스크린샷으로 칸 바로 아래 표시 확인.
  캐시 버스터 `assignment.js?v=4`, `phi-brain.css?v=20260914-9`.

### Future Item 완료 알림 (2026-09-14, 사용자 요구사항 · Claude Code)

- `future.js` `toggleDone`: 완료로 바뀌고 저장에 성공했을 때만 `toast("OOO를 완료했어요")`. 완료 취소는 알림 없음.
  `doneSubject()`가 20자 초과 문장을 `…`로 줄이고 받침에 따라 을/를(한글 외 끝 글자는 "을(를)").
- 검증: 4건 심어 체크 → "레퍼런스 3개 찾기를 / 과제 제출하기를 / Figma 정리 PDF을(를) / 이번 주 인터뷰 질문지 초안을 교수님…를
  완료했어요", 완료 취소 시 토스트 안 뜸, 저장값 반영 확인. 테스트 뒤 Future Item 저장소 원복 + 새로고침.
  캐시 버스터 `future.js?v=20260914-3`.

### 토스트 100px 위로 · 왼쪽 로고 (2026-09-14, 사용자 요구사항 · Claude Code)

- "정리하기"를 누를 때 뜨는 팝업 = 공용 토스트(`Future Item에 등록하기` 체크 시 "N개 Future Item 등록됨").
  `.toast-wrap{bottom:24px → 124px}`, `home.html` 토스트에 `<img class="toast-logo" src="assets/logo.png" alt="">`,
  `.toast-logo{width:1em;height:1em}`(로고가 1000×1000 정사각이라 글자 크기와 같은 정사각).
  **공용 컴포넌트라 앱의 모든 토스트(Future Item 되돌리기, Journal Archive 삭제 등)에 함께 적용된다.**
- 검증(1440×900): 토스트 아래 여백 124px, 로고 13.33px = 메시지 글자 크기 13.33px, 로고와 글자 세로 중심 일치(760px),
  로고 이미지 로드됨. 캐시 버스터 `phi-brain.css?v=20260914-8`.

### Journaling 작성 영역 높이: 기본 300px · 최대 550px (2026-09-14, 사용자 요구사항 · Claude Code)

- 먼저 "세로 1.5배" 지시로 450px / 82.5vh로 늘렸다가, 사용자가 **기본 높이 300px 유지, 최대 높이 550px**로 다시 정함.
- `phi-brain.css`: `#editor{max-height:550px}`(기존 55vh), 기본 높이는 공용 `.editor{min-height:300px}` 그대로.
  Archive "수정하기" 편집기도 같은 `#editor`라 동일 적용, 미리보기(`.archive-preview`)는 영향 없음.
- 검증: 계산값 min 300px / max 550px, 빈 문서 300px, 80줄 넣으면 550px에서 멈추고 안에서 스크롤. 캐시 버스터 `phi-brain.css?v=20260914-7`.

### 사이드바 잘림 실제 원인 수정 (2026-09-14, 사용자 재보고 · Claude Code)

- 앞선 수정(아래 "Findings 다듬기" 2번)이 효과가 없었다. 실제 원인: `.nav-list`는 `.accordion-content`라
  `overflow:hidden`이고 가장 넓은 탭 폭(227px)에 맞춰 줄어드는데, 호버/선택 시 `translateX(10px)`로 탭이 밀려
  IAE 탭 오른쪽 10px가 목록에 잘렸다. 지난번엔 탭을 사이드바하고만 비교해서 이걸 놓쳤다.
- 수정: `.side-nav .nav-list{padding-right:10px}`(`phi-brain.css`), 효과 없던 사이드바 오른쪽 패딩 34px → 24px 원복.
  캐시 버스터 `phi-brain.css?v=20260914-5`.
- 검증: 선택 상태에서 탭 오른쪽 끝 − 목록 오른쪽 끝 = 수정 전 **10px** → 수정 후 사이드바 전 탭 **0px**. 라벨 12% 확대 강제 시에도 0px,
  375px 모바일 가로 스크롤 없음. 상세는 DESIGN.md "사이드바 긴 라벨 잘림".

### Future Item 주차 이월 · Future Item/Findings 필터 복수 선택 (2026-09-14, 사용자 요구사항 2건 · Claude Code 구현)

1. **못 한 행동 이번 주로 이월** (`future.js`) — `weekItems()`의 주차 기준을 `weekOf(createdAt)`에서 `itemWeek(i)`로 교체:
   완료 = `weekOf(doneAt || createdAt)`, 미완료 = `max(weekOf(createdAt), 이번 주)`. 저장 데이터는 안 바꾸는 계산값이라
   마이그레이션 없음. 지난주 화면에서는 사라지고 이번 주에만 보인다.
2. **필터 복수 선택** — Future Item: `let filter`(문자열) → `let filters`(배열, 빈 배열 = All), `setFilter` →
   `setFilters`/`toggleFilter`, 해시 `#future-item/BI,AL`(쉼표), 기본 소속은 필터 1개일 때만 그 박스. 한 줄 최대 4개는
   기존 `.fi-list` 4열 그대로. Findings(`journal.js`): `findingsFilter` → `findingsFilters`, `applyFindingsFilters`,
   해시 `#findings/BI,EWA`, 한 줄 최대 2개는 기존 `.findings-list` 2열 그대로. CSS 변경 없음.
   `PhiBrain.show('future', { filter })`의 `filter`도 이제 **배열**이다(외부 호출처는 없음 — journal.js는 `show('journal')`만 씀).

**검증:** Future Item에 W1 미완료 / W1 완료 / W1 생성·W2 완료 / W2 생성 미완료 4건을 심어 → Week 02에 3건(이월 포함),
Week 01에는 W1에 완료한 1건만. Week 01에서 완료 취소 → Week 01에서 사라지고 Week 02에 나타남. 필터 5개 선택 → 한 줄
4개(253px×4)·5번째는 다음 줄, 1개 → 전체 폭, 전부 끄면 All, 딥링크 `#future-item/bi,ewa` → BI·EWA. Findings 과목 4개
심어 → 3개 선택 시 한 줄 2개(523px), 딥링크에 빈 과목(AOR) 섞으면 빠짐. 테스트 뒤 Future Item 저장소는 원래 값으로
복구, 심은 저널 삭제. 캐시 버스터 `future.js?v=20260914-2`, `journal.js?v=20260914-6`.

### 저널 삭제 확인 · 붙여넣기 문장 중간 굵게 · Findings 2열 고정 (2026-09-14, 사용자 요구사항 3건 · Claude Code 구현)

1. **Journal Archive 삭제 확인** — `⋯` → "삭제하기"가 바로 지우지 않고 같은 팝업을 `"제목" 저널을 삭제할까요? / 삭제 / 취소`로
   바꾼다(`showDeleteConfirm`, 기본 포커스 "취소", Esc·바깥 클릭은 취소). 새 CSS `.cm-confirm`·`.cm-danger`(ink+볼드, 새 색 없음).
   삭제 후 되돌리기 토스트는 유지.
2. **디스코드 붙여넣기 `**내용**` 굵게** — `pastedTextToHtml`의 평문 줄에 `inlineBold` 적용(문장 중간도 변환). 줄 전체가
   `**BI**` 같은 과목명이면 기존대로 과목 박스. 굵게 안에 `**`가 끼는 경우는 짝으로 보지 않음(검증 중 발견해 정규식 보강).
   **붙여넣을 때만 변환** — 이미 저장된 저널의 `**`는 그대로라, 기존 BI 저널은 다시 붙여넣어야 반영된다.
3. **Findings 한 줄 2개 고정** — `.findings-list>.fi-box:only-child{grid-column:auto}`. 박스 1개·과목 필터 선택 시에도 반 폭.
   (560px 미만 모바일 1열 규칙은 남겨 둠.)

**검증:** 실제 `paste` 이벤트로 변환 결과 확인(과목 박스 / 문장 중간 굵게 / 짝 안 맞는 `**` 원문 유지), 삭제 → 확인 단계에서
저장소 유지 → 취소 시 유지 → 삭제 확정 시 제거 + 토스트, Findings 박스 1개일 때 폭 522.5px(그리드 1061px의 절반). 테스트
데이터는 삭제. 캐시 버스터 `phi-brain.css?v=20260914-4`, `journal.js?v=20260914-5`.

### Findings: 과목 태그 단 것만, 빈 과목 숨김 (2026-09-14 후속, 사용자 요구사항 · Claude Code 구현)

- **증상(사용자 스크린샷):** BI 태그 Finding 하나뿐인데 "General 1"(본문 없이 `9월 9일`만 있는 항목)이 뜨고,
  AL·AOR 등 빈 과목 박스가 "0 / 아직 없어요."로 전부 그려짐.
- **원인:** 바로 아래 항목에서 내가 넣은 폴백 — 첫 과목 태그 앞 내용을 General로 보냈는데, 그 "내용"이 BI 태그
  위의 빈 줄(`<p><br></p>`)이었다(HTML 문자열로는 비어 있지 않아 걸러지지 않음). 빈 박스는 원래 항상 렌더링.
- **수정(`journal.js`):** `findingSlices`가 과목 태그 뒤 내용만 수집하고 첫 태그 앞·태그 없는 Finding은 버린다
  (칩·General 폴백 제거). 조각 앞뒤 빈 블록은 `isBlankBlock`으로 잘라냄. 필터·박스는 `findingsKeys(box)`로
  내용 있는 과목만, 전부 비면 안내 한 줄, 빈 과목 딥링크는 All로.
- **검증:** 스크린샷 상황 재현(칩 general·AOR·BI, Finding = 빈 줄 2개 + BI 태그 + 빈 줄 + 본문) + 태그 없는 AL
  Finding 1건 → 필터 `All 1 · BI 1`, 박스 BI 하나, 본문 앞뒤 빈 줄 없음. `#findings/AOR` → `#findings`로 복귀.
  테스트 데이터 삭제 후 `All 0` + 안내 문구. 캐시 버스터 `phi-brain.css`·`journal.js` 모두 `?v=20260914-3`.

### Findings 다듬기 · 사이드바 잘림 수정 (2026-09-14, 사용자 요구사항 6건 · Claude Code 구현)

전부 프로토타입(`design/prototypes/`) 안에서만 끝나는 변경이다. 서버·DB는 건드리지 않았다.

1. **Findings 박스 2열** — `.findings-list{grid-template-columns:repeat(2,minmax(0,1fr))}`(560px 아래 1열).
   Future Item의 4열은 한 줄짜리 할 일 기준이고 Finding은 문단이라 폭이 두 배 필요하다는 사용자 지적.
2. **사이드바 긴 라벨 잘림** — ⚠️ 이 시도는 원인을 잘못 짚어 효과가 없었다(사용자가 "아직 안 고쳐짐" 재보고).
   바로 위 "사이드바 잘림 실제 원인 수정" 항목 참고.
3. **사이드바 그룹명 General → Management** — `home.html` `<summary>` 텍스트만.
   (그룹 안 항목의 과목 배정에서 쓰는 `general` 스코프 키와는 무관.)
4. **Findings 과목 배정 기준을 "그날의 다룬 과목 칩"에서 "본문 과목 태그"로 변경** — 사용자가 보낸 3번 이미지에서
   BI 태그가 달린 Finding 하나가 General·AOR·BI 박스에 똑같이 복제돼 있었다. 원인은 어제 내가 택한 칩 기준
   배정(칩을 3개 고른 날이라 3개 박스에 모두 걸림). 이제 Finding 섹션 안의 과목 박스로 잘라 그 박스에만 넣는다
   (Journal Archive의 `courseChunks`와 같은 규칙, `journal.js`의 `extractFindingHtml` → `findingSlices`로 교체).
   태그가 하나도 없는 Finding만 칩으로, 칩도 없으면 General로 폴백한다. 제품 결정 근거는 PRODUCT.md.
5. **Findings 필터 줄 아래 여백 10px** — `.findings-filters{margin-bottom:10px}`.
6. **Journaling 과목 선택의 General 볼드** — 본문 과목 태그(`courseBoxInner`)와 과목 선택 메뉴(`openCourseMenu`)
   양쪽에서 `General`을 `<span class="nav-code">`로 감쌌다. 기존 `.nav-code{font-weight:700}` /
   `.cm-item .nav-code{color:var(--ink)}`를 타므로 새 CSS 없음 — 과목 코드(AL·BI…)와 같은 취급이 된다.

**검증(로컬 `http://localhost:5500/prototypes/home.html`):** 저널 3건을 심어 ① BI 태그 1개짜리 Finding이 BI
박스에만 들어가고(칩은 general·AOR·BI로 둔 채) ② AL·EWA 태그 2개짜리 Finding이 두 박스로 쪼개져 들어가며
③ 태그 없는 Finding만 칩(AOR)으로 떨어지는 것, Future 섹션 내용은 섞이지 않는 것을 확인. 2열·여백 10px·
Management 표기·General 볼드(`font-weight:700`, `--ink`)도 실측. 375px 모바일에서 가로 스크롤 없음,
세 모듈(`future.js`/`journal.js`/`assignment.js`) 모두 런타임 오류 없이 로드됨.
`home.html`의 캐시 버스터는 `phi-brain.css?v=20260914-2`, `journal.js?v=20260914-2`로 올렸다.

### 사이드바 개명·순서, Future Item 주차(WK) 탐색기 (2026-09-13, 사용자 요구사항 · Claude Code 구현)

- **Insight Archive → Findings 개명:** `home.html`의 사이드바 General 그룹 버튼 텍스트만 변경. 이 탭은 애초에
  `data-view`가 없는 죽은 링크(연결된 화면 없음, `future.js`의 뷰 레지스트리에도 없음)라 텍스트 변경 외에 코드 영향 없음.
- **사이드바 순서 변경:** General 그룹을 Future Item, Assignment Manage, Journal Archive, Insight Archive(기존 순서) →
  **Assignment Manage, Future Item, Findings, Journal Archive**로 재배치(`home.html`만 수정, `future.js`의 뷰 전환은
  `data-view` 속성으로 동작해 순서 무관).
- **완료 취소는 이미 구현되어 있었음(확인만 함, 코드 변경 없음):** 2026-09-12 Future Items 구현부터 있던 기능 —
  항목의 `.fi-check` 체크박스를 다시 누르면 `toggleDone()`이 `done`을 뒤집어 완료→미완료로 돌아간다(완료한 항목이
  모이는 `<details class="fi-done">` 안에서도 같은 체크박스로 동작). 로컬 미리보기에서 항목 추가 → 완료 체크 →
  "완료한 항목 1" 아코디언 펼침 → 체크 해제 → 미완료로 복귀·개수 갱신까지 실제로 재현해 확인.
- **Future Item 주차(WK) 탐색기 신규 추가(AskUserQuestion으로 설계 확인 후 진행):** 과목/커스텀 박스 그리드는 그대로 두고
  그 위에 Assignment Manage와 같은 모양의 `‹ Week NN (MM.DD~MM.DD) ›` 탐색기(`.am-week-nav`/`.am-week-label` 클래스 재사용,
  새 CSS 토큰 없음)를 새 축으로 추가했다 — 사용자가 확정한 3가지: (1) 박스 그리드는 그대로, 주차 탐색기를 **새 축**으로
  추가(그리드가 주차 축으로 완전히 재편되는 게 아니라, 탐색기로 고른 그 주에 만든 항목만 지금의 박스 그리드에 보임),
  (2) 항목의 주차는 **만든 날짜(`createdAt`)** 기준, (3) **완료된 항목도** 주차 필터에 포함(박스별 "완료한 항목"
  아코디언과 별개 축으로 동시에 적용).
  - **주차 계산:** `future.js`에 `SEMESTER_START_MS`(2026-09-07)·`weekOf(ms)`·`weekRangeLabel(n)` 추가 —
    Journal Archive(`journal.js`)·Assignment Manage 백엔드(`server/db.js`)와 같은 학기 시작일 상수를 쓰되, `journal.js`의
    `weekOf`는 ISO 날짜 문자열을 받는 반면 이쪽은 `item.createdAt`이 타임스탬프(ms)라 그대로 받는 버전으로 따로 만들었다
    (세 곳 모두 같은 상수를 각자 복사해 쓰는 기존 관례를 그대로 따름 — 공유 설정 파일은 아직 없음).
  - **필터링:** `weekItems()`(현재 `viewWeek`에 해당하는 항목만) 헬퍼를 추가하고, 기존에 `state.items`를 직접 읽던
    `itemsIn(key)`·`openCount(f)`의 기준을 `weekItems()`로 바꿔치기 — 박스 렌더링·필터 pill 개수·즐겨찾기·드래그 재정렬 등
    `itemsIn`/`openCount`를 거치는 모든 화면이 자동으로 주차 필터를 상속받는다(개별 렌더 함수는 손대지 않음).
  - **탐색기 상태:** `viewWeek`(현재 보고 있는 주차, 초기값은 오늘 기준 주차) — prev는 1주차 이하에서, next는
    오늘이 속한 주차 이상에서 비활성화(미래 주차는 볼 수 없음, 항목이 없어도 1주차까지는 갈 수 있음).
  - **새 항목은 항상 이번 주로:** `add()`가 커밋 전에 `viewWeek`를 오늘 기준 주차로 되돌린다 — 지난 주차를 보던 중에
    새 항목을 추가해도 그 항목이 보이는 주로 화면이 따라간다(사라진 것처럼 보이는 혼란 방지).
  - **위치:** `future.js`(주차 계산·상태·필터링·이벤트), `home.html`(`.fi-week-nav` 마크업, `#fi-top-row-slot` 바로 위),
    `phi-brain.css`(`.fi-week-nav{margin:18px 0 0}` 한 줄, 기존 `.am-week-nav`/`.am-week-label` 재사용).
  - **검증(로컬 미리보기):** Future Item 진입 시 탐색기가 `Week 01 (09.07~09.13)`로 뜨고 이전/다음 버튼이 둘 다
    비활성화(오늘이 1주차라 그 이전도 이후도 없음)됨을 확인. 항목 추가 → 필터 개수(`All 1`, `임시 1`)와 박스 그리드에
    즉시 반영됨을 확인 후 삭제해 정리. **미검증:** 실제로 여러 주차에 걸친 데이터가 있는 상태에서 이전 주 이동·빈 과거
    주차 표시·현재 주로 자동 복귀는 코드 리뷰로만 확인했고 실제 여러-주차 데이터로 재현하지 않았다(오늘이 학기 1주차라
    "지난 주"가 아직 존재하지 않음) — 다음 주가 시작되면 실기기로 한 번 더 확인 필요.
  - **범위 밖(사용자에게 확인하지 않음, 다루지 않음):** 지난 주차 항목의 읽기 전용 여부(현재는 과거 주차를 보면서도
    체크·수정·삭제·드래그가 그대로 가능 — "아카이브 = 못 건드림"으로 확정된 적 없어 막지 않았다), 박스 정렬(`boxOrder`)과
    주차 축의 상호작용은 원래 박스는 순서, 주차는 그 안의 항목 표시 여부만 건드리는 구조라 서로 간섭하지 않는다.
- 캐시 무효화 버전 갱신: `phi-brain.css` `20260913-14`→`20260913-15`, `future.js` `20260913-9`→`20260913-10`.
- GitHub 배포 예정(로컬 확인만 완료, 아직 push 안 함).

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
| 2026-09-13 | Claude Code | 사용자 요청 처리(3건): (1) **Journal Archive All 탭에 학기 몇 주차인지·요일 표시**: 각 행 메타에 `WK{n}`(`<span class="nav-code">`, ink색) + "M월 D일(요일)"을 맨 앞에 추가 — 주차 기준은 Assignment Manage 백엔드(`server/db.js`)와 같은 `SEMESTER_START='2026-09-07'`(학기가 바뀌면 이 상수만 바꾸면 됨)를 journal.js에도 그대로 상수로 둠, 그 이전 날짜는 음수/0 주차 대신 `Math.max(1, …)`로 WK1 표기(사용 중 실제로 나올 일은 거의 없는 방어적 처리). All 탭에만 적용, 과목 필터 카드 그리드는 대상 아님. (2) **Journaling 툴바 정리**: 에디터 도구줄의 "과목"(본문에 과목 박스를 넣던 버튼)과 "체크리스트" 버튼을 제거하고, 원래 아래 줄에 따로 있던 서식 버튼(B·I·U·S·인용·코드)을 "4F 템플릿" 옆 같은 줄로 합침(`.format-bar`를 없애고 `.editor-tools` 하나로 통합, 관련 CSS도 병합). 체크리스트는 신규 생성 경로만 제거했고, 기존에 저장된 항목의 완료 토글(원 클릭)은 그대로 남겨 과거 데이터가 깨지지 않게 함. (3) **과목 선택 방식 변경**: "과목" 버튼이 없어진 대신, 상단 "다룬 과목" 칩(필터 pill과 같은 스타일)을 누르면 그 과목의 과목 박스가 바로 커서 위치의 작성 중인 본문에 들어가도록 변경(`insertCourseBox(code)`로 코드 파라미터를 받아, 칩에서 호출할 땐 메뉴를 띄우지 않고 바로 그 과목으로 삽입) — 예전에는 칩은 "다룬 과목" 표시 전용, 본문 삽입은 별도 버튼+메뉴 선택이었던 두 경로를 하나로 합친 것. 칩을 다시 눌러 해제해도 이미 넣은 본문 내용은 그대로 둔다(표시만 끔). 로컬 미리보기에서 WK1/WK2 계산(9/13→WK1, 9/20→WK2, 8/30 이전 날짜→방어적 WK1)과 요일 표기, 서식 줄 통합, 과목 칩 클릭 시 본문에 과목 박스 삽입과 재클릭 시 해제(박스는 유지)까지 전부 확인 후 테스트 데이터 제거 | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-13, `journal.js` 20260913-9) · GitHub 배포 예정 |
| 2026-09-13 | Claude Code | 사용자 정정: 다룬 과목 칩이 클릭 시 `aria-pressed`를 토글해 굵게 표시되고 호버를 벗어나도 박스(배경)가 계속 남아 있던("선택 고정") 것을 없애 달라는 요청 — 칩 버튼에서 `aria-pressed` 속성 자체를 빼고 `renderCourses()`(선택 상태 렌더 함수)와 그 호출부 전부를 죽은 코드로 제거, 클릭은 이제 매번 조건 없이 `chosen.add(code)` 기록 + `insertCourseBox(code)` 삽입만 한다. `.course-chips .pill[aria-pressed="true"]{font-weight:700}` CSS 규칙은 처음엔 같이 지웠다가, Future Item 소속 칩(`#fi-scope-chips`)도 같은 `.course-chips` 클래스를 쓰는 진짜 단일 선택 라디오그룹이라 그쪽 굵게 표시가 같이 사라지는 회귀를 발견해 원복(주석으로 용도 구분 남김) — 다룬 과목 칩은 `aria-pressed`를 안 쓰니 그 규칙과 무관해짐. 로컬 미리보기에서 호버 시에만 박스가 나타나고 마우스를 떼면 사라짐, 클릭 시 본문 삽입과 저장 데이터의 `courses` 배열 반영, Future Item 소속 칩의 굵게 표시가 그대로 살아있음까지 확인 | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-14, `journal.js` 20260913-10) |
| 2026-09-13 | Claude Code | 버그 수정: 과목 칩을 눌러 본문에 과목 박스를 넣을 때마다 작성 섹션(에디터)이 맨 위로 스크롤되던 문제 — 원인은 칩 버튼에 포맷/삽입 버튼들과 달리 `mousedown` 시 `preventDefault()`가 없어서, 클릭이 에디터의 캐럿/포커스를 빼앗고 있었던 것. `ensureCaret()`이 "선택이 에디터 밖"으로 판단해 `editor.focus()`로 되돌리는데, 내용이 긴 `#editor{overflow-y:auto}`에 다시 포커스를 주면 브라우저가 편집기를 맨 위로 스크롤한다(그 뒤에 캐럿을 문서 끝으로 되돌려도 스크롤 위치는 이미 맨 위로 밀린 채였음). 다른 도구줄 버튼과 같은 방식(`chipsEl.addEventListener('mousedown', e => e.preventDefault())`)으로 고쳐, 클릭해도 기존 캐럿/스크롤 위치가 그대로 유지되게 함. 로컬 미리보기에서 긴 글(25줄 이상)을 쓴 뒤 에디터를 끝까지 스크롤하고 과목 칩을 눌러 스크롤 위치(`editor.scrollTop`)가 그대로 유지되면서 과목 박스가 캐럿(문서 맨 끝)에 정확히 삽입됨을 확인 후 테스트 데이터 제거 | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`journal.js` 20260913-11) |
| 2026-09-13 | Claude Code | 사용자 요청 처리(4건, AskUserQuestion으로 Future Item 주차 설계 확인 후 진행): (1) 사이드바 "Insight Archive"를 실제 쓰임(findings 보관)에 맞게 "Findings"로 개명(`data-view` 없는 죽은 링크라 텍스트만 변경). (2) 사이드바 General 순서를 Assignment Manage, Future Item, Findings, Journal Archive로 재배치. (3) "Future Item 완료 취소"는 이미 2026-09-12부터 구현돼 있던 기능임을 로컬 미리보기로 재확인만 함(코드 변경 없음). (4) Future Item에 주차(WK) 탐색기 신규 추가 — 박스 그리드는 유지하고 그 위에 Assignment Manage와 같은 `.am-week-nav` 스타일의 `‹ Week NN (MM.DD~MM.DD) ›`를 새 축으로 추가, `createdAt` 기준으로 주차 계산, 완료 항목도 포함, `itemsIn`/`openCount`가 새 `weekItems()`를 거치도록 바꿔 기존 렌더 경로가 자동으로 주차 필터를 상속받게 함, 새 항목 추가 시 이번 주로 자동 복귀. 로컬 미리보기에서 탐색기 라벨·비활성화 상태·항목 추가 시 개수 반영까지 확인 후 테스트 데이터 제거 | 실기기 확인 안 함 · 여러 주차 데이터로 이전 주 이동은 미검증(오늘이 학기 1주차) · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-15, `future.js` 20260913-10) · GitHub 배포 예정 |
| 2026-09-13 | Claude Code | Future Item 행 UI 사용자 요청 처리(4건, 사용자가 줄바꿈으로 뭉개진 행 스크린샷 첨부): (1) 행동 텍스트가 두 줄로 넘어가 아이콘과 겹치던 문제 — `.fi-text`를 줄바꿈(`overflow-wrap:anywhere`) 대신 한 줄 말줄임(`white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, flex 자식이라 `min-width:0`도 같이)으로 바꾸고, 펜(수정)·시계(마감) 아이콘 버튼 두 개를 완전히 제거해 ✕(삭제) 하나만 항상 보이게 함(`ICO_EDIT`/`ICO_CLOCK` SVG 상수와 `.fi-edit-btn`/`.fi-due-btn` 클래스 전부 삭제). (2) 수정은 원래도 있던 `.fi-text` 더블클릭(`onListDblClick`)만 남기고, 마감은 "더블클릭으로 수정 상태에 들어갔을 때 + 버튼이 우측에 뜨는" 방식으로 새로 연결 — `.fi-due-add`(마감 없는 항목이 수정 상태일 때만 렌더)를 추가하고, 이미 마감이 있는 항목은 기존처럼 `.fi-due` 배지 자체를 더블클릭해서 바꾼다(수정 상태와 무관, 팝오버 앵커를 죽은 `.fi-due-btn` 대신 배지/버튼 자기 자신으로 바로잡음 — `setDue()`의 커밋 후 포커스 대상도 `.fi-delete`로 변경). (3) 마감 배지의 지난 마감 굵게 표시(`font-weight:700`) 제거 — 지난 마감은 여전히 `--ink`로 색만 진해지고 굵기는 그대로. (4) 행 텍스트(`.fi-text`)와 수정 중 입력창(`.fi-edit`)을 마감 배지와 같은 8pt로 통일(기존엔 기본 10pt 상속). 로컬 미리보기에서 JS로 실제 폼 제출·더블클릭·마감 팝오버(오늘 날짜 + 00:00 시간)까지 재현해 말줄임(`textOverflow:ellipsis`)·8pt(`10.6667px`)·+ 버튼 등장/소멸(마감 유무에 따라)·지난 마감 배지가 진한 색이지만 `font-weight:400`임을 각각 computed style로 확인 후 테스트 데이터 삭제, 콘솔 오류 없음 확인 | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-16, `future.js` 20260913-11) · GitHub 배포 예정 |
| 2026-09-13 | Claude Code | 사용자 요청 처리(2건): (1) 드래그 중 점선 테두리 제거 — Future Item에서 박스/필터로 끌 때 뜨는 "놓을 수 있는 곳" 표시(`.is-dragging [data-drop].drop-ok`)와 같은 박스 안에서 항목을 다른 항목 위로 끌 때 뜨는 표시(`.fi-row.row-drop-over`) 둘 다 점선(`dashed`)이었던 걸 옅은 회색/진한 잉크 실선(`solid`)으로 바꿨다 — `drop-ok`(끌 수 있는 곳 전부)는 `var(--line)` 옅은 회색, `row-drop-over`(포인터가 지금 있는 곳)는 박스 레벨의 `.drop-over`와 같은 `var(--ink)` 진한 실선으로 맞춰 "가능/지금 여기" 위계를 색 진하기로만 구분한다(정적 UI 상태인 `.fi-box.is-temp`·`.fi-box-add`의 점선 테두리는 드래그와 무관해 그대로 뒀다). (2) **실제 버그 수정 — 마감 없는 항목을 수정 상태에서 + 버튼으로 마감을 달려고 하면 아무 반응이 없던 문제:** 원인은 `.fi-edit`(수정 중인 텍스트 입력칸)가 포커스를 잃을 때(`focusout`) `onListFocusout` → `saveEdit()` → `render()`가 동기적으로 실행되는데, 마우스로 `+` 버튼을 누르면 `mousedown` 시점에 브라우저가 먼저 입력칸의 포커스를 빼앗아(`blur`) 이 재렌더링을 트리거하고, 그 재렌더링이 `editingId`를 지우면서 `+` 버튼(`editing && !dueAt`일 때만 존재) 자체를 클릭이 도착하기 전에 DOM에서 없애버린 것 — 실제 마우스 클릭에서만 나타나고 스크립트로 흉내 낸 클릭(`el.click()`)에서는 재현되지 않는 이유이기도 하다(포커스 이동이 없어서). `journal.js`의 과목 칩 버튼이 겪었던 것과 같은 종류의 버그라, 같은 해법(`mousedown`에서 `preventDefault()`로 포커스 이동 자체를 막아 `blur`가 먼저 발생하지 않게 함)을 `.fi-due-add`·`.fi-delete`에 위임 리스너로 적용했다. 로컬 미리보기에서 이번엔 **실제 마우스로**(스크립트 클릭이 아니라 좌표 계산 후 `computer` 더블클릭·클릭) 재현: 더블클릭으로 수정 상태 진입 → `+` 클릭 → 마감 팝오버가 뜨는 것까지 확인(이전엔 여기서 아무 일도 안 일어났음) | 실기기 확인 안 함 · 드래그 점선 제거는 시각 변경이라 실제 드래그 제스처로 재확인 필요(코드 리뷰로만 확인) · 캐시 무효화 버전 갱신(`phi-brain.css` 20260913-17, `future.js` 20260913-12) · GitHub 배포 예정 |
| 2026-09-13 | Claude Code | 사용자 요청 처리(2건): (1) Future Item "완료 취소"를 실제 마우스로 다시 재현 확인(추가/체크/완료한 항목 펼치기/체크 해제까지) — 이전에 보고드린 대로 이미 동작하고 있어 코드 변경 없음. (2) **Journal Archive에 "삭제하기" 신규 구현:** 행/카드 `⋯` 메뉴에 "수정하기" 옆으로 "삭제하기"를 추가(`store.remove(date)` 신설). Future Item 삭제와 같은 패턴으로 확인창 없이 바로 지우고 "되돌리기" 토스트(`window.PhiBrain.ui.toast`)를 띄운다 — 되돌리면 원래 `{title,courses,html,savedAt}`이 그대로 복원된다. 지우는 날짜를 Journal Archive 안에서 편집 중이었으면 편집을 닫고 목록으로, Journaling 탭에서 보고 있던 날짜였으면 그 화면도 `load(date)`로 다시 그려 빈 문서로 되돌아가게 했다(방금 지운 초안이 계속 남아있는 것처럼 보이지 않도록). 즐겨찾기(`date::course` 키)도 `favorites.removeForDate(date)`로 같이 정리. 메뉴에 항목이 둘로 늘어난 김에 기존엔 없던 화살표 키 이동(`ArrowUp`/`ArrowDown`)도 course-menu와 같은 방식으로 추가. 로컬 미리보기에서 JS로 저널 시드 → 목록에서 삭제(빈 상태 확인, localStorage에서 실제로 지워짐 확인) → 토스트의 되돌리기 클릭(같은 호출 안에서 지연 없이 실행 — 별도 호출로 나눴다가 토스트가 자동으로 사라진 뒤라 실패했던 시행착오 있었음) → 완전히 복원됨 확인, "수정하기"는 회귀 없는지 별도로 재확인, 테스트 데이터 정리 | 실기기 확인 안 함 · 캐시 무효화 버전 갱신(`journal.js` 20260913-12) · GitHub 배포 예정 |
| 2026-09-14 | Claude Code | 사용자 요청 처리(3건): (1) Assignment Manage 상단 툴바 정리 — "Gmail 연결됨" 텍스트를 `--gray`→`--ink`+굵게로 가시성을 올리고, "연결 해제" 버튼과 "마지막 동기화" 시각 표시를 없앴다(`assignment.js`의 `disconnectBtn`/`syncTime` 관련 코드도 죽은 코드로 함께 제거) — 다만 동기화 오류만큼은 조용히 숨기지 않는다는 원칙에 따라 `last_sync_error`가 있으면 상태 텍스트 뒤에 그대로 이어붙인다. 사이드바 순서 변경 이후 보고된 "과제관리 탭 오른쪽 박스 잘림"은 재현하지 못했지만(1100px·900px 모두 표·상세 패널 정상), 이 툴바가 좁은 폭에서 줄바꿈되며 crowd돼 있던 게 원인이었을 가능성이 높아 이번 정리로 같이 해소됐을 것으로 본다 — 여전히 보이면 스크린샷으로 다시 알려달라고 안내함. (2) **Findings 페이지 신규 구현(`docs/PRODUCT.md` "Findings" 절 참고):** 사이드바 죽은 링크에 `data-view="findings"`를 달아 `future.js`의 뷰 레지스트리(`views`)·해시 라우팅(`route()`, `#findings`/`#findings/AL` 형태, journal-archive와 같이 자기 해시를 지키도록 `show()`에서 예외 처리)에 등록. 화면은 `journal.js`에 구현 — 저널 본문의 "Finding" 소제목과 다음 소제목 사이 내용을 통째로 뽑아(`extractFindingHtml`, 안의 과목 박스는 쪼개지 않음) 그날의 "다룬 과목" 칩(`courses[]`) 각각에 배정(칩이 없으면 General) — Journal Archive의 본문-과목박스 기준(`courseChunks`)과 다르게 칩 기준을 택해, 매 Finding마다 본문에 과목 박스를 안 넣어도 놓치지 않게 했다. 필터 줄은 Journal Archive와 같은 `.fi-filters` 재사용, 박스 그리드는 Future Item과 같은 `.fi-list`/`.fi-box`(4열, 폭도 1500px로 동일) 재사용 — 새 CSS는 박스 안 항목 줄(`.findings-rows`/`.findings-item`/`.findings-date`)뿐이고 항목 내용 자체는 `.editor archive-preview`를 재사용해 원문 서식이 그대로 보인다. 구현 중 두 가지 버그를 로컬에서 바로 잡음: `courseName` 함수를 journal.js에 이미 있는 줄 모르고 새로 선언해 `SyntaxError`로 스크립트 전체가 죽었던 것(279번째 줄 기존 선언 재사용으로 해결), 그리고 이 과정에서 브라우저가 몇 차례 이전 버전 스크립트를 캐시해 증상이 뒤섞였던 것(하드 리로드로 확인). 로컬 미리보기에서 서로 다른 과목 조합(단일 과목/복수 과목/과목 없음) 3건을 실제로 심어 All 그리드(과목별 개수·내용 정확히 분산)·특정 과목 필터(그 박스만 전체 폭으로)·해시 딥링크(`#findings/EWA` 직접 진입)까지 확인 후 테스트 데이터 제거, 빈 상태(전 과목 "아직 없어요")도 확인, 콘솔 오류 0건 재확인. (3) 사이드바 재확인은 안 했음(별도 보고 없었음) | 실기기 확인 안 함 · 즐겨찾기·검색·Finding 외 4F 노출은 범위 밖으로 제외(PRODUCT.md 명시) · 캐시 무효화 버전 갱신(`phi-brain.css`·`future.js`·`journal.js` 전부 `20260914-1`, `assignment.js` `v=3`) · GitHub 배포 예정 |
