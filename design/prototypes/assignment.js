/*
  Assignment Manage — weekly assignment/self-feedback submission status
  across the 12 courses.

  온라인 전환 2단계: talks to the Phi Brain API (Cloudflare Worker, worker/src/
  assignment/) through PhiBrain.auth.fetch — the same on localhost and on the
  deployed site. Signed out (or the API unreachable), it falls back to the public
  status file the old weekly GitHub Actions sync wrote (data/assignment-status.json)
  and shows it read-only; only if that file is missing too does it show the
  "server unreachable" hint. Never fake/virtual data.

  과제 내용(사용자 요구사항 2026-09-14): paste the Discord 과제 공지 per course × week;
  assignment-notice.js pulls out the deadline(s), week, course and a title. The
  column shows the title and a Future Item–style due badge. Not connected to the
  submission status at all.

  Separate from Future Item: completing either one never touches the other.
*/
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const { ui: { popIn, popOut, toast } } = window.PhiBrain;
  const notice = window.PhiAssignmentNotice;
  const auth = window.PhiBrain.auth;

  const STATUS_LABEL = {
    unconfirmed: '미확인',
    confirmed_mail: '제출 확인',
    confirmed_manual: '직접 확인',
    not_applicable: '해당 없음',
    conflict: '확인 필요',
  };
  // server error codes (worker/src/assignment/sync.js) → what the user can do about it
  const SYNC_ERROR = {
    not_connected: 'Gmail을 먼저 연결해 주세요',
    reconnect_required: 'Gmail 연결이 만료됐어요 — 다시 연결해 주세요',
    server_not_configured: '서버에 Gmail 설정이 아직 없어요',
    gmail_429: 'Gmail 요청이 많아 잠시 막혔어요 — 조금 뒤 다시 시도해 주세요',
  };
  const syncErrorText = code => SYNC_ERROR[code] || `동기화 실패 (${code})`;
  const CONNECT_RESULT = {
    connected: ['Gmail을 연결했어요 — 제출 상태를 새로고침할게요', null],
    denied: ['Gmail 연결을 취소했어요', 'error'],
    scope_missing: ['Gmail 읽기 권한을 체크해야 연결돼요 — 다시 연결해 주세요', 'error'],
    no_refresh_token: ['Gmail 연결 정보를 받지 못했어요 — 다시 연결해 주세요', 'error'],
    error: ['Gmail을 연결하지 못했어요', 'error'],
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const safeHref = url => (typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null);
  const kstTime = iso => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  // 회차 이름 비교 키 — worker/src/assignment/rounds.js roundKey와 같다("Magazine 2회차 (B)" → "magazine|2", "12주차" → "|12")
  const roundKeyOf = label => {
    const m = String(label ?? '').match(/^\s*([A-Za-z가-힣][A-Za-z가-힣 ]*?)?\s*(\d{1,2})\s*(?:회차|주차|회)/);
    return m ? `${(m[1] || '').replace(/\s+/g, ' ').trim().toLowerCase()}|${Number(m[2])}` : null;
  };

  const table = $('#am-table'), tbody = $('#am-tbody'), progressEl = $('#am-progress');
  const backendHint = $('#am-backend-hint');
  const weekLabel = $('#am-week-label'), weekPrev = $('#am-week-prev'), weekNext = $('#am-week-next');
  const gmailStatus = $('#am-gmail-status'), connectBtn = $('#am-gmail-connect');
  const refreshBtn = $('#am-refresh');
  const detail = $('#am-detail');

  let weeks = [];
  let currentWeekNo = null;
  let snapshot = null; // the loaded status file — set only while in read-only mode
  let lastMatrix = null; // what the table is showing (notes are read from here)
  // 다른 주차에서 즐겨찾기한 과제 줄들(그 주차 표에서 가져옴, 각 줄에 week) — 어느 주차를 보든 표 맨 위에 늘 보인다
  let pinnedRows = [];
  let tableRows = []; // 지금 표에 있는 줄 전부(이번 주 + 다른 주차 즐겨찾기) — 과제 내용·상세 팝업이 여기서 줄을 찾는다
  let pendingConnectResult = null;
  // 과목별 회차 목록과 공지에 이미 붙은 회차(GET /rounds, 사용자 지시 2026-11-23) — 공지 붙여넣기의 회차 고르기에 쓴다
  let roundLists = {}, roundsUsed = {};

  // 주차 고정(사용자 지시 2026-10-06): 날짜로 다음 주차에 자동으로 넘어가지 않는다 — 마지막에 ◀ ▶로 고른 주차를 그대로 연다.
  // 저장한 주차가 없을 때만 날짜로 잡은 주차를 쓰고, 그 주차도 저장해 둔다. 즐겨찾기처럼 이 기기(브라우저)에만 저장.
  const WEEK_KEY = 'phi-brain:assignment-week';
  const saveWeek = n => { try { localStorage.setItem(WEEK_KEY, String(n)); } catch {} };
  function startWeek(autoWeek) {
    let saved = null;
    try { const v = localStorage.getItem(WEEK_KEY); if (v) saved = Number(v); } catch {}
    const ok = Number.isInteger(saved) && weeks.some(w => w.week_no === saved);
    if (!ok) saveWeek(autoWeek);
    return ok ? saved : autoWeek;
  }

  // ---- read-only mode: the weekly sync's status file (server/snapshot.js) ----
  const SNAPSHOT_URL = 'data/assignment-status.json';
  const SNAPSHOT_STATUS = { mail: 'confirmed_mail', manual: 'confirmed_manual' };
  // same shape as the API's /weeks/:n/matrix, so render() is shared
  function snapshotMatrix(weekNo) {
    const cells = snapshot.weeks[weekNo] || {};
    const rows = snapshot.courses.map(c => {
      const cell = cells[c.code] || {};
      return {
        courseId: c.id, name: c.name, code: c.code, boardUrl: c.boardUrl,
        assignment: { targetId: null, status: SNAPSHOT_STATUS[cell.assignment] || 'unconfirmed', url: c.assignmentUrl },
        selfFeedback: { targetId: null, status: SNAPSHOT_STATUS[cell.selfFeedback] || 'unconfirmed', url: c.selfFeedbackUrl },
      };
    });
    const all = rows.flatMap(r => [r.assignment.status, r.selfFeedback.status]);
    return { week: { week_no: weekNo }, rows, progress: { done: all.filter(s => s !== 'unconfirmed').length, total: all.length } };
  }
  // default week — same approximation as the API's currentWeekNo (Korean date)
  function snapshotCurrentWeek(snap) {
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const days = Math.floor((Date.parse(today) - Date.parse(snap.semesterStart)) / 86400000);
    return Math.min(snap.lastWeek, Math.max(snap.firstWeek, Math.floor(days / 7) + 1));
  }
  // → true when the table is showing the file
  async function initSnapshot({ unreachable = false } = {}) {
    let snap = snapshot;
    if (!snap) {
      try {
        const res = await fetch(SNAPSHOT_URL, { cache: 'no-store' });
        if (res.ok) snap = await res.json();
      } catch {}
    }
    if (!snap) {
      if (unreachable) showUnreachable();
      else { table.hidden = true; progressEl.textContent = ''; gmailStatus.textContent = '로그인하면 제출 상태를 볼 수 있어요'; refreshBtn.hidden = connectBtn.hidden = true; }
      return false;
    }
    snapshot = snap;
    backendHint.hidden = true;
    table.hidden = false;
    weeks = Array.from({ length: snap.lastWeek - snap.firstWeek + 1 }, (_, i) => ({ week_no: snap.firstWeek + i }));
    refreshBtn.hidden = true;
    connectBtn.hidden = true;
    gmailStatus.textContent = snap.lastSyncedAt ? `읽기 전용 · ${kstTime(snap.lastSyncedAt)} 동기화` : '읽기 전용 · 아직 동기화 전';
    // 실패는 조용히 숨기지 않는다 — 지난 성공 결과는 그대로 보여주되 실패 사실을 붙인다
    if (snap.lastError) gmailStatus.textContent += ` · 마지막 동기화 실패: ${snap.lastError}`;
    gmailStatus.textContent += auth.session ? ' · 서버에 연결할 수 없어 저장본을 보여줘요' : ' · 로그인하면 상세·새로고침을 쓸 수 있어요';
    loadWeek(currentWeekNo ?? startWeek(snapshotCurrentWeek(snap)));
    return true;
  }
  function showUnreachable() { backendHint.hidden = false; table.hidden = true; }

  // ---- live mode: the API, signed in ----
  // → Response, or null when the request never got an answer (offline / API down) or the session is gone
  async function api(path, opts) {
    if (!auth.session) return null;
    let res;
    try {
      res = await auth.fetch(`/api/assignment${path}`, opts);
    } catch {
      // a slow, late failure must not blank a table the status file is already showing
      if (!snapshot) showUnreachable();
      return null;
    }
    if (res.status === 401) return null; // auth.js signs out → onChange below switches to read-only
    backendHint.hidden = true;
    table.hidden = false;
    return res;
  }
  async function apiJson(path, opts) {
    const res = await api(path, opts);
    if (!res || !res.ok) return null;
    try { return await res.json(); } catch { return null; }
  }

  // 표의 주차 = 학기 주차(0~16, 9월 7일이 1주차). 2026-11-23부터 과제는 과목의 "회차"로 부르고(줄 = 과목 × 회차),
  // 주차 아래 한 줄에 그 주의 기간을 적는다(사용자 지시 — 예전 2026-09-14 결정 "날짜 범위 표시 안 함"을 바꿈)
  const weekRangeEl = $('#am-week-range');
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const dayLabel = date => { const d = new Date(`${date}T00:00:00Z`); return `${d.getUTCMonth() + 1}.${d.getUTCDate()}(${DOW[d.getUTCDay()]})`; };
  const addDaysIso = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
  function weekDates(weekNo) {
    const w = weeks.find(x => x.week_no === weekNo);
    if (w?.start_date) return { start: w.start_date, end: w.end_date };
    if (!snapshot?.semesterStart) return null;
    const start = addDaysIso(snapshot.semesterStart, (weekNo - 1) * 7);
    return { start, end: addDaysIso(start, 6) };
  }

  function renderWeekLabel(week) {
    weekLabel.textContent = `${week.week_no}주차`;
    const range = weekDates(week.week_no);
    weekRangeEl.textContent = range ? `${dayLabel(range.start)} – ${dayLabel(range.end)}` : '';
    weekPrev.disabled = week.week_no <= weeks[0]?.week_no;
    weekNext.disabled = week.week_no >= weeks[weeks.length - 1]?.week_no;
  }

  function statusDot(status) {
    return `<span class="am-dot am-dot-${status}" aria-hidden="true"></span>`;
  }

  // 제출이 확인된 칸(메일 확인·직접 확인)은 검정 글씨(사용자 지시 2026-09-14) — 미확인·해당 없음은 회색 그대로
  const confirmedClass = status => (status === 'confirmed_mail' || status === 'confirmed_manual' ? ' is-confirmed' : '');
  // 확인메일이 언제 왔느냐로 갈리는 세 가지(사용자 지시 2026-09-16):
  //   마감 안 → '제출 확인' / 마감은 넘겼지만 지각 마감 안 → '지각 제출' / 지각 마감도 넘김 → '미제출'(안 낸 것과 같게 친다).
  // 지각 마감이 없는 과제는 마감만 보고 지각까지만 가른다. 마감을 붙여넣지 않은 과목은 견줄 기준이 없어 예전처럼 '제출 확인'.
  // 과제 내용의 마감은 과제 마감이다 — 셀프피드백 칸에는 쓰지 않는다(셀프피드백 마감은 따로 알 수 없어 늘 '제출 확인').
  // 예전엔 셀프피드백도 과제 지각 마감과 견줘, 과제 마감 뒤에 낸 3주차 셀프피드백이 '미제출'로 보였다(2026-10-01 사용자 제보)
  const noteFor = (kind, note) => (kind === 'assignment' ? note : null);
  function lateness(cell, note) {
    if (cell.status !== 'confirmed_mail' || !cell.confirmedAt || !note?.dueAt) return null;
    const at = Date.parse(cell.confirmedAt);
    if (note.lateDueAt && at > kstMs(note.lateDueAt)) return 'missed';
    return at > kstMs(note.dueAt) ? 'late' : null;
  }
  const LATENESS_LABEL = { late: '지각 제출', missed: '미제출' };
  const cellLabel = (cell, note) => LATENESS_LABEL[lateness(cell, note)] || STATUS_LABEL[cell.status] || cell.status;
  // 지각 마감까지 넘긴 칸은 '미확인'과 같은 회색·빈 점으로 — 글자만 미제출이고 점은 검정이면 낸 것처럼 보인다
  const cellStatusKey = (cell, note) => (lateness(cell, note) === 'missed' ? 'unconfirmed' : cell.status);
  function renderCell(courseCode, kindLabel, cell, note) {
    // 메일로 제출이 확인된 칸(로그인 상태)은 ↗가 메뉴 — 과제 제출폼 / 제출한 메일(사용자 지시 2026-09-14). 그 밖은 제출폼 바로 열기
    const mailMenu = cell.status === 'confirmed_mail' && cell.targetId != null;
    const rd = esc(cell.round || '');
    const shortcut = mailMenu
      ? `<button type="button" class="am-shortcut" data-link-target="${cell.targetId}" data-link-round="${rd}" data-form-url="${safeHref(cell.url) ? esc(cell.url) : ''}" aria-haspopup="menu" aria-expanded="false" title="${esc(kindLabel)} 링크" aria-label="${esc(kindLabel)} 제출폼 또는 제출한 메일 열기">↗</button>`
      : safeHref(cell.url)
      ? `<a class="am-shortcut" href="${esc(cell.url)}" draggable="false" target="_blank" rel="noopener" title="${esc(kindLabel)} 제출폼 열기" aria-label="${esc(kindLabel)} 제출폼 열기">↗</a>`
      : '';
    // read-only mode has no detail panel (no mail details are published) — a plain label, not a button
    const shown = cellStatusKey(cell, note);
    const status = `${statusDot(shown)}<span>${cellLabel(cell, note)}</span>`;
    return `<td><span class="am-cell">
      ${cell.targetId == null
        ? `<span class="am-status is-static${confirmedClass(shown)}">${status}</span>`
        : `<button type="button" class="am-status${confirmedClass(shown)}" data-target-id="${cell.targetId}" data-round="${rd}">${status}</button>`}
      ${shortcut}
    </span></td>`;
  }

  // ---- 과제 내용 칸 ----
  // "2026-09-15T23:59" is Korean wall-clock time (what the notice says) → an instant
  const kstMs = at => { const [d, t = '23:59'] = at.split('T'); const [y, m, dd] = d.split('-').map(Number); const [hh, mm] = t.split(':').map(Number); return Date.UTC(y, m - 1, dd, hh - 9, mm); };
  // after the deadline, a late deadline (if any) takes over the badge; past the deadline and still unconfirmed → dark text
  function dueBadge(note, status) {
    if (!note?.dueAt) return '';
    const now = Date.now();
    const pastDue = now > kstMs(note.dueAt);
    const late = pastDue && note.lateDueAt;
    const overdue = pastDue && (status === 'unconfirmed' || status === 'conflict');
    return `<span class="fi-due am-note-due${overdue ? ' is-overdue' : ''}">${late ? '지각 마감' : '마감'} ${notice.dueLabel(late ? note.lateDueAt : note.dueAt)}</span>`;
  }
  // 칸 글자는 늘 "자세히보기"(사용자 지시 2026-09-14 — 저장 후에도 제목 미리보기 없이 고정).
  // 저장 전은 회색, 저장 후는 검정 — 채워졌는지는 글자색과 마감 배지로만 구분한다.
  function renderNoteCell(row) {
    if (row.note === undefined) { // read-only file mode: nothing stored, nothing to open
      return `<td><span class="am-note-cell"><button type="button" class="am-note-btn" data-note-login>자세히보기</button></span></td>`;
    }
    const label = row.note ? `${row.code} 과제 내용 보기` : `${row.code} 과제 공지 붙여넣기`;
    // 공지는 있는데 마감을 못 읽었으면 "마감 없음" — 바로 채울 수 있게(사용자 지시 2026-11-23)
    const noDue = row.note && !row.note.dueAt ? '<span class="fi-due am-note-due" title="자세히보기 → 수정하기에서 마감을 넣어 주세요">마감 없음</span>' : '';
    return `<td><span class="am-note-cell">
      <button type="button" class="am-note-btn${row.note ? ' is-set' : ''}" data-note-course="${esc(row.courseId)}" data-note-wk="${row.week}" data-note-round="${esc(row.round || '')}" aria-label="${esc(label)}">자세히보기</button>
      ${dueBadge(row.note, row.assignment.status)}${noDue}
    </span></td>`;
  }

  function render(matrix) {
    lastMatrix = matrix;
    renderWeekLabel(matrix.week);
    // 서버는 마감을 모르고 세므로, 지각 마감까지 넘겨 '미제출'이 된 칸은 여기서 뺀다
    const missed = matrix.rows.filter(r => !r.courseState).reduce((n, r) => n + (lateness(r.assignment, r.note) === 'missed' ? 1 : 0), 0);
    progressEl.textContent = `완료 ${matrix.progress.done - missed} / ${matrix.progress.total}`;
    // 즐겨찾기한 과제는 표 맨 위로, 누른 순서대로 — 다른 주차 것도 늘 함께(사용자 지시 2026-09-19).
    // 나머지는 이번 주 과목들, 원래 과목 순서. 같은 과목이 다른 주차 즐겨찾기로 위에도 한 줄 더 있을 수 있다(WK 박스로 구분)
    const week = matrix.week.week_no;
    adoptLegacyFavorites(week);
    const current = matrix.rows.map(r => ({ ...r, week }));
    // 수강기간 아님·완강 과목(과목 이름 메뉴)은 즐겨찾기와 상관없이 맨 아래·회색 — 수강기간 아님 → 완강 순(사용자 지시 2026-10-01)
    if (matrix.rounds) roundLists = matrix.rounds;
    tableRows = [...current, ...pinnedRows.filter(r => r.week !== week && !r.courseState)];
    const byKey = new Map(tableRows.map(r => [favKey(r.code, r.week, r.round), r]));
    const favRows = favorites.map(k => byKey.get(k)).filter(r => r && !r.courseState);
    const byOrder = (a, b) => orderRank(a.code) - orderRank(b.code);
    const rest = current.filter(r => !r.courseState && !favorites.includes(favKey(r.code, week, r.round))).sort(byOrder);
    const offRows = OFF_STATES.flatMap(st => current.filter(r => r.courseState === st).sort(byOrder));
    const shown = [...favRows, ...rest, ...offRows];
    tbody.innerHTML = shown.map((row, i) => {
      const isFav = i < favRows.length, other = row.week !== week, off = row.courseState;
      const key = favKey(row.code, row.week, row.round);
      const what = row.round ? `${row.round}` : `${row.week}주차 과제`;
      // 회차가 붙은 줄은 회차를(사용자 지시 2026-11-23: 과제는 회차로 표기), 없는 줄은 예전처럼 WK12.
      // 회차 목록에 있는 회차면 옆에 "3/8"(남은 회차를 한눈에). 다른 주차 즐겨찾기 줄은 주차도 함께
      const tags = row.round
        ? `${other ? `<span class="am-week-tag is-other" title="${row.week}주차 — 다른 주차에서 즐겨찾기">WK${String(row.week).padStart(2, '0')}</span>` : ''}<span class="am-week-tag${other ? ' is-other' : ''}" title="${row.week}주차 · ${esc(row.round)}">${esc(row.round)}</span>${row.roundPos ? `<span class="am-week-tag" title="회차 목록 마지막은 ${row.roundPos.last}회차">${row.roundPos.n}/${row.roundPos.last}</span>` : ''}`
        : `<span class="am-week-tag${other ? ' is-other' : ''}" title="${row.week}주차 과제${other ? ' — 다른 주차에서 즐겨찾기' : ''}">WK${String(row.week).padStart(2, '0')}</span>`;
      return `<tr data-am-row="${esc(key)}" data-am-group="${isFav ? 'fav' : off ? `off-${off}` : 'rest'}"${off ? ' class="is-off"' : ''} draggable="true">
        <td><span class="am-cell">
          <button type="button" class="am-grip" data-am-grip aria-label="${esc(row.code)} 줄 순서 바꾸기 — 끌거나 ↑·↓" title="끌어서 순서 바꾸기">⠿</button>
          <button type="button" class="fi-box-fav am-fav${isFav ? ' is-fav' : ''}${off ? ' is-off' : ''}"${off ? ' tabindex="-1" aria-hidden="true"' : ''} data-am-fav-key="${esc(key)}" aria-pressed="${isFav}" aria-label="${isFav ? '즐겨찾기 해제' : '즐겨찾기 — 표 맨 위로'}: ${esc(row.code)} ${esc(what)}"></button>
          <button type="button" class="am-course-name" data-am-course="${esc(row.courseId)}" data-course-wk="${row.week}" data-course-round="${esc(row.round || '')}" aria-haspopup="menu" aria-expanded="false" title="수강기간 아님 · 완강 · 휴강 · 회차 추가"><b>${esc(row.code)}</b>_${esc(row.name)}</button>
          ${off
            ? `<span class="am-week-tag am-state-tag">${COURSE_STATE_LABEL[off]}</span>`
            : `${tags}${isRest(row) ? '<span class="am-week-tag am-state-tag" title="이 주 세션 없음 — 셀프피드백 해당 없음">휴강</span>' : ''}`}
          ${safeHref(row.boardUrl)
            ? `<a class="am-shortcut" href="${esc(row.boardUrl)}" draggable="false" target="_blank" rel="noopener" title="${esc(row.code)} Figma 보드 열기" aria-label="${esc(row.code)} Figma 보드 열기">↗</a>`
            : ''}
        </span></td>
        ${renderCell(row.code, `${row.code} 과제`, row.assignment, row.note)}
        ${renderNoteCell(row)}
        ${renderCell(row.code, `${row.code} 셀프피드백`, row.selfFeedback, noteFor('self_feedback', row.note))}
      </tr>`;
    }).join('');
    markFavLast();
    // 오른쪽 TO-DO 열(assignment-todo.js)도 같은 때 새로 읽는다 — 제출 상태·과제 내용이 바뀌었을 수 있다
    // 개인 할 일 줄(assignment-tasks.js)은 이 이벤트를 받아 표 아래쪽에 끼워 넣는다 — 보는 주차와 로그인(서버) 여부를 함께 준다
    document.dispatchEvent(new CustomEvent('phibrain:assignment-rendered', { detail: { week, live: !snapshot } }));
  }

  // ---- 과제 즐겨찾기(사용자 지시 2026-09-19): 당장 할 과제를 표 맨 위에 둔다 ----
  // 즐겨찾기는 "과목 × 주차" 하나 — 3주차에 누른 AL은 3주차 표에서만 위로 올라간다. 주차는 과목명 옆 WK03 박스.
  // "AL:3" 같은 키 목록을 이 기기(브라우저)에만 저장한다(로그인 전 읽기 전용 표에서도 그대로).
  // 새로 누른 것이 즐겨찾기 묶음의 맨 끝으로 간다(누른 순서 유지).
  const FAV_KEY = 'phi-brain:assignment-favorites';
  // 회차가 붙은 줄은 "TF:12:Fonts 3회차"(한 주에 같은 과목 회차가 여럿일 수 있다, 2026-11-23). 회차 없는 줄은 예전 그대로 "AL:3"
  const favKey = (code, week, round = '') => (round ? `${code}:${week}:${round}` : `${code}:${week}`);
  let favorites = (() => { try { const v = JSON.parse(localStorage.getItem(FAV_KEY)); return Array.isArray(v) ? v.filter(c => typeof c === 'string') : []; } catch { return []; } })();
  const saveFavorites = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch {} };
  // 주차 없이 과목만 저장하던 예전 즐겨찾기("AL")는 처음 보이는 주차의 과제로 옮긴다
  function adoptLegacyFavorites(week) {
    if (!favorites.some(k => !k.includes(':'))) return;
    favorites = [...new Set(favorites.map(k => (k.includes(':') ? k : favKey(k, week))))];
    saveFavorites();
  }
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // 다른 주차 즐겨찾기 줄을 그 주차 표에서 가져온다(주차마다 한 번). 읽기 전용이면 상태 파일에서
  async function loadPinnedRows(week) {
    const weeksNeeded = [...new Set(favorites.filter(k => !k.startsWith('task:')).map(k => Number(k.split(':')[1])).filter(w => Number.isInteger(w) && w !== week))];
    const lists = await Promise.all(weeksNeeded.map(async w => {
      const m = snapshot ? (snapshot.weeks ? snapshotMatrix(w) : null) : await apiJson(`/weeks/${w}/matrix`);
      return m ? m.rows.filter(r => favorites.includes(favKey(r.code, w, r.round))).map(r => ({ ...r, week: w })) : [];
    }));
    return lists.flat();
  }
  // 즐겨찾기 묶음 끝 줄의 회색 선 — 개인 할 일 줄(assignment-tasks.js)이 즐겨찾기 묶음에 끼어든 뒤에도 다시 부른다
  function markFavLast() {
    tbody.querySelectorAll('tr.am-fav-last').forEach(tr => tr.classList.remove('am-fav-last'));
    const last = [...tbody.querySelectorAll('tr[data-am-group="fav"]')].pop();
    if (last?.nextElementSibling) last.classList.add('am-fav-last');
  }
  // key = "AL:3"(과목 × 주차) 또는 "task:<id>"(개인 할 일, 사용자 지시 2026-10-06)
  function toggleAmFavorite(key) {
    const on = !favorites.includes(key);
    favorites = on ? [...favorites, key] : favorites.filter(k => k !== key);
    saveFavorites();
    // 줄이 새 자리로 미끄러져 가게(FLIP) — Future Item 박스 순서 바꾸기와 같은 방식
    const before = new Map([...tbody.rows].map(tr => [tr.dataset.amRow, tr.getBoundingClientRect().top]));
    render(lastMatrix);
    if (!reduceMotion.matches) {
      [...tbody.rows].forEach(tr => {
        const dy = before.get(tr.dataset.amRow) - tr.getBoundingClientRect().top;
        if (dy) tr.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
    }
    tbody.querySelector(`[data-am-row="${CSS.escape(key)}"] .am-fav`)?.focus({ preventScroll: true }); // 다른 주차 줄을 풀면 줄이 사라져 포커스할 곳이 없다
    placeDetail(); // 열린 팝업이 있으면 옮겨 간 칸을 따라간다
  }

  // ---- 줄 순서 바꾸기(사용자 지시 2026-10-01): 줄을 끌어(2026-10-06부터 줄 어디든, 또는 ⠿에서 ↑·↓) 같은 묶음 안 순서를 바꾼다 ----
  // 개인 할 일 줄(키 "task:<id>")도 같은 묶음에 든다 — 별표하면 즐겨찾기, 아니면 과목 줄과 한 묶음("rest"). 순서는 과목 순서 목록에 키 그대로 함께 저장
  // 즐겨찾기 묶음은 favorites 배열 순서를, 나머지는 과목 순서(과목 코드 목록 — 모든 주차에 같이 적용)를 바꾼다.
  // 묶음을 넘나들지는 않는다(즐겨찾기 여부는 별표로). 즐겨찾기처럼 이 기기(브라우저)에만 저장.
  const ORDER_KEY = 'phi-brain:assignment-order';
  let courseOrder = (() => { try { const v = JSON.parse(localStorage.getItem(ORDER_KEY)); return Array.isArray(v) ? v.filter(c => typeof c === 'string') : []; } catch { return []; } })();
  const orderRank = code => { const i = courseOrder.indexOf(code); return i < 0 ? Infinity : i; };
  const groupRows = group => [...tbody.querySelectorAll(`tr[data-am-group="${group}"]`)];
  // 한 묶음의 새 줄 순서(data-am-row 키 목록)를 저장하고 다시 그린다 — 줄이 새 자리로 미끄러져 간다
  function applyRowOrder(group, keys, focusKey) {
    if (group === 'fav') {
      favorites = [...keys, ...favorites.filter(k => !keys.includes(k))];
      saveFavorites();
    } else {
      const codes = keys.map(k => (k.startsWith('task:') ? k : k.split(':')[0])); // 개인 할 일은 "task:<id>" 그대로
      courseOrder = [...codes, ...courseOrder.filter(c => !codes.includes(c))];
      try { localStorage.setItem(ORDER_KEY, JSON.stringify(courseOrder)); } catch {}
    }
    const before = new Map([...tbody.rows].map(tr => [tr.dataset.amRow, tr.getBoundingClientRect().top]));
    render(lastMatrix);
    if (!reduceMotion.matches) {
      [...tbody.rows].forEach(tr => {
        const dy = before.get(tr.dataset.amRow) - tr.getBoundingClientRect().top;
        if (dy) tr.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
    }
    if (focusKey) tbody.querySelector(`[data-am-row="${CSS.escape(focusKey)}"] [data-am-grip]`)?.focus({ preventScroll: true });
    placeDetail();
  }
  let dragRow = null;
  const clearRowDrop = () => tbody.querySelectorAll('.drop-before,.drop-after').forEach(tr => tr.classList.remove('drop-before', 'drop-after'));
  // 줄 어디를 잡아도 끈다(사용자 지시 2026-10-06 — 예전엔 ⠿만 잡혀 순서 바꾸기가 불편했다). 줄은 늘 draggable이고,
  // 그 안의 버튼은 움직이지 않고 누르면 그대로 클릭, ↗ 링크는 draggable="false"라 링크 대신 줄이 끌린다. 줄 글자 선택은 안 된다
  tbody.addEventListener('dragstart', e => {
    const tr = e.target.closest?.('tr[draggable="true"]');
    if (!tr) return;
    dragRow = tr;
    tr.classList.add('is-drag-src');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tr.dataset.amRow);
    closeLinkMenu();
  });
  // 끄는 동안은 문서 어디서든 받는다 — 같은 묶음 줄 위에서만 받으면 표 왼쪽 여백·머리줄·다른 묶음 위에서
  // 브라우저가 금지(🚫) 커서를 띄웠다(사용자 제보 2026-10-02). 놓일 자리 = 포인터 높이에 맞는 같은 묶음 줄(묶음 위·아래로 나가면 처음·끝)
  function dropSlot(y) {
    const rows = groupRows(dragRow.dataset.amGroup);
    for (const tr of rows) {
      const r = tr.getBoundingClientRect();
      if (y < r.bottom) return { tr, after: y > r.top + r.height / 2 };
    }
    return { tr: rows[rows.length - 1], after: true };
  }
  document.addEventListener('dragover', e => {
    if (!dragRow) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const { tr, after } = dropSlot(e.clientY);
    clearRowDrop();
    if (tr !== dragRow) tr.classList.add(after ? 'drop-after' : 'drop-before');
  });
  document.addEventListener('drop', e => {
    if (!dragRow) return;
    e.preventDefault(); // 메모 칸 같은 입력칸에 끌던 줄 글자가 들어가지 않게
    const target = tbody.querySelector('.drop-before,.drop-after');
    if (!target) return;
    const key = dragRow.dataset.amRow, group = dragRow.dataset.amGroup;
    const keys = groupRows(group).map(tr => tr.dataset.amRow).filter(k => k !== key);
    keys.splice(keys.indexOf(target.dataset.amRow) + (target.classList.contains('drop-after') ? 1 : 0), 0, key);
    dragRow.classList.remove('is-drag-src');
    dragRow = null;
    clearRowDrop();
    applyRowOrder(group, keys, key);
  });
  tbody.addEventListener('dragend', () => {
    if (dragRow) dragRow.classList.remove('is-drag-src');
    dragRow = null;
    clearRowDrop();
  });
  // 키보드: ⠿에 포커스하고 ↑·↓(Alt 함께도 됨)
  tbody.addEventListener('keydown', e => {
    const grip = e.target.closest('[data-am-grip]');
    if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const tr = grip.closest('tr'), group = tr.dataset.amGroup;
    const keys = groupRows(group).map(r => r.dataset.amRow);
    const i = keys.indexOf(tr.dataset.amRow), j = i + (e.key === 'ArrowUp' ? -1 : 1);
    if (j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    applyRowOrder(group, keys, tr.dataset.amRow);
  });

  // 개인 할 일 줄(assignment-tasks.js)이 같은 즐겨찾기·줄 순서를 쓰게
  const saveOrder = () => { try { localStorage.setItem(ORDER_KEY, JSON.stringify(courseOrder)); } catch {} };
  window.PhiBrain.amTable = {
    favorites: () => favorites,
    orderRank,
    markFavLast,
    // 지운 할 일을 되돌리면 새 id가 된다 — 별표·순서를 그 id로 옮긴다
    renameKey(from, to) {
      if (favorites.includes(from)) { favorites = favorites.map(k => (k === from ? to : k)); saveFavorites(); }
      if (courseOrder.includes(from)) { courseOrder = courseOrder.map(k => (k === from ? to : k)); saveOrder(); }
    },
    // 서버 목록에 없는 할 일(다른 기기에서 지운 것 등)의 별표·순서는 지운다
    pruneTasks(ids) {
      const keep = k => !k.startsWith('task:') || ids.has(k.slice(5));
      if (!favorites.every(keep)) { favorites = favorites.filter(keep); saveFavorites(); }
      if (!courseOrder.every(keep)) { courseOrder = courseOrder.filter(keep); saveOrder(); }
    },
  };

  async function loadWeek(weekNo) {
    adoptLegacyFavorites(weekNo);
    if (snapshot) { currentWeekNo = weekNo; pinnedRows = await loadPinnedRows(weekNo); render(snapshotMatrix(weekNo)); renderReview([]); return; }
    const [matrix, pinned, rounds, review] = await Promise.all([apiJson(`/weeks/${weekNo}/matrix`), loadPinnedRows(weekNo), apiJson('/rounds'), apiJson('/review')]);
    if (!matrix || snapshot) return; // switched to read-only while waiting
    currentWeekNo = weekNo;
    pinnedRows = pinned;
    if (rounds) { roundLists = rounds.rounds || {}; roundsUsed = rounds.used || {}; }
    render(matrix);
    renderReview(review?.items || []);
  }

  // ---- 확인 필요(사용자 지시 2026-11-23): 어느 주차 · 회차인지 못 정한 확인메일 ----
  // 지금 보는 주차에 회차를 골라 넣는다(다른 주차로 가지 않는다). "관련 없음"은 목록에서만 뺀다
  const reviewSection = $('#am-review'), reviewList = $('#am-review-list');
  let reviewItems = [];
  const KIND_WORD = { assignment: '과제', self_feedback: '셀프피드백' };
  function reviewChoices(item) {
    // 이 주 표에 있는 그 과목 줄의 회차 + 과목 회차 목록 + 회차 없음. 폼 답과 같은 회차를 먼저 고른다
    const inWeek = (lastMatrix?.rows || []).filter(r => r.courseId === item.courseId).map(r => r.round || '');
    const opts = [...new Set([...inWeek, ...(roundLists[item.courseId] || []), ''])];
    const want = roundKeyOf(item.roundAnswer);
    const pick = opts.find(o => o && roundKeyOf(o) === want) ?? inWeek[0] ?? '';
    return opts.map(o => `<option value="${esc(o)}"${o === pick ? ' selected' : ''}>${o ? esc(o) : '회차 없음'}</option>`).join('');
  }
  function renderReview(items) {
    reviewItems = items;
    if (snapshot || !items.length) { reviewSection.hidden = true; reviewList.innerHTML = ''; return; }
    reviewSection.hidden = false;
    reviewList.innerHTML = items.map(it => {
      const code = (lastMatrix?.rows || []).find(r => r.courseId === it.courseId)?.code || it.courseId?.toUpperCase() || '과목 모름';
      const can = it.courseId && it.kind;
      return `<li class="am-review-item" data-review-id="${esc(it.id)}">
        <span class="am-review-what">${esc(code)} ${KIND_WORD[it.kind] || '제출'}</span>
        <span>${kstTime(it.receivedAt)}${it.roundAnswer ? ` · 폼 답 "${esc(it.roundAnswer)}"` : ''}</span>
        ${can ? `<select aria-label="넣을 회차">${reviewChoices(it)}</select>
        <button type="button" class="pill" data-review-act="place">${currentWeekNo}주차에 넣기</button>` : ''}
        ${it.threadId ? `<a href="https://mail.google.com/mail/u/0/#all/${encodeURIComponent(it.threadId)}" target="_blank" rel="noopener">메일 ↗</a>` : ''}
        <button type="button" class="pill" data-review-act="dismiss">관련 없음</button>
      </li>`;
    }).join('');
  }
  reviewList.addEventListener('click', async e => {
    const btn = e.target.closest('[data-review-act]');
    if (!btn) return;
    const li = btn.closest('[data-review-id]'), id = li.dataset.reviewId, it = reviewItems.find(x => x.id === id);
    if (!it) return;
    btn.disabled = true;
    const res = btn.dataset.reviewAct === 'place'
      ? await api(`/review/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: it.courseId, kind: it.kind, weekNo: currentWeekNo, round: li.querySelector('select')?.value || '' }) })
      : await api(`/review/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res?.ok) { btn.disabled = false; toast('저장하지 못했어요', null, 'error'); return; }
    toast(btn.dataset.reviewAct === 'place' ? `${currentWeekNo}주차에 넣었어요` : '목록에서 뺐어요');
    reloadTable();
  });

  async function loadWeeksList() {
    const data = await apiJson('/weeks');
    if (!data) return null;
    weeks = data.weeks;
    return data.currentWeekNo;
  }

  async function loadConnection() {
    const c = await apiJson('/connection');
    if (!c || snapshot) return c;
    refreshBtn.hidden = false;
    if (c.connected) {
      gmailStatus.textContent = c.email ? `Gmail 연결됨 · ${c.email}` : 'Gmail 연결됨';
      connectBtn.hidden = true;
    } else {
      gmailStatus.textContent = 'Gmail 연결 안 됨';
      connectBtn.hidden = false;
    }
    // 마지막 동기화 시각 표시는 없앴지만, 오류만큼은 조용히 숨기지 않는다 — 상태 텍스트 뒤에 이어붙인다
    if (c.last_sync_error && c.last_sync_error !== 'not_connected') gmailStatus.textContent += ` · 오류: ${syncErrorText(c.last_sync_error)}`;
    return c;
  }

  // 다른 화면(Course Agent의 "N주차 공지" 출처)에서 이 주차로 열게 — 그다음 show('assignment')가 이 주차를 그린다
  window.PhiBrain.assignmentWeek = n => { if (!Number.isInteger(n)) return; saveWeek(n); currentWeekNo = n; };

  weekPrev.addEventListener('click', () => { if (currentWeekNo > weeks[0]?.week_no) { saveWeek(currentWeekNo - 1); loadWeek(currentWeekNo - 1); } });
  weekNext.addEventListener('click', () => { if (currentWeekNo < weeks[weeks.length - 1]?.week_no) { saveWeek(currentWeekNo + 1); loadWeek(currentWeekNo + 1); } });

  // Google's consent page is a full-page visit, which can't carry our session —
  // the API hands back a URL with a signed state that brings the browser back here
  connectBtn.addEventListener('click', async () => {
    connectBtn.disabled = true;
    const returnTo = window.phiDesktop?.connectGmail ? 'phibrain://gmail' : `${location.origin}${location.pathname}#assignment`;
    const res = await api('/gmail/connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnTo }),
    });
    const body = res && await res.json().catch(() => null);
    connectBtn.disabled = false;
    if (!body?.url) { toast(body?.error === 'server_not_configured' ? SYNC_ERROR.server_not_configured : 'Gmail 연결을 시작하지 못했어요', null, 'error'); return; }
    if (window.phiDesktop?.connectGmail) {
      try {
        await window.phiDesktop.connectGmail(body.url);
        toast('기본 브라우저에서 Gmail 연결을 계속해 주세요');
      } catch { toast('브라우저를 열지 못했어요. 다시 시도해 주세요', null, 'error'); }
    } else {
      location.href = body.url;
    }
  });

  // The server reads Gmail in small batches (worker/src/assignment/sync.js);
  // keep asking until it says the run is done.
  const MAX_SYNC_ROUNDS = 40;
  let syncing = false;
  async function refreshStatus() {
    if (syncing) return;
    syncing = true;
    refreshBtn.disabled = true;
    refreshBtn.textContent = '새로고침 중…';
    const total = { matched: 0, review: 0, fetched: 0 };
    let error = null, done = false;
    for (let round = 0; round < MAX_SYNC_ROUNDS && !done; round++) {
      const res = await api('/sync', { method: 'POST' });
      const body = res && await res.json().catch(() => null);
      if (!body?.ok) { error = body?.error || 'network'; break; }
      for (const k of Object.keys(total)) total[k] += body.summary[k] || 0;
      done = body.done;
      if (!done) refreshBtn.textContent = `새로고침 중… 메일 ${total.fetched}통 확인`;
      if (!done && currentWeekNo != null) loadWeek(currentWeekNo); // show progress as it lands
    }
    syncing = false;
    refreshBtn.disabled = false;
    refreshBtn.textContent = '제출 상태 새로고침';
    if (error) toast(error === 'network' ? '서버에 연결하지 못했어요' : syncErrorText(error), null, 'error');
    else if (!done) toast(`메일이 많아 일부만 확인했어요(${total.fetched}통) — 한 번 더 새로고침해 주세요`, null, 'error');
    else toast(`동기화 완료 · 새로 확인됨 ${total.matched} · 검토 필요 ${total.review}`);
    await loadConnection();
    if (currentWeekNo != null) loadWeek(currentWeekNo);
  }
  refreshBtn.addEventListener('click', refreshStatus);

  // ---- detail panel ----
  // 누른 상태 칸 바로 아래에 뜨는 팝오버(사용자 확정 — 예전엔 화면 우하단 고정).
  // 아래 공간이 모자라면 칸 위로 뒤집고, 화면 가장자리 16px 안으로 가둔다. 앵커는
  // 버튼 요소가 아니라 targetId로 기억한다 — 수동 확인 저장 뒤 loadWeek()가 표를 다시
  // 그려 버튼이 새로 생겨도 같은 칸을 다시 찾아 붙기 위해서. 640px 이하 모바일은
  // 기존대로 화면 아래 시트(CSS)라 위치를 계산하지 않는다.
  let detailAnchor = null; // selector of the cell the popover belongs to
  const detailSheet = matchMedia('(max-width:640px)');
  function placeDetail() {
    if (detailAnchor == null || detail.hidden) return;
    if (detailSheet.matches) { detail.style.top = detail.style.left = ''; return; }
    // 전체보기는 칸이 아니라 화면 가운데
    if (detail.classList.contains('is-expanded')) {
      detail.style.top = `${Math.max(0, (innerHeight - detail.offsetHeight) / 2)}px`;
      detail.style.left = `${Math.max(0, (innerWidth - detail.offsetWidth) / 2)}px`;
      return;
    }
    const anchor = tbody.querySelector(detailAnchor);
    if (!anchor) return;
    const r = anchor.getBoundingClientRect(), gap = 6, edge = 16;
    const w = detail.offsetWidth, h = detail.offsetHeight;
    let top = r.bottom + gap;
    if (top + h > innerHeight - edge && r.top - gap - h >= edge) top = r.top - gap - h;
    top = Math.max(edge, Math.min(top, innerHeight - edge - h));
    detail.style.top = `${top}px`;
    detail.style.left = `${Math.max(edge, Math.min(r.left, innerWidth - edge - w))}px`;
  }
  addEventListener('scroll', placeDetail, { passive: true, capture: true }); // 표 가로 스크롤 포함
  addEventListener('resize', placeDetail);
  function closeDetail() {
    // a paste that wasn't saved yet is kept for this course/week, so closing by accident doesn't lose it
    if (noteState?.mode === 'edit' && noteState.draft?.raw.trim() && noteState.draft.raw !== (noteState.note?.raw || '')) {
      unsavedDrafts.set(draftKey(noteState), { ...noteState.draft });
    }
    // 아래 "추가" 입력창에 쓰다 만 것도 같은 과목·주차에 남겨 둔다
    if (noteState?.append?.trim()) unsavedAppends.set(draftKey(noteState), noteState.append);
    detailAnchor = null; noteState = null;
    if (!detail.hidden && detail.dataset.open) popOut(detail);
  }
  const unsavedDrafts = new Map();
  const unsavedAppends = new Map();
  // 팝업 밖을 누르면 닫는다(사용자 지시 2026-09-14). 팝업을 연 그 칸은 제외 — 그 칸 클릭은 아래 click에서 열고 닫기(토글).
  // 토스트(되돌리기·표시하기)도 제외. 칸이 표 다시 그리기로 바뀌어도 선택자로 다시 찾는다.
  document.addEventListener('pointerdown', e => {
    if (detail.hidden || !detail.dataset.open || detailAnchor == null) return;
    if (detail.contains(e.target) || e.target.closest('.toast')) return;
    const anchor = tbody.querySelector(detailAnchor);
    if (anchor && anchor.contains(e.target)) return;
    closeDetail();
  });
  const statusAnchor = (targetId, round = '') => `.am-status[data-target-id="${targetId}"][data-round="${CSS.escape(round)}"]`;
  async function openDetail(targetId, round = '') {
    const d = await apiJson(`/targets/${targetId}?round=${encodeURIComponent(round)}`);
    if (!d) return;
    detailAnchor = statusAnchor(targetId, round);
    noteState = null;
    detail.classList.remove('is-note', 'is-expanded');
    detail.innerHTML = renderDetail(d);
    popIn(detail);
    placeDetail(); // 같은 프레임 안이라 우하단에 먼저 그려졌다 튀는 일은 없다
    wireDetailActions(d);
  }

  function renderDetail(d) {
    const kindLabel = d.kind === 'assignment' ? '과제' : '셀프피드백';
    const latest = d.evidence[d.evidence.length - 1];
    // 표와 같은 기준으로 "지각 제출" — 첫 확인메일(evidence[0], 수신 시각 오름차순)과 그 주 과제 내용의 마감을 견준다
    const note = noteFor(d.kind, rowOf(d.courseId, d.weekNo, d.round || '')?.note);
    const asCell = { status: d.status, confirmedAt: d.evidence[0]?.received_at || null };
    const statusLabel = cellLabel(asCell, note);
    const statusKey = cellStatusKey(asCell, note);
    const conflictNote = d.status === 'conflict'
      ? `<p class="am-conflict">'해당 없음'으로 표시했지만 확인메일이 발견됐어요. 어느 쪽이 맞는지 확인해주세요.</p>` : '';
    const evidenceBlock = latest ? `
      <dl class="am-detail-fields">
        <dt>확인 방식</dt><dd>메일 (${esc(latest.gmail_message_id)})</dd>
        <dt>확인메일 수신 시각</dt><dd>${new Date(latest.received_at).toLocaleString('ko-KR')}</dd>
        ${latest.gmail_thread_id ? `<dt>확인메일</dt><dd><a href="https://mail.google.com/mail/u/0/#all/${esc(latest.gmail_thread_id)}" target="_blank" rel="noopener">열기 ↗</a></dd>` : ''}
        ${latest.track ? `<dt>트랙</dt><dd>${esc(latest.track)}</dd>` : ''}
      </dl>
      ${Object.keys(latest.links).length ? `<ul class="am-links">${Object.entries(latest.links)
        .map(([k, v]) => safeHref(v) ? `<li><a href="${esc(v)}" target="_blank" rel="noopener">${esc(k)} ↗</a></li>` : '').join('')}</ul>` : ''}
    ` : (d.manual?.status === 'confirmed_manual' ? `<p class="am-detail-fields">확인 방식: 직접 확인 (${new Date(d.manual.updated_at).toLocaleString('ko-KR')})</p>` : ''); // 근거 없음 안내 문구는 뺐다(사용자 지시)

    return `
      <button type="button" class="am-detail-close" id="am-detail-close" aria-label="닫기">✕</button>
      <h2 class="am-detail-title">${esc(d.courseCode)}_${esc(d.courseName)} · ${d.weekNo}주차${d.round ? ` · ${esc(d.round)}` : ''} · ${kindLabel}</h2>
      <p class="am-detail-status">${statusDot(statusKey)}${statusLabel}</p>
      ${conflictNote}
      ${evidenceBlock}
      <div class="am-detail-actions">
        <button type="button" class="pill" data-action="confirmed_manual">직접 확인으로 표시</button>
        <button type="button" class="pill" data-action="clear">수동 확인 취소</button>
      </div>
    `;
  }

  function wireDetailActions(d) {
    $('#am-detail-close', detail).addEventListener('click', closeDetail);
    detail.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => setManual(d.targetId, btn.dataset.action, false, d.round || ''));
    });
  }

  async function setManual(targetId, action, force = false, round = '') {
    const res = await api(`/targets/${targetId}/manual`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, force, round }),
    });
    if (!res) { toast('저장하지 못했어요', null, 'error'); return; }
    if (res.status === 409) {
      const body = await res.json();
      toast(`이미 확인메일 ${body.evidenceCount}건이 있어요 — 그래도 '해당 없음'으로 표시할까요?`,
        { label: '표시하기', run: () => setManual(targetId, action, true, round) }, 'error');
      return;
    }
    if (!res.ok) { toast('저장하지 못했어요', null, 'error'); return; }
    toast('저장했어요');
    openDetail(targetId, round);
    if (currentWeekNo != null) loadWeek(currentWeekNo);
  }

  // ---- 제출 확인 칸 ↗ 메뉴: 과제 제출폼 / 제출한 메일 ----
  // 메일 주소(Gmail 스레드)는 표에 없어서 누를 때 /targets/:id 상세에서 가장 최근 확인메일을 가져온다
  const linkMenu = $('#am-link-menu');
  let linkMenuAnchor = null;
  function closeLinkMenu(focusBack = false) {
    if (!linkMenuAnchor) return;
    linkMenuAnchor.setAttribute('aria-expanded', 'false');
    if (focusBack) linkMenuAnchor.focus();
    linkMenuAnchor = null;
    courseMenu = null;
    popOut(linkMenu);
  }
  async function openLinkMenu(btn) {
    closeDetail();
    linkMenuAnchor = btn;
    btn.setAttribute('aria-expanded', 'true');
    const formUrl = btn.dataset.formUrl;
    const item = (href, label) => href
      ? `<a class="cm-item" role="menuitem" href="${esc(href)}" target="_blank" rel="noopener">${label}</a>`
      : `<span class="cm-item" aria-disabled="true">${label}</span>`;
    const draw = mail => {
      linkMenu.innerHTML = item(formUrl, '과제 제출폼 ↗') + item(mail, mail === undefined ? '제출한 메일 찾는 중…' : mail ? '제출한 메일 ↗' : '제출한 메일 없음');
      linkMenu.hidden = false;
      const r = btn.getBoundingClientRect(), w = linkMenu.offsetWidth, h = linkMenu.offsetHeight, edge = 16;
      let top = r.bottom + 6;
      if (top + h > innerHeight - edge) top = r.top - 6 - h;
      linkMenu.style.top = `${Math.max(edge, top)}px`;
      linkMenu.style.left = `${Math.max(edge, Math.min(r.left, innerWidth - edge - w))}px`;
    };
    draw(undefined);
    popIn(linkMenu);
    linkMenu.querySelector('a.cm-item')?.focus();
    const d = await apiJson(`/targets/${btn.dataset.linkTarget}?round=${encodeURIComponent(btn.dataset.linkRound || '')}`);
    if (linkMenuAnchor !== btn) return; // closed or another one opened while waiting
    const thread = d?.evidence?.length ? d.evidence[d.evidence.length - 1].gmail_thread_id : null;
    const hadFocus = linkMenu.contains(document.activeElement);
    draw(thread ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(thread)}` : null);
    if (hadFocus) linkMenu.querySelector('a.cm-item')?.focus(); // redraw replaced the focused item
  }
  // ---- 과목 이름 메뉴(사용자 지시 2026-10-01): 수강기간 아님 · 완강 · 휴강(이번 주 스킵) ----
  // 링크 메뉴와 같은 자리·모양. 항목을 고르면 같은 메뉴가 확인 단계로 바뀐다(기본 포커스 "취소").
  //   수강기간 아님 · 완강 = 과목 단위, 모든 주차(서버 /course-states). 맨 아래·회색, 완료 수·TO-DO에서 빠짐. 과목 하나에 하나만.
  //   휴강 = 과목 × 그 주차. 세션이 없었다는 기록 — 그 주 셀프피드백만 '해당 없음'(기존 /targets/:id/manual), 과제는 그대로.
  //         셀프피드백이 이미 메일로 확인됐으면 고를 수 없다(해당 없음과 충돌).
  const COURSE_STATE_LABEL = { inactive: '수강기간 아님', completed: '완강' };
  const OFF_STATES = ['inactive', 'completed']; // 맨 아래 쌓는 순서
  const isRest = row => row.selfFeedback.status === 'not_applicable'; // 휴강(그 주 셀프피드백 해당 없음)
  let courseMenu = null; // { courseId, week, round, step: 'menu' | 'inactive' | 'completed' | 'rest' }

  function placeMenu(btn) {
    linkMenu.hidden = false;
    const r = btn.getBoundingClientRect(), w = linkMenu.offsetWidth, h = linkMenu.offsetHeight, edge = 16;
    let top = r.bottom + 6;
    if (top + h > innerHeight - edge) top = r.top - 6 - h;
    linkMenu.style.top = `${Math.max(edge, top)}px`;
    linkMenu.style.left = `${Math.max(edge, Math.min(r.left, innerWidth - edge - w))}px`;
  }
  function drawCourseMenu() {
    const row = rowOf(courseMenu.courseId, courseMenu.week, courseMenu.round);
    if (!row) { closeLinkMenu(); return; }
    const state = row.courseState || null, rest = isRest(row);
    const weekWord = row.week === currentWeekNo ? '이번 주' : `${row.week}주차`;
    const item = (act, label) => `<button type="button" class="cm-item" role="menuitem" data-course-act="${act}">${label}</button>`;
    if (courseMenu.step === 'menu') {
      const restItem = state ? '' // 수강기간 아님·완강 과목은 주차별 휴강이 의미 없다
        : row.selfFeedback.status === 'confirmed_mail' && !rest
        ? `<span class="cm-item" aria-disabled="true" title="이 주 셀프피드백은 이미 제출이 확인됐어요">휴강(${weekWord} 스킵)</span>`
        : item('rest', rest ? '휴강 해제' : `휴강(${weekWord} 스킵)`);
      // 회차 추가(사용자 지시 2026-11-23): 한 주에 같은 과목 회차가 여럿일 때 — 이 주차에 새 회차 줄을 만들고 공지를 붙여넣는다
      const addRound = state ? '' : item('add-round', `${weekWord}에 회차 추가`);
      linkMenu.innerHTML = addRound + item('inactive', state === 'inactive' ? '수강기간 아님 해제' : '수강기간 아님')
        + item('completed', state === 'completed' ? '완강 해제' : '완강') + restItem;
      linkMenu.querySelector('button.cm-item')?.focus({ preventScroll: true });
      return;
    }
    const s = courseMenu.step;
    const name = `${esc(row.code)}`;
    let q, yes;
    if (s === 'rest') {
      q = rest ? `${name} ${row.week}주차 휴강을 해제할까요?` : `${name} ${row.week}주차를 휴강으로 둘까요?<br>셀프피드백만 '해당 없음'이 되고 과제는 그대로예요`;
      yes = rest ? '해제' : '휴강';
    } else if (state === s) {
      q = `${name} ${COURSE_STATE_LABEL[s]}을 해제할까요?`; yes = '해제';
    } else {
      q = `${name} 과목을 ${COURSE_STATE_LABEL[s]}으로 둘까요?<br>모든 주차에서 맨 아래·회색이 되고 할 일에서 빠져요`; yes = COURSE_STATE_LABEL[s];
    }
    linkMenu.innerHTML = `<p class="cm-confirm">${q}</p>`
      + `<button type="button" class="cm-item cm-danger" role="menuitem" data-course-act="confirm">${yes}</button>`
      + '<button type="button" class="cm-item" role="menuitem" data-course-act="cancel">취소</button>';
    linkMenu.querySelector('[data-course-act="cancel"]').focus({ preventScroll: true });
  }
  function openCourseMenu(btn) {
    const courseId = btn.dataset.amCourse, week = Number(btn.dataset.courseWk), round = btn.dataset.courseRound || '';
    const row = rowOf(courseId, week, round);
    if (!row) return;
    if (row.assignment.targetId == null) { toast('로그인하면 과목 상태를 바꿀 수 있어요'); return; } // 읽기 전용 표
    closeDetail();
    linkMenuAnchor = btn;
    btn.setAttribute('aria-expanded', 'true');
    courseMenu = { courseId, week, round, step: 'menu' };
    drawCourseMenu();
    placeMenu(btn);
    popIn(linkMenu);
    linkMenu.querySelector('button.cm-item')?.focus({ preventScroll: true }); // 보이게 된 뒤에야 포커스가 들어간다
  }

  const reloadTable = () => { if (currentWeekNo != null) loadWeek(currentWeekNo); };
  async function putCourseState(courseId, state) {
    const res = await api(`/course-states/${courseId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state }) });
    return !!res?.ok;
  }
  async function postManual(targetId, action, round = '') {
    const res = await api(`/targets/${targetId}/manual`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, round }) });
    return !!res?.ok;
  }
  // 확인 단계의 "예" — 되돌리기는 원래 상태로
  async function applyCourseAct({ courseId, week, round = '', step }) {
    const row = rowOf(courseId, week, round);
    if (!row) return;
    let ok, msg, undo;
    if (step === 'rest') {
      const cell = row.selfFeedback, on = !isRest(row);
      const before = cell.status === 'confirmed_manual' ? 'confirmed_manual' : 'clear';
      ok = await postManual(cell.targetId, on ? 'not_applicable' : 'clear', round);
      msg = on ? `${row.code} ${row.week}주차를 휴강으로 뒀어요` : `${row.code} ${row.week}주차 휴강을 해제했어요`;
      undo = () => postManual(cell.targetId, on ? before : 'not_applicable', round);
    } else {
      const before = row.courseState || null, next = before === step ? null : step;
      ok = await putCourseState(courseId, next);
      msg = next ? `${row.code} 과목을 ${COURSE_STATE_LABEL[next]}으로 뒀어요` : `${row.code} ${COURSE_STATE_LABEL[before]}을 해제했어요`;
      undo = () => putCourseState(courseId, before);
    }
    reloadTable();
    if (!ok) { toast('저장하지 못했어요', null, 'error'); return; }
    toast(msg, {
      label: '되돌리기',
      run: async () => {
        const back = await undo();
        reloadTable();
        if (!back) toast('되돌리지 못했어요', null, 'error');
      },
    });
  }

  linkMenu.addEventListener('click', e => {
    const act = e.target.closest('[data-course-act]')?.dataset.courseAct;
    if (act && courseMenu) {
      if (act === 'cancel') { closeLinkMenu(true); return; }
      if (act === 'confirm') { const target = courseMenu; closeLinkMenu(true); applyCourseAct(target); return; }
      if (act === 'add-round') { const { courseId, week, round } = courseMenu; closeLinkMenu(); openNote(courseId, week, { round, isNew: true }); return; }
      courseMenu.step = act; // 메뉴는 열어 둔 채 확인 단계로
      drawCourseMenu();
      if (linkMenuAnchor) placeMenu(linkMenuAnchor);
      return;
    }
    if (e.target.closest('a.cm-item')) closeLinkMenu();
  });
  linkMenu.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeLinkMenu(true); return; }
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const items = [...linkMenu.querySelectorAll('a.cm-item, button.cm-item')], i = items.indexOf(document.activeElement);
    items[(i + step + items.length) % items.length]?.focus();
  });
  document.addEventListener('pointerdown', e => {
    if (linkMenuAnchor && !linkMenu.contains(e.target) && !linkMenuAnchor.contains(e.target)) closeLinkMenu();
  });
  addEventListener('scroll', () => closeLinkMenu(), { passive: true, capture: true });
  addEventListener('resize', () => closeLinkMenu());

  tbody.addEventListener('click', e => {
    const favBtn = e.target.closest('[data-am-fav-key]');
    if (favBtn) { toggleAmFavorite(favBtn.dataset.amFavKey); return; }
    const linkBtn = e.target.closest('[data-link-target]');
    if (linkBtn) { linkMenuAnchor === linkBtn ? closeLinkMenu() : (closeLinkMenu(), openLinkMenu(linkBtn)); return; }
    const courseBtn = e.target.closest('[data-am-course]');
    if (courseBtn) { linkMenuAnchor === courseBtn ? closeLinkMenu() : (closeLinkMenu(), openCourseMenu(courseBtn)); return; }
    const btn = e.target.closest('button.am-status'); // read-only labels (span.is-static) have no detail
    if (e.detail > 1 && e.target.closest('[data-note-course]')) return; // 더블클릭의 두 번째 클릭은 닫지 않는다 — 아래 dblclick이 전체보기로 연다
    if (btn) {
      const sel = statusAnchor(btn.dataset.targetId, btn.dataset.round || '');
      if (detailAnchor === sel && !detail.hidden && detail.dataset.open) { closeDetail(); return; } // same cell again = close
      openDetail(Number(btn.dataset.targetId), btn.dataset.round || '');
      return;
    }
    if (e.target.closest('[data-note-login]')) { toast('로그인하면 과제 공지를 붙여넣고 마감을 볼 수 있어요'); return; }
    const noteBtn = e.target.closest('[data-note-course]');
    if (noteBtn) {
      const round = noteBtn.dataset.noteRound || '';
      if (detailAnchor === noteAnchor(noteBtn.dataset.noteCourse, Number(noteBtn.dataset.noteWk), round) && !noteState?.isNew && !detail.hidden && detail.dataset.open) { closeDetail(); return; }
      openNote(noteBtn.dataset.noteCourse, Number(noteBtn.dataset.noteWk), { round });
    }
  });
  // "자세히보기"를 더블클릭하면 바로 크게(전체보기) 연다(사용자 지시 2026-09-19)
  tbody.addEventListener('dblclick', e => {
    const noteBtn = e.target.closest('[data-note-course]');
    if (!noteBtn) return;
    const courseId = noteBtn.dataset.noteCourse, week = Number(noteBtn.dataset.noteWk), round = noteBtn.dataset.noteRound || '';
    if (noteState?.courseId !== courseId || noteState.week !== week || noteState.round !== round || noteState.isNew || detail.hidden || !detail.dataset.open) openNote(courseId, week, { round });
    setNoteExpanded(true);
  });

  // ---- 과제 내용 팝오버: 보기 / 붙여넣기·수정 ----
  // noteState = { courseId, week, round (그 줄의 회차, '' = 회차 없음), isNew (같은 주 새 회차 줄), baseRound (팝업을 붙인 줄),
  //               mode: 'view'|'edit', note (saved one for this row or null), menu: false|'menu'|'confirm',
  //               draft: { raw, dueAt, lateDueAt, dueTouched, round, roundTouched }, conflict: null|{ note, roundTaken } }
  let noteState = null;
  // 과제 내용은 그 줄(과목 × 주차 × 회차) 것 — 다른 주차 즐겨찾기 줄이면 그 주차 공지를 열고 저장한다.
  // 공지는 언제나 그 줄의 주차에 저장한다 — 공지 본문의 "N주차"로 다른 주차에 옮기지 않는다(사용자 지시 2026-11-23:
  // 회차 때문에 1·2주차에 저장되던 문제. 예전엔 붙여넣은 공지가 말하는 주차가 저장 기본값이었다)
  const rowOf = (courseId, week, round = '') => tableRows.find(r => r.courseId === courseId && r.week === week && (r.round || '') === round);
  const noteAnchor = (courseId, week, round = '') => `[data-note-course="${courseId}"][data-note-wk="${week}"][data-note-round="${CSS.escape(round)}"]`;
  const draftKey = st => `${st.courseId}:${st.week}:${st.isNew ? '+' : st.round}`;
  const anchorRow = st => rowOf(st.courseId, st.week, st.isNew ? st.baseRound : st.round);
  const WEEK_NOW = () => noteState.week;
  // 새 공지의 회차 기본값: 공지 글의 "Fonts 3회차"·"12주차"가 그 과목 회차 목록에 있으면 그것, 아니면 아직 공지가 없는 다음 회차
  function suggestRound(courseId, week, raw) {
    const list = roundLists[courseId] || [];
    if (!list.length) return '';
    const said = [...String(raw).matchAll(/([A-Za-z]+\s*)?(\d{1,2})\s*(회차|주차)/g)].map(m => roundKeyOf(m[0])).filter(Boolean);
    const num = k => k.split('|')[1];
    const hit = said.map(k => list.find(l => roundKeyOf(l) === k) || list.find(l => num(roundKeyOf(l) || '|') === num(k))).find(Boolean);
    if (hit) return hit;
    const taken = new Set([...(roundsUsed[courseId] || []), ...tableRows.filter(r => r.courseId === courseId && r.week === week).map(r => r.round)]);
    return list.find(l => !taken.has(l)) || '';
  }
  // 마감이 그 주 기간 밖(시작 전, 또는 끝 + 3일 뒤)이면 알려만 준다 — 저장은 그대로 이 주차
  function dueOutsideWeek(dueAt, week) {
    const r = weekDates(week);
    if (!dueAt || !r) return false;
    const day = dueAt.slice(0, 10);
    return day < r.start || day > addDaysIso(r.end, 3);
  }

  function openNote(courseId, week = currentWeekNo, { mode, round = '', isNew = false } = {}) {
    const row = rowOf(courseId, week, round);
    if (!row) return;
    const note = isNew ? null : row.note;
    noteState = { courseId, week, round: isNew ? '' : round, isNew, baseRound: round, note, mode: isNew ? 'edit' : mode || (note ? 'view' : 'edit'), menu: false, conflict: null, draft: null };
    const appendKey = draftKey(noteState);
    if (unsavedAppends.has(appendKey)) { noteState.append = unsavedAppends.get(appendKey); unsavedAppends.delete(appendKey); }
    if (noteState.mode === 'edit') startDraft();
    detailAnchor = noteAnchor(courseId, week, round);
    detail.classList.add('is-note');
    detail.classList.remove('is-expanded'); // 새로 열 때는 늘 칸 옆 작은 팝업부터
    renderNote();
    popIn(detail);
    placeDetail();
    detail.querySelector('.am-note-input')?.focus();
  }
  function startDraft() {
    const n = noteState.note;
    noteState.mode = 'edit';
    noteState.menu = false;
    // 저장은 늘 이 줄의 주차. 회차는 이 줄의 회차(있으면), 없으면 붙여넣는 글을 보고 고른다(직접 바꾸면 그대로)
    const fixed = !noteState.isNew && (!!noteState.round || !!n);
    noteState.draft = { raw: n?.raw || '', dueAt: n?.dueAt || null, lateDueAt: n?.lateDueAt || null, dueTouched: !!n?.dueManual, round: noteState.round, roundTouched: fixed };
    const kept = unsavedDrafts.get(draftKey(noteState));
    if (kept) { noteState.draft = kept; unsavedDrafts.delete(draftKey(noteState)); } // what was pasted before closing
  }
  // 전체보기: 칸 옆 작은 팝업 ↔ 화면 가운데 큰 창(사용자 지시 2026-09-19 — 팝업이 답답하다).
  // 여는 길은 셋 — "자세히보기" 더블클릭, 공지 본문 더블클릭, ⋯ 메뉴의 "전체보기". 닫으면 다음엔 다시 작게 열린다.
  function setNoteExpanded(on) {
    if (!noteState) return;
    const input = detail.querySelector('.am-note-input'), caret = input && [input.selectionStart, input.selectionEnd];
    detail.classList.toggle('is-expanded', on);
    noteState.menu = false;
    renderNote();
    popIn(detail); // 같은 흐림→선명 등장으로 새 자리에 다시 나타난다
    placeDetail();
    const nextInput = detail.querySelector('.am-note-input');
    if (nextInput) { nextInput.focus(); if (caret) nextInput.setSelectionRange(...caret); }
    else detail.querySelector('[data-note-act="menu"]')?.focus({ preventScroll: true });
  }

  function noteHeader(row, withMenu) {
    return `<div class="am-note-head">
        <h2 class="am-detail-title">${esc(row.code)}_${esc(row.name)} · ${WEEK_NOW()}주차${noteState.round ? ` · ${esc(noteState.round)}` : noteState.isNew ? ' · 새 회차' : ''} · 과제 내용</h2>
        ${withMenu ? `<span class="am-note-more">
          <button type="button" class="pill pill-icon" data-note-act="menu" aria-haspopup="menu" aria-expanded="${!!noteState.menu}" aria-label="과제 내용 메뉴">⋯</button>
          ${noteState.menu === 'menu' ? `<div class="am-note-menu" role="menu">
              <button type="button" class="cm-item" role="menuitem" data-note-act="expand">${detail.classList.contains('is-expanded') ? '작게 보기' : '전체보기'}</button>
              <div class="cm-sep" role="separator"></div>
              <button type="button" class="cm-item" role="menuitem" data-note-act="edit">수정하기</button>
              <button type="button" class="cm-item" role="menuitem" data-note-act="delete">삭제하기</button></div>`
            : noteState.menu === 'confirm' ? `<div class="am-note-menu" role="menu">
              <p class="cm-confirm">과제 내용을 삭제할까요?</p>
              <button type="button" class="cm-item cm-danger" role="menuitem" data-note-act="confirm-delete">삭제</button>
              <button type="button" class="cm-item" role="menuitem" data-note-act="cancel-menu">취소</button></div>` : ''}
        </span>` : ''}
      </div>`;
  }

  function renderNote() {
    const st = noteState, row = anchorRow(st);
    if (!row) { closeDetail(); return; }
    const close = '<button type="button" class="am-detail-close" data-note-act="close" aria-label="닫기">✕</button>';
    if (st.mode === 'view' && st.note) {
      const n = st.note;
      const dues = [
        n.dueAt ? `<span class="fi-due">마감 ${notice.dueLabelWithDow(n.dueAt)}${n.dueManual ? ' · 직접 입력' : ''}</span>` : '',
        n.lateDueAt ? `<span class="fi-due">지각 마감 ${notice.dueLabelWithDow(n.lateDueAt)}</span>` : '',
      ].join('');
      // 맨 아래 입력창: 과제 내용이 나중에 더해질 때 기존 공지 아래에 이어 붙인다(사용자 지시 2026-09-19)
      const add = st.append ?? '';
      detail.innerHTML = `${close}${noteHeader(row, true)}
        ${dues ? `<p class="am-note-dues">${dues}</p>` : ''}
        <div class="am-note-body">${notice.renderNotice(n.raw)}</div>
        <div class="am-note-append">
          <textarea class="am-note-append-input" rows="2" aria-label="과제 내용 추가 — Ctrl+Enter로 추가" placeholder="추가된 과제 내용을 붙여넣어 주세요">${esc(add)}</textarea>
          <button type="button" class="btn-primary" data-note-act="append"${add.trim() ? '' : ' disabled'}>추가</button>
        </div>`;
      return;
    }
    detail.innerHTML = `${close}${noteHeader(row, false)}
      <textarea class="am-note-input" aria-label="과제 공지 붙여넣기" placeholder="디스코드 과제 공지를 그대로 붙여넣어 주세요">${esc(st.draft.raw)}</textarea>
      <div class="am-note-live">${noteLiveHTML(row)}</div>`;
  }
  // everything under the textarea — redrawn on each keystroke without touching the textarea (한글 조합·커서 유지)
  function noteLiveHTML(row) {
    const st = noteState, d = st.draft;
    const parsed = notice.parseNotice(d.raw);
    if (!d.dueTouched) { d.dueAt = parsed.dueAt; d.lateDueAt = parsed.lateDueAt; }
    if (!d.roundTouched) d.round = suggestRound(st.courseId, st.week, d.raw);
    const found = [
      d.dueAt ? `마감 <b>${notice.dueLabelWithDow(d.dueAt)}</b>` : '마감을 찾지 못했어요',
      d.lateDueAt ? `지각 마감 <b>${notice.dueLabelWithDow(d.lateDueAt)}</b>` : '',
      parsed.course || '',
    ].filter(Boolean).join(' · ');
    const range = weekDates(WEEK_NOW());
    const weekChoice = d.raw.trim() && dueOutsideWeek(d.dueAt, WEEK_NOW())
      ? `<p class="am-note-warn">마감이 이 주 기간(${dayLabel(range.start)} – ${dayLabel(range.end)}) 밖이에요. 저장은 ${WEEK_NOW()}주차에 해요.</p>` : '';
    const roundOpts = [...new Set([...(roundLists[st.courseId] || []), ...(roundsUsed[st.courseId] || [])])];
    const courseWarn = d.raw.trim() && parsed.course && parsed.course !== row.code
      ? `<p class="am-note-warn">${esc(parsed.course)} 과목 공지 같아요 — 지금 칸은 ${esc(row.code)}예요.</p>` : '';
    const conflict = st.conflict?.roundTaken
      ? `<p class="am-note-warn">이 주에 이미 ${esc(d.round.trim() || '회차 없는')} 공지가 있어요. 회차를 바꿔 주세요.</p>
         <div class="am-detail-actions" style="margin-bottom:10px"><button type="button" class="pill" data-note-act="theirs">저장된 내용 보기</button></div>`
      : st.conflict
      ? `<p class="am-note-warn">${st.conflict.note ? '다른 기기에서 먼저 수정된 과제 내용이에요.' : '다른 기기에서 삭제된 과제 내용이에요.'}</p>
         <div class="am-detail-actions" style="margin-bottom:10px">
           <button type="button" class="pill" data-note-act="force">${st.conflict.note ? '이 내용으로 덮어쓰기' : '다시 저장'}</button>
           ${st.conflict.note ? '<button type="button" class="pill" data-note-act="theirs">저장된 내용 보기</button>' : ''}
         </div>` : '';
    return `
      <p class="am-note-preview" aria-live="polite">${d.raw.trim() ? found : '붙여넣으면 마감을 찾아 보여줘요'}</p>
      ${weekChoice}${courseWarn}
      <div class="am-note-fields">
        <label for="am-note-round">회차</label><input type="text" id="am-note-round" list="am-note-rounds" value="${esc(d.round || '')}" placeholder="회차 없음" autocomplete="off">
        <datalist id="am-note-rounds">${roundOpts.map(o => `<option value="${esc(o)}"></option>`).join('')}</datalist>
        <label for="am-note-due">마감</label><input type="datetime-local" id="am-note-due" value="${esc(d.dueAt || '')}">
        <label for="am-note-late">지각 마감</label><input type="datetime-local" id="am-note-late" value="${esc(d.lateDueAt || '')}">
      </div>
      ${conflict}
      <div class="am-detail-actions">
        <button type="button" class="btn-primary" data-note-act="save"${d.raw.trim() ? '' : ' disabled'}>저장</button>
        <button type="button" class="pill" data-note-act="${st.note ? 'cancel-edit' : 'close'}">취소</button>
      </div>`;
  }
  const refreshNoteLive = () => {
    const live = detail.querySelector('.am-note-live'), row = anchorRow(noteState);
    if (live && row) live.innerHTML = noteLiveHTML(row);
    placeDetail();
  };
  // keep typing smooth: re-render only the preview parts, not the textarea
  detail.addEventListener('input', e => {
    if (noteState && e.target.classList.contains('am-note-append-input')) {
      noteState.append = e.target.value;
      detail.querySelector('[data-note-act="append"]').disabled = !e.target.value.trim();
      return;
    }
    if (!noteState || noteState.mode !== 'edit') return;
    const d = noteState.draft;
    if (e.target.classList.contains('am-note-input')) {
      d.raw = e.target.value;
      refreshNoteLive();
    } else if (e.target.id === 'am-note-round') {
      d.round = e.target.value; d.roundTouched = true; // 직접 고르거나 적은 회차(목록에 없으면 저장할 때 목록에 더한다)
    } else if (e.target.id === 'am-note-due' || e.target.id === 'am-note-late') {
      d.dueTouched = true; // a deadline set by hand wins over what the text says
      d[e.target.id === 'am-note-due' ? 'dueAt' : 'lateDueAt'] = e.target.value || null;
    }
  });
  detail.addEventListener('click', e => {
    if (!noteState) return;
    const act = e.target.closest('[data-note-act]')?.dataset.noteAct;
    if (!act) return;
    const st = noteState;
    if (act === 'close') closeDetail();
    else if (act === 'menu') { st.menu = st.menu ? false : 'menu'; renderNote(); detail.querySelector('.am-note-menu .cm-item')?.focus(); }
    else if (act === 'cancel-menu') { st.menu = false; renderNote(); }
    else if (act === 'expand') setNoteExpanded(!detail.classList.contains('is-expanded'));
    else if (act === 'edit') { startDraft(); renderNote(); placeDetail(); detail.querySelector('.am-note-input')?.focus(); }
    else if (act === 'cancel-edit') { st.mode = 'view'; st.conflict = null; renderNote(); placeDetail(); }
    else if (act === 'delete') { st.menu = 'confirm'; renderNote(); detail.querySelector('[data-note-act="cancel-menu"]')?.focus(); }
    else if (act === 'confirm-delete') deleteNote();
    else if (act === 'append') appendNote();
    else if (act === 'save') saveNote(false);
    else if (act === 'force') saveNote(true);
    else if (act === 'theirs') showSavedNote(st.conflict?.roundTaken ? st.draft.round.trim() : st.round);
  });

  // 보기 상태에서 팝업 어디든(제목·마감·본문) 더블클릭하면 전체보기 ↔ 작게 보기(사용자 지시 2026-09-19).
  // 링크·버튼·입력창 위에서는 제외 — 글자를 고르거나 누르는 동작을 가로채지 않는다
  detail.addEventListener('dblclick', e => {
    if (noteState?.mode !== 'view' || e.target.closest('a, button, textarea, input, .am-note-menu')) return;
    getSelection()?.removeAllRanges(); // 더블클릭이 고른 단어 선택은 지운다
    setNoteExpanded(!detail.classList.contains('is-expanded'));
  });
  detail.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.classList.contains('am-note-append-input')) { e.preventDefault(); appendNote(); }
  });

  // 기존 공지 아래에 구분선(---) 줄을 두고 이어 붙여 같은 공지로 저장한다. 마감은 그대로 두되,
  // 직접 입력한 마감이 아니고 아직 비어 있으면 합친 글에서 찾은 마감을 채운다
  let appending = false;
  const notePut = (st, body) => api(`/notes/${st.courseId}/${st.week}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  async function appendNote() {
    const st = noteState, n = st?.note, text = st?.append?.trim();
    if (!n || !text || appending) return;
    appending = true;
    const raw = `${n.raw.trimEnd()}\n\n---\n\n${text}`; // --- 줄은 보기에서 구분선으로 그려진다
    const parsed = n.dueManual ? {} : notice.parseNotice(raw);
    const res = await notePut(st, { raw, dueAt: n.dueAt || parsed.dueAt || null, lateDueAt: n.lateDueAt || parsed.lateDueAt || null, dueManual: !!n.dueManual, baseVersion: n.version, round: st.round });
    appending = false;
    const body = res && await res.json().catch(() => ({}));
    if (res?.status === 409) {
      // 다른 기기에서 먼저 바뀌었다 — 최신 공지를 불러와 보여주고, 쓴 내용은 입력창에 남겨 다시 누르게 한다
      await loadWeek(currentWeekNo);
      if (noteState === st) { st.note = rowOf(st.courseId, st.week, st.round)?.note || null; st.note ? renderNote() : closeDetail(); placeDetail(); }
      toast('다른 기기에서 먼저 수정됐어요 — 최신 내용을 확인하고 다시 추가해 주세요', null, 'error');
      return;
    }
    if (!res?.ok) { toast(body?.error === 'note_too_large' ? '공지가 너무 길어요(최대 20,000자)' : '추가하지 못했어요', null, 'error'); return; }
    st.append = '';
    await loadWeek(currentWeekNo);
    if (noteState === st) {
      st.note = rowOf(st.courseId, st.week, st.round)?.note || body.note;
      renderNote(); placeDetail();
      detail.querySelector('.am-note-body')?.lastElementChild?.scrollIntoView({ block: 'nearest' }); // 방금 붙인 곳이 보이게
      detail.querySelector('.am-note-append-input')?.focus({ preventScroll: true });
    }
    const added = body.note || st.note; // 서버가 돌려준 새 버전 — 되돌릴 때 이 버전 위에 덮는다
    toast('과제 내용을 추가했어요', {
      label: '되돌리기',
      run: async () => {
        const r = await notePut(st, { raw: n.raw, dueAt: n.dueAt, lateDueAt: n.lateDueAt, dueManual: n.dueManual, baseVersion: added?.version ?? null, round: st.round });
        if (!r?.ok) { toast('되돌리지 못했어요', null, 'error'); return; }
        await loadWeek(currentWeekNo); // 그 줄은 이번 주 줄이거나 위의 즐겨찾기 줄
        if (noteState?.courseId === st.courseId && noteState.round === st.round && noteState.mode === 'view') { noteState.note = rowOf(st.courseId, st.week, st.round)?.note || noteState.note; renderNote(); placeDetail(); }
      },
    });
  }

  // 목록에 없는 회차를 적어 저장하면 그 과목 회차 목록 끝에 더한다("+ 회차 추가" — 회차가 남은 목록보다 늘어날 때)
  async function rememberRound(courseId, round) {
    const list = roundLists[courseId] || [];
    if (!round || list.some(l => l === round || roundKeyOf(l) === roundKeyOf(round))) return;
    const res = await api(`/rounds/${courseId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rounds: [...list, round] }) });
    if (res?.ok) roundLists = { ...roundLists, [courseId]: [...list, round] };
  }

  async function saveNote(force) {
    const st = noteState, d = st.draft;
    if (!d.raw.trim()) return;
    const round = (d.round || '').replace(/\s+/g, ' ').trim();
    const base = st.conflict?.note?.version ?? (st.note ? st.note.version : null);
    // 저장은 늘 이 줄의 주차(st.week). 고치는 줄의 회차(fromRound)와 다르면 회차 이름 바꾸기 — 그 줄의 확인메일도 따라간다
    const res = await notePut(st, { raw: d.raw, dueAt: d.dueAt, lateDueAt: d.lateDueAt, dueManual: d.dueTouched, baseVersion: base, force: force || undefined, round, ...(st.isNew ? {} : { fromRound: st.round }) });
    if (!res) { toast('저장하지 못했어요', null, 'error'); return; }
    const body = await res.json().catch(() => ({}));
    if (res.status === 409) { st.conflict = { note: body.note, roundTaken: !!body.roundTaken }; refreshNoteLive(); return; }
    if (!res.ok) { toast(body.error === 'note_too_large' ? '공지가 너무 길어요(최대 20,000자)' : body.error === 'bad_round' ? '회차 이름은 40자까지예요' : '저장하지 못했어요', null, 'error'); return; }
    await rememberRound(st.courseId, round);
    toast(round ? `${st.week}주차 ${round} 과제 내용을 저장했어요` : '과제 내용을 저장했어요');
    st.mode = 'view'; // saved — nothing to keep as an unsaved paste
    st.round = round; st.isNew = false; st.baseRound = round;
    await loadWeek(currentWeekNo);
    if (noteState !== st) return;
    if (!rowOf(st.courseId, st.week, round)) { closeDetail(); return; } // 다른 주차 즐겨찾기 줄의 회차를 바꿔 줄이 사라진 경우
    detailAnchor = noteAnchor(st.courseId, st.week, round);
    st.note = rowOf(st.courseId, st.week, round)?.note || body.note; st.conflict = null; renderNote(); placeDetail();
  }
  async function showSavedNote(round) {
    const { courseId, week } = noteState;
    closeDetail();
    await loadWeek(currentWeekNo);
    openNote(courseId, week, { mode: 'view', round });
  }
  async function deleteNote() {
    const st = noteState, saved = st.note;
    const res = await api(`/notes/${st.courseId}/${st.week}?baseVersion=${saved.version}&round=${encodeURIComponent(st.round)}`, { method: 'DELETE' });
    const body = res && await res.json().catch(() => ({}));
    if (!res || (!res.ok && res.status !== 409)) { toast('삭제하지 못했어요', null, 'error'); return; }
    if (res.status === 409) { toast('다른 기기에서 먼저 수정돼서 삭제하지 않았어요', null, 'error'); closeDetail(); loadWeek(currentWeekNo); return; }
    closeDetail();
    await loadWeek(currentWeekNo);
    toast('과제 내용을 삭제했어요', {
      label: '되돌리기',
      run: async () => {
        const r = await notePut(st, { raw: saved.raw, dueAt: saved.dueAt, lateDueAt: saved.lateDueAt, dueManual: saved.dueManual, baseVersion: null, round: st.round });
        if (!r?.ok) { toast('되돌리지 못했어요', null, 'error'); return; }
        loadWeek(currentWeekNo);
      },
    });
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && noteState && !detail.hidden) { if (noteState.menu) { noteState.menu = false; renderNote(); } else closeDetail(); } });

  // "?gmail=connected" etc. — where the Gmail consent flow returns (worker/src/index.js gmailCallback)
  (() => {
    const params = new URLSearchParams(location.search);
    const result = params.get('gmail');
    if (!result) return;
    params.delete('gmail');
    const qs = params.toString();
    history.replaceState(history.state, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
    pendingConnectResult = CONNECT_RESULT[result] ? result : 'error';
  })();

  let initRun = 0;
  async function init() {
    const run = ++initRun; // a sign-in/out during a slow load restarts it; the stale one stops
    closeDetail();
    if (!auth.session) { await initSnapshot(); return; }
    snapshot = null;
    const cw = await loadWeeksList();
    if (run !== initRun) return;
    if (cw == null) {
      if (auth.session) await initSnapshot({ unreachable: true }); // API down → the status file, if there is one
      return;
    }
    const conn = await loadConnection();
    if (run !== initRun) return;
    await loadWeek(currentWeekNo ?? startWeek(cw));
    if (pendingConnectResult) {
      const [msg, kind] = CONNECT_RESULT[pendingConnectResult];
      pendingConnectResult = null;
      toast(msg, null, kind);
      if (!kind && conn?.connected) refreshStatus(); // just connected → read the receipts right away
    }
  }
  const isVisible = () => window.PhiBrain.getCurrentView() === 'assignment';
  // future.js owns view switching and clears the hash for every non-'future'
  // view (see show()), so a hash check here would always see it empty by the
  // time this script runs — it dispatches this event instead.
  document.addEventListener('phibrain:view', e => { if (e.detail.name === 'assignment') init(); });
  auth.onChange(() => { snapshot = null; currentWeekNo = null; if (isVisible()) init(); });
  if (isVisible()) init();
})();
