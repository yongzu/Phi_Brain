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
  let pendingConnectResult = null;

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
    loadWeek(currentWeekNo ?? snapshotCurrentWeek(snap));
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

  // 표의 주차 = 제출폼에서 고른 "N주차"(0~16) 그대로 — 과목마다 같은 날짜에 다른 주차를 내므로
  // 날짜 범위는 표시하지 않는다(2026-09-14 사용자 결정, server/db.js 참고)

  function renderWeekLabel(week) {
    weekLabel.textContent = `${week.week_no}주차`;
    weekPrev.disabled = week.week_no <= weeks[0]?.week_no;
    weekNext.disabled = week.week_no >= weeks[weeks.length - 1]?.week_no;
  }

  function statusDot(status) {
    return `<span class="am-dot am-dot-${status}" aria-hidden="true"></span>`;
  }

  // 제출이 확인된 칸(메일 확인·직접 확인)은 검정 글씨(사용자 지시 2026-09-14) — 미확인·해당 없음은 회색 그대로
  const confirmedClass = status => (status === 'confirmed_mail' || status === 'confirmed_manual' ? ' is-confirmed' : '');
  // 확인메일이 마감(과제 내용에 적힌 마감) 뒤에 왔으면 "제출 확인" 대신 "지각 제출"(사용자 지시 2026-09-16).
  // 마감을 붙여넣지 않은 과목은 견줄 기준이 없어 예전처럼 "제출 확인" 그대로.
  const isLate = (cell, note) => cell.status === 'confirmed_mail' && !!cell.confirmedAt && !!note?.dueAt
    && Date.parse(cell.confirmedAt) > kstMs(note.dueAt);
  const cellLabel = (cell, note) => (isLate(cell, note) ? '지각 제출' : STATUS_LABEL[cell.status] || cell.status);
  function renderCell(courseCode, kindLabel, cell, note) {
    // 메일로 제출이 확인된 칸(로그인 상태)은 ↗가 메뉴 — 과제 제출폼 / 제출한 메일(사용자 지시 2026-09-14). 그 밖은 제출폼 바로 열기
    const mailMenu = cell.status === 'confirmed_mail' && cell.targetId != null;
    const shortcut = mailMenu
      ? `<button type="button" class="am-shortcut" data-link-target="${cell.targetId}" data-form-url="${safeHref(cell.url) ? esc(cell.url) : ''}" aria-haspopup="menu" aria-expanded="false" title="${esc(kindLabel)} 링크" aria-label="${esc(kindLabel)} 제출폼 또는 제출한 메일 열기">↗</button>`
      : safeHref(cell.url)
      ? `<a class="am-shortcut" href="${esc(cell.url)}" target="_blank" rel="noopener" title="${esc(kindLabel)} 제출폼 열기" aria-label="${esc(kindLabel)} 제출폼 열기">↗</a>`
      : '';
    // read-only mode has no detail panel (no mail details are published) — a plain label, not a button
    const status = `${statusDot(cell.status)}<span>${cellLabel(cell, note)}</span>`;
    return `<td><span class="am-cell">
      ${cell.targetId == null
        ? `<span class="am-status is-static${confirmedClass(cell.status)}">${status}</span>`
        : `<button type="button" class="am-status${confirmedClass(cell.status)}" data-target-id="${cell.targetId}">${status}</button>`}
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
    return `<td><span class="am-note-cell">
      <button type="button" class="am-note-btn${row.note ? ' is-set' : ''}" data-note-course="${esc(row.courseId)}" aria-label="${esc(label)}">자세히보기</button>
      ${dueBadge(row.note, row.assignment.status)}
    </span></td>`;
  }

  function render(matrix) {
    lastMatrix = matrix;
    renderWeekLabel(matrix.week);
    progressEl.textContent = `완료 ${matrix.progress.done} / ${matrix.progress.total}`;
    tbody.innerHTML = matrix.rows.map(row => `<tr>
        <td><span class="am-cell">
          <span class="am-course-name"><b>${esc(row.code)}</b>_${esc(row.name)}</span>
          ${safeHref(row.boardUrl)
            ? `<a class="am-shortcut" href="${esc(row.boardUrl)}" target="_blank" rel="noopener" title="${esc(row.code)} Figma 보드 열기" aria-label="${esc(row.code)} Figma 보드 열기">↗</a>`
            : ''}
        </span></td>
        ${renderCell(row.code, `${row.code} 과제`, row.assignment, row.note)}
        ${renderNoteCell(row)}
        ${renderCell(row.code, `${row.code} 셀프피드백`, row.selfFeedback, row.note)}
      </tr>`).join('');
  }

  async function loadWeek(weekNo) {
    if (snapshot) { currentWeekNo = weekNo; render(snapshotMatrix(weekNo)); return; }
    const matrix = await apiJson(`/weeks/${weekNo}/matrix`);
    if (!matrix || snapshot) return; // switched to read-only while waiting
    currentWeekNo = weekNo;
    render(matrix);
  }

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

  weekPrev.addEventListener('click', () => { if (currentWeekNo > weeks[0]?.week_no) loadWeek(currentWeekNo - 1); });
  weekNext.addEventListener('click', () => { if (currentWeekNo < weeks[weeks.length - 1]?.week_no) loadWeek(currentWeekNo + 1); });

  // Google's consent page is a full-page visit, which can't carry our session —
  // the API hands back a URL with a signed state that brings the browser back here
  connectBtn.addEventListener('click', async () => {
    connectBtn.disabled = true;
    const returnTo = `${location.origin}${location.pathname}#assignment`;
    const res = await api('/gmail/connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnTo }),
    });
    const body = res && await res.json().catch(() => null);
    connectBtn.disabled = false;
    if (!body?.url) { toast(body?.error === 'server_not_configured' ? SYNC_ERROR.server_not_configured : 'Gmail 연결을 시작하지 못했어요', null, 'error'); return; }
    location.href = body.url;
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
      unsavedDrafts.set(`${noteState.courseId}:${currentWeekNo}`, { ...noteState.draft });
    }
    detailAnchor = null; noteState = null;
    if (!detail.hidden && detail.dataset.open) popOut(detail);
  }
  const unsavedDrafts = new Map();
  // 팝업 밖을 누르면 닫는다(사용자 지시 2026-09-14). 팝업을 연 그 칸은 제외 — 그 칸 클릭은 아래 click에서 열고 닫기(토글).
  // 토스트(되돌리기·표시하기)도 제외. 칸이 표 다시 그리기로 바뀌어도 선택자로 다시 찾는다.
  document.addEventListener('pointerdown', e => {
    if (detail.hidden || !detail.dataset.open || detailAnchor == null) return;
    if (detail.contains(e.target) || e.target.closest('.toast')) return;
    const anchor = tbody.querySelector(detailAnchor);
    if (anchor && anchor.contains(e.target)) return;
    closeDetail();
  });
  async function openDetail(targetId) {
    const d = await apiJson(`/targets/${targetId}`);
    if (!d) return;
    detailAnchor = `.am-status[data-target-id="${targetId}"]`;
    noteState = null;
    detail.classList.remove('is-note');
    detail.innerHTML = renderDetail(d);
    popIn(detail);
    placeDetail(); // 같은 프레임 안이라 우하단에 먼저 그려졌다 튀는 일은 없다
    wireDetailActions(d);
  }

  function renderDetail(d) {
    const kindLabel = d.kind === 'assignment' ? '과제' : '셀프피드백';
    const latest = d.evidence[d.evidence.length - 1];
    // 표와 같은 기준으로 "지각 제출" — 첫 확인메일(evidence[0], 수신 시각 오름차순)과 그 주 과제 내용의 마감을 견준다
    const note = lastMatrix?.rows.find(r => r.courseId === d.courseId)?.note;
    const statusLabel = cellLabel({ status: d.status, confirmedAt: d.evidence[0]?.received_at || null }, note);
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
      <h2 class="am-detail-title">${esc(d.courseCode)}_${esc(d.courseName)} · ${d.weekNo}주차 · ${kindLabel}</h2>
      <p class="am-detail-status">${statusDot(d.status)}${statusLabel}</p>
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
      btn.addEventListener('click', () => setManual(d.targetId, btn.dataset.action));
    });
  }

  async function setManual(targetId, action, force = false) {
    const res = await api(`/targets/${targetId}/manual`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, force }),
    });
    if (!res) { toast('저장하지 못했어요', null, 'error'); return; }
    if (res.status === 409) {
      const body = await res.json();
      toast(`이미 확인메일 ${body.evidenceCount}건이 있어요 — 그래도 '해당 없음'으로 표시할까요?`,
        { label: '표시하기', run: () => setManual(targetId, action, true) }, 'error');
      return;
    }
    if (!res.ok) { toast('저장하지 못했어요', null, 'error'); return; }
    toast('저장했어요');
    openDetail(targetId);
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
    const d = await apiJson(`/targets/${btn.dataset.linkTarget}`);
    if (linkMenuAnchor !== btn) return; // closed or another one opened while waiting
    const thread = d?.evidence?.length ? d.evidence[d.evidence.length - 1].gmail_thread_id : null;
    const hadFocus = linkMenu.contains(document.activeElement);
    draw(thread ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(thread)}` : null);
    if (hadFocus) linkMenu.querySelector('a.cm-item')?.focus(); // redraw replaced the focused item
  }
  linkMenu.addEventListener('click', e => { if (e.target.closest('a.cm-item')) closeLinkMenu(); });
  linkMenu.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeLinkMenu(true); return; }
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const items = [...linkMenu.querySelectorAll('a.cm-item')], i = items.indexOf(document.activeElement);
    items[(i + step + items.length) % items.length]?.focus();
  });
  document.addEventListener('pointerdown', e => {
    if (linkMenuAnchor && !linkMenu.contains(e.target) && !linkMenuAnchor.contains(e.target)) closeLinkMenu();
  });
  addEventListener('scroll', () => closeLinkMenu(), { passive: true, capture: true });
  addEventListener('resize', () => closeLinkMenu());

  tbody.addEventListener('click', e => {
    const linkBtn = e.target.closest('[data-link-target]');
    if (linkBtn) { linkMenuAnchor === linkBtn ? closeLinkMenu() : (closeLinkMenu(), openLinkMenu(linkBtn)); return; }
    const btn = e.target.closest('button.am-status'); // read-only labels (span.is-static) have no detail
    if (btn) {
      const sel = `.am-status[data-target-id="${btn.dataset.targetId}"]`;
      if (detailAnchor === sel && !detail.hidden && detail.dataset.open) { closeDetail(); return; } // same cell again = close
      openDetail(Number(btn.dataset.targetId));
      return;
    }
    if (e.target.closest('[data-note-login]')) { toast('로그인하면 과제 공지를 붙여넣고 마감을 볼 수 있어요'); return; }
    const noteBtn = e.target.closest('[data-note-course]');
    if (noteBtn) {
      if (detailAnchor === `[data-note-course="${noteBtn.dataset.noteCourse}"]` && !detail.hidden && detail.dataset.open) { closeDetail(); return; }
      openNote(noteBtn.dataset.noteCourse);
    }
  });

  // ---- 과제 내용 팝오버: 보기 / 붙여넣기·수정 ----
  // noteState = { courseId, mode: 'view'|'edit', note (saved one for this week or null), menu: false|'menu'|'confirm',
  //               draft: { raw, dueAt, lateDueAt, dueTouched, week }, conflict: null|{ note } }
  let noteState = null;
  const rowOf = courseId => lastMatrix?.rows.find(r => r.courseId === courseId);
  const WEEK_NOW = () => currentWeekNo;

  function openNote(courseId, { mode } = {}) {
    const row = rowOf(courseId);
    if (!row) return;
    noteState = { courseId, note: row.note, mode: mode || (row.note ? 'view' : 'edit'), menu: false, conflict: null, draft: null };
    if (noteState.mode === 'edit') startDraft();
    detailAnchor = `[data-note-course="${courseId}"]`;
    detail.classList.add('is-note');
    renderNote();
    popIn(detail);
    placeDetail();
    detail.querySelector('.am-note-input')?.focus();
  }
  function startDraft() {
    const n = noteState.note;
    noteState.mode = 'edit';
    noteState.menu = false;
    // editing a saved notice stays in its week unless the user picks another; a new paste defaults to the week it names
    noteState.draft = { raw: n?.raw || '', dueAt: n?.dueAt || null, lateDueAt: n?.lateDueAt || null, dueTouched: !!n?.dueManual, week: WEEK_NOW(), weekChosen: !!n };
    const kept = unsavedDrafts.get(`${noteState.courseId}:${currentWeekNo}`);
    if (kept) { noteState.draft = kept; unsavedDrafts.delete(`${noteState.courseId}:${currentWeekNo}`); } // what was pasted before closing
  }

  function noteHeader(row, withMenu) {
    return `<div class="am-note-head">
        <h2 class="am-detail-title">${esc(row.code)}_${esc(row.name)} · ${WEEK_NOW()}주차 · 과제 내용</h2>
        ${withMenu ? `<span class="am-note-more">
          <button type="button" class="pill pill-icon" data-note-act="menu" aria-haspopup="menu" aria-expanded="${!!noteState.menu}" aria-label="과제 내용 메뉴">⋯</button>
          ${noteState.menu === 'menu' ? `<div class="am-note-menu" role="menu">
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
    const st = noteState, row = rowOf(st.courseId);
    if (!row) { closeDetail(); return; }
    const close = '<button type="button" class="am-detail-close" data-note-act="close" aria-label="닫기">✕</button>';
    if (st.mode === 'view' && st.note) {
      const n = st.note;
      const dues = [
        n.dueAt ? `<span class="fi-due">마감 ${notice.dueLabelWithDow(n.dueAt)}${n.dueManual ? ' · 직접 입력' : ''}</span>` : '',
        n.lateDueAt ? `<span class="fi-due">지각 마감 ${notice.dueLabelWithDow(n.lateDueAt)}</span>` : '',
      ].join('');
      detail.innerHTML = `${close}${noteHeader(row, true)}
        ${dues ? `<p class="am-note-dues">${dues}</p>` : ''}
        <div class="am-note-body">${notice.renderNotice(n.raw)}</div>`;
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
    if (!d.weekChosen) d.week = parsed.week ?? WEEK_NOW();
    const found = [
      d.dueAt ? `마감 <b>${notice.dueLabelWithDow(d.dueAt)}</b>` : '마감을 찾지 못했어요',
      d.lateDueAt ? `지각 마감 <b>${notice.dueLabelWithDow(d.lateDueAt)}</b>` : '',
      parsed.week != null ? `${parsed.week}주차` : '',
      parsed.course || '',
    ].filter(Boolean).join(' · ');
    const weekChoice = d.raw.trim() && parsed.week != null && parsed.week !== WEEK_NOW()
      ? `<p class="am-note-warn">공지는 ${parsed.week}주차예요 — 어느 주차에 저장할까요?</p>
         <div class="am-note-weeks" role="group" aria-label="저장할 주차">
           <button type="button" class="pill" data-note-week="${parsed.week}" aria-pressed="${d.week === parsed.week}">${parsed.week}주차 (공지)</button>
           <button type="button" class="pill" data-note-week="${WEEK_NOW()}" aria-pressed="${d.week === WEEK_NOW()}">${WEEK_NOW()}주차 (보고 있는 주)</button>
         </div>` : '';
    const courseWarn = d.raw.trim() && parsed.course && parsed.course !== row.code
      ? `<p class="am-note-warn">${esc(parsed.course)} 과목 공지 같아요 — 지금 칸은 ${esc(row.code)}예요.</p>` : '';
    const conflict = st.conflict
      ? `<p class="am-note-warn">${st.conflict.note ? (st.conflict.sameWeek ? '다른 기기에서 먼저 수정된 과제 내용이에요.' : `${d.week}주차에 이미 저장된 공지가 있어요.`) : '다른 기기에서 삭제된 과제 내용이에요.'}</p>
         <div class="am-detail-actions" style="margin-bottom:10px">
           <button type="button" class="pill" data-note-act="force">${st.conflict.note ? '이 내용으로 덮어쓰기' : '다시 저장'}</button>
           ${st.conflict.note ? '<button type="button" class="pill" data-note-act="theirs">저장된 내용 보기</button>' : ''}
         </div>` : '';
    return `
      <p class="am-note-preview" aria-live="polite">${d.raw.trim() ? found : '붙여넣으면 마감을 찾아 보여줘요'}</p>
      ${weekChoice}${courseWarn}
      <div class="am-note-fields">
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
    const live = detail.querySelector('.am-note-live'), row = rowOf(noteState.courseId);
    if (live && row) live.innerHTML = noteLiveHTML(row);
    placeDetail();
  };
  // keep typing smooth: re-render only the preview parts, not the textarea
  detail.addEventListener('input', e => {
    if (!noteState || noteState.mode !== 'edit') return;
    const d = noteState.draft;
    if (e.target.classList.contains('am-note-input')) {
      d.raw = e.target.value;
      refreshNoteLive();
    } else if (e.target.id === 'am-note-due' || e.target.id === 'am-note-late') {
      d.dueTouched = true; // a deadline set by hand wins over what the text says
      d[e.target.id === 'am-note-due' ? 'dueAt' : 'lateDueAt'] = e.target.value || null;
    }
  });
  detail.addEventListener('click', e => {
    if (!noteState) return;
    const weekBtn = e.target.closest('[data-note-week]');
    if (weekBtn) { noteState.draft.week = Number(weekBtn.dataset.noteWeek); noteState.draft.weekChosen = true; refreshNoteLive(); return; }
    const act = e.target.closest('[data-note-act]')?.dataset.noteAct;
    if (!act) return;
    const st = noteState;
    if (act === 'close') closeDetail();
    else if (act === 'menu') { st.menu = st.menu ? false : 'menu'; renderNote(); detail.querySelector('.am-note-menu .cm-item')?.focus(); }
    else if (act === 'cancel-menu') { st.menu = false; renderNote(); }
    else if (act === 'edit') { startDraft(); renderNote(); placeDetail(); detail.querySelector('.am-note-input')?.focus(); }
    else if (act === 'cancel-edit') { st.mode = 'view'; st.conflict = null; renderNote(); placeDetail(); }
    else if (act === 'delete') { st.menu = 'confirm'; renderNote(); detail.querySelector('[data-note-act="cancel-menu"]')?.focus(); }
    else if (act === 'confirm-delete') deleteNote();
    else if (act === 'save') saveNote(false);
    else if (act === 'force') saveNote(true);
    else if (act === 'theirs') showSavedWeek(st.draft.week);
  });

  async function saveNote(force) {
    const st = noteState, d = st.draft, row = rowOf(st.courseId);
    if (!d.raw.trim()) return;
    const sameWeek = d.week === WEEK_NOW();
    const base = st.conflict?.note?.version ?? (sameWeek && st.note ? st.note.version : null);
    const res = await api(`/notes/${st.courseId}/${d.week}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: d.raw, dueAt: d.dueAt, lateDueAt: d.lateDueAt, dueManual: d.dueTouched, baseVersion: base, force: force || undefined }),
    });
    if (!res) { toast('저장하지 못했어요', null, 'error'); return; }
    const body = await res.json().catch(() => ({}));
    if (res.status === 409) { st.conflict = { note: body.note, sameWeek }; refreshNoteLive(); return; }
    if (!res.ok) { toast(body.error === 'note_too_large' ? '공지가 너무 길어요(최대 20,000자)' : '저장하지 못했어요', null, 'error'); return; }
    toast(sameWeek ? '과제 내용을 저장했어요' : `${d.week}주차에 저장했어요`);
    st.mode = 'view'; // saved — nothing to keep as an unsaved paste
    if (!sameWeek) { closeDetail(); await loadWeek(d.week); openNote(st.courseId); return; }
    await loadWeek(WEEK_NOW());
    if (noteState === st) { st.note = rowOf(st.courseId)?.note || body.note; st.mode = 'view'; st.conflict = null; renderNote(); placeDetail(); }
  }
  async function showSavedWeek(week) {
    const courseId = noteState.courseId;
    closeDetail();
    if (week !== WEEK_NOW()) await loadWeek(week); else await loadWeek(WEEK_NOW());
    openNote(courseId, { mode: 'view' });
  }
  async function deleteNote() {
    const st = noteState, week = WEEK_NOW(), saved = st.note;
    const res = await api(`/notes/${st.courseId}/${week}?baseVersion=${saved.version}`, { method: 'DELETE' });
    const body = res && await res.json().catch(() => ({}));
    if (!res || (!res.ok && res.status !== 409)) { toast('삭제하지 못했어요', null, 'error'); return; }
    if (res.status === 409) { toast('다른 기기에서 먼저 수정돼서 삭제하지 않았어요', null, 'error'); closeDetail(); loadWeek(week); return; }
    closeDetail();
    await loadWeek(week);
    toast('과제 내용을 삭제했어요', {
      label: '되돌리기',
      run: async () => {
        const r = await api(`/notes/${st.courseId}/${week}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw: saved.raw, dueAt: saved.dueAt, lateDueAt: saved.lateDueAt, dueManual: saved.dueManual, baseVersion: null }),
        });
        if (!r?.ok) { toast('되돌리지 못했어요', null, 'error'); return; }
        if (currentWeekNo === week) loadWeek(week);
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
    await loadWeek(currentWeekNo ?? cw);
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
