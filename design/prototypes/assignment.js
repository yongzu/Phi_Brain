/*
  Assignment Manage — weekly assignment/self-feedback submission status
  across the 12 courses.

  온라인 전환 2단계: talks to the Phi Brain API (Cloudflare Worker, worker/src/
  assignment/) through PhiBrain.auth.fetch — the same on localhost and on the
  deployed site. Signed out (or the API unreachable), it falls back to the public
  status file the old weekly GitHub Actions sync wrote (data/assignment-status.json)
  and shows it read-only; only if that file is missing too does it show the
  "server unreachable" hint. Never fake/virtual data.

  Separate from Future Item: completing either one never touches the other.
*/
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const { ui: { popIn, popOut, toast } } = window.PhiBrain;
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

  function renderCell(courseCode, kindLabel, cell) {
    const shortcut = safeHref(cell.url)
      ? `<a class="am-shortcut" href="${esc(cell.url)}" target="_blank" rel="noopener" title="${esc(kindLabel)} 제출폼 열기" aria-label="${esc(kindLabel)} 제출폼 열기">↗</a>`
      : '';
    // read-only mode has no detail panel (no mail details are published) — a plain label, not a button
    const status = `${statusDot(cell.status)}<span>${STATUS_LABEL[cell.status] || cell.status}</span>`;
    return `<td><span class="am-cell">
      ${cell.targetId == null
        ? `<span class="am-status is-static">${status}</span>`
        : `<button type="button" class="am-status" data-target-id="${cell.targetId}">${status}</button>`}
      ${shortcut}
    </span></td>`;
  }

  function render(matrix) {
    renderWeekLabel(matrix.week);
    progressEl.textContent = `완료 ${matrix.progress.done} / ${matrix.progress.total}`;
    tbody.innerHTML = matrix.rows.map(row => `<tr>
        <td><span class="am-cell">
          <span class="am-course-name"><b>${esc(row.code)}</b>_${esc(row.name)}</span>
          ${safeHref(row.boardUrl)
            ? `<a class="am-shortcut" href="${esc(row.boardUrl)}" target="_blank" rel="noopener" title="${esc(row.code)} Figma 보드 열기" aria-label="${esc(row.code)} Figma 보드 열기">↗</a>`
            : ''}
        </span></td>
        ${renderCell(row.code, `${row.code} 과제`, row.assignment)}
        ${renderCell(row.code, `${row.code} 셀프피드백`, row.selfFeedback)}
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
  let detailAnchorId = null;
  const detailSheet = matchMedia('(max-width:640px)');
  function placeDetail() {
    if (detailAnchorId == null || detail.hidden) return;
    if (detailSheet.matches) { detail.style.top = detail.style.left = ''; return; }
    const anchor = tbody.querySelector(`.am-status[data-target-id="${detailAnchorId}"]`);
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
  function closeDetail() { detailAnchorId = null; if (!detail.hidden) popOut(detail); }
  async function openDetail(targetId) {
    const d = await apiJson(`/targets/${targetId}`);
    if (!d) return;
    detailAnchorId = targetId;
    detail.innerHTML = renderDetail(d);
    popIn(detail);
    placeDetail(); // 같은 프레임 안이라 우하단에 먼저 그려졌다 튀는 일은 없다
    wireDetailActions(d);
  }

  function renderDetail(d) {
    const kindLabel = d.kind === 'assignment' ? '과제' : '셀프피드백';
    const latest = d.evidence[d.evidence.length - 1];
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
      <p class="am-detail-status">${statusDot(d.status)}${STATUS_LABEL[d.status]}</p>
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

  tbody.addEventListener('click', e => {
    const btn = e.target.closest('button.am-status'); // read-only labels (span.is-static) have no detail
    if (btn) openDetail(Number(btn.dataset.targetId));
  });

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
