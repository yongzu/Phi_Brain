/*
  Assignment Manage — weekly assignment/self-feedback submission status
  across the 12 courses. Talks to the Assignment Manage backend
  (server/index.js); shows an honest "backend not running" state rather
  than any fake/virtual data when that server isn't reachable.

  Separate from Future Item: completing either one never touches the other.
*/
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const { ui: { popIn, popOut, toast } } = window.PhiBrain;

  // Change this if the backend runs on a different host/port (see server/.env.example).
  const API_BASE = 'http://localhost:5600';

  const STATUS_LABEL = {
    unconfirmed: '미확인',
    confirmed_mail: '제출 확인',
    confirmed_manual: '직접 확인',
    not_applicable: '해당 없음',
    conflict: '확인 필요',
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const safeHref = url => (typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null);

  const table = $('#am-table'), tbody = $('#am-tbody'), progressEl = $('#am-progress');
  const backendHint = $('#am-backend-hint');
  const weekLabel = $('#am-week-label'), weekPrev = $('#am-week-prev'), weekNext = $('#am-week-next');
  const gmailStatus = $('#am-gmail-status'), connectBtn = $('#am-gmail-connect');
  const refreshBtn = $('#am-refresh');
  const detail = $('#am-detail');

  let weeks = [];
  let currentWeekNo = null;
  let loaded = false;

  async function api(path, opts) {
    try {
      const res = await fetch(API_BASE + path, opts);
      backendHint.hidden = true;
      table.hidden = false;
      return res;
    } catch {
      backendHint.hidden = false;
      table.hidden = true;
      return null;
    }
  }
  async function apiJson(path, opts) {
    const res = await api(path, opts);
    if (!res) return null;
    try { return await res.json(); } catch { return null; }
  }

  function monthDay(iso) { const [, m, d] = iso.split('-').map(Number); return `${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`; }

  function renderWeekLabel(week) {
    weekLabel.textContent = `Week ${String(week.week_no).padStart(2, '0')} (${monthDay(week.start_date)}~${monthDay(week.end_date)})`;
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
    return `<td><span class="am-cell">
      <button type="button" class="am-status" data-target-id="${cell.targetId}">
        ${statusDot(cell.status)}<span>${STATUS_LABEL[cell.status] || cell.status}</span>
      </button>
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
    const matrix = await apiJson(`/api/weeks/${weekNo}/matrix`);
    if (!matrix) return;
    currentWeekNo = weekNo;
    render(matrix);
  }

  async function loadWeeksList() {
    const data = await apiJson('/api/weeks');
    if (!data) return null;
    weeks = data.weeks;
    return data.currentWeekNo;
  }

  async function loadConnection() {
    const c = await apiJson('/api/connection');
    if (!c) return;
    if (c.connected) {
      gmailStatus.textContent = c.email ? `Gmail 연결됨 · ${c.email}` : 'Gmail 연결됨';
      connectBtn.hidden = true;
    } else {
      gmailStatus.textContent = 'Gmail 연결 안 됨';
      connectBtn.hidden = false;
    }
    // 마지막 동기화 시각 표시는 없앴지만, 오류만큼은 조용히 숨기지 않는다(정직하게
    // 보여준다는 원칙 유지) — 상태 텍스트 뒤에 그대로 이어붙인다.
    if (c.last_sync_error) gmailStatus.textContent += ` · 오류: ${c.last_sync_error}`;
  }

  weekPrev.addEventListener('click', () => { if (currentWeekNo > weeks[0]?.week_no) loadWeek(currentWeekNo - 1); });
  weekNext.addEventListener('click', () => { if (currentWeekNo < weeks[weeks.length - 1]?.week_no) loadWeek(currentWeekNo + 1); });

  connectBtn.addEventListener('click', () => { location.href = `${API_BASE}/auth/google/start`; });
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '새로고침 중…';
    const res = await api('/api/sync', { method: 'POST' });
    const body = res && await res.json().catch(() => null);
    refreshBtn.disabled = false;
    refreshBtn.textContent = '제출 상태 새로고침';
    if (!body || !body.ok) {
      toast(body?.error === 'NOT_CONNECTED' ? 'Gmail을 먼저 연결해주세요' : '새로고침에 실패했어요', null, 'error');
    } else {
      const s = body.summary;
      toast(`동기화 완료 · 새로 확인됨 ${s.matched || 0} · 검토 필요 ${s.review || 0}`);
    }
    loadConnection();
    if (currentWeekNo) loadWeek(currentWeekNo);
  });

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
  function closeDetail() { detailAnchorId = null; popOut(detail); }
  async function openDetail(targetId) {
    const d = await apiJson(`/api/targets/${targetId}`);
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
    const res = await api(`/api/targets/${targetId}/manual`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, force }),
    });
    if (!res) return;
    if (res.status === 409) {
      const body = await res.json();
      toast(`이미 확인메일 ${body.evidenceCount}건이 있어요 — 그래도 '해당 없음'으로 표시할까요?`,
        { label: '표시하기', run: () => setManual(targetId, action, true) }, 'error');
      return;
    }
    toast('저장했어요');
    openDetail(targetId);
    if (currentWeekNo) loadWeek(currentWeekNo);
  }

  tbody.addEventListener('click', e => {
    const btn = e.target.closest('.am-status');
    if (btn) openDetail(Number(btn.dataset.targetId));
  });

  async function init() {
    const cw = await loadWeeksList();
    if (cw == null) return; // backend unreachable — the hint is already shown
    await loadConnection();
    await loadWeek(currentWeekNo || cw);
    loaded = true;
  }
  // future.js owns view switching and clears the hash for every non-'future'
  // view (see show()), so a hash check here would always see it empty by the
  // time this script runs — it dispatches this event instead.
  document.addEventListener('phibrain:view', e => { if (e.detail.name === 'assignment') init(); });
  if (window.PhiBrain.getCurrentView() === 'assignment') init();
})();
