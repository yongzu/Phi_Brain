/*
  Assignment Manage — 개인 할 일 줄(사용자 지시 2026-10-02).

  과목이 아닌 개인적인 할 일을 표에 줄로 더한다. 메일 확인은 하지 않고 직접 체크한다
  (Assignment 칸 = 완료 / 미완료 버튼). 이름 + "자세히보기"로 내용을 적는다. Self-Feedback 칸은 비운다.
  서버 /api/assignment/tasks(worker/src/assignment/tasks.js) — 로그인해야 보인다(읽기 전용 표에는 없음).

  어느 주차 표에 보이나: 만든 주부터, 끝내지 않았으면 그 뒤 모든 주차(이월), 끝냈으면 체크한 표의 주차까지.
  assignment.js가 표를 다 그릴 때마다 보내는 phibrain:assignment-rendered를 받아, 과목 줄(수강기간 아님·완강 줄 앞)
  뒤에 끼워 넣는다. 완료 수(완료 N / M)는 제출 현황이라 개인 할 일은 세지 않는다.

  마감(사용자 지시 2026-10-02): 추가 줄과 자세히보기에서 날짜·시간을 적을 수 있다(선택, 비우면 마감 없음).
  고르는 칸은 Future Item 작성칸의 마감과 똑같은 것(● 마감 → 달력 · 오전/오후·시·분, due-picker.js — 같은 날 사용자 지시로 브라우저 기본 칸을 대체). 표에는 과목 줄의
  과제 마감과 같은 배지로, 끝내지 않은 할 일은 오른쪽 TO-DO 열에도 나온다 — 바뀔 때마다 phibrain:assignment-tasks-changed로 알린다.
*/
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const tbody = $('#am-tbody');
  if (!tbody) return;
  const auth = window.PhiBrain.auth;
  const { ui: { popIn, popOut, toast } } = window.PhiBrain;
  const notice = window.PhiAssignmentNotice;
  const changedEvent = () => document.dispatchEvent(new CustomEvent('phibrain:assignment-tasks-changed'));
  // "2026-10-05T18:00"(한국 시각) → 시각 — assignment.js의 kstMs와 같다
  const kstMs = at => { const [d, t = '23:59'] = at.split('T'); const [y, m, dd] = d.split('-').map(Number); const [hh, mm] = t.split(':').map(Number); return Date.UTC(y, m - 1, dd, hh - 9, mm); };
  const dueBadge = t => (t.dueAt
    ? `<span class="fi-due am-note-due${!t.done && Date.now() > kstMs(t.dueAt) ? ' is-overdue' : ''}">마감 ${esc(notice.dueLabel(t.dueAt))}</span>` : '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NAME_MAX = 100;

  let tasks = null; // null = 아직 안 불러옴
  let week = null, live = false;
  let adding = false; // "+ 할 일 추가" 줄이 입력칸으로 바뀐 상태
  let addDue = null; // 추가 줄에서 고른 마감('YYYY-MM-DDTHH:MM') — 다시 그려도 남게
  let open = null; // 자세히보기 팝업: { id, name, detail } — 고치는 중인 값

  // 자세히보기 팝업 — 과제 내용 팝업과 같은 모양(.am-detail.is-note), 따로 둔다
  const pop = document.createElement('div');
  pop.className = 'am-detail is-note am-task-detail';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', '할 일 자세히보기');
  pop.hidden = true;
  $('#view-assignment').append(pop);

  const api = (path, opts) => auth.fetch(`/api/assignment/tasks${path}`, opts);
  const jsonOpts = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  async function load() {
    if (!auth.session) { tasks = null; return; }
    try {
      const res = await api('');
      if (res.ok) {
        tasks = (await res.json()).tasks || [];
        window.PhiBrain.amTable.pruneTasks(new Set(tasks.map(t => t.id)));
      }
    } catch {}
  }

  const visibleIn = (t, w) => t.weekNo <= w && (!t.done || (t.doneWeek ?? t.weekNo) >= w);

  // 별표·줄 순서(사용자 지시 2026-10-06): 과목 줄과 같은 ⠿·별표. 즐겨찾기 키 "task:<id>"는 과목 즐겨찾기와 한 목록이라
  // 별표한 할 일은 표 맨 위 즐겨찾기 묶음에 누른 순서대로 섞여 들어가고, 나머지는 과목 줄과 한 묶음("rest")이라 과목 사이 어디로든 끌어 옮긴다
  const keyOf = t => `task:${t.id}`;
  function rowHtml(t, isFav) {
    const doneLabel = t.done ? '완료' : '미완료';
    return `<tr data-am-row="${esc(keyOf(t))}" data-am-group="${isFav ? 'fav' : 'rest'}" class="am-task-row${t.done ? ' is-done' : ''}" draggable="true">
      <td><span class="am-cell">
        <button type="button" class="am-grip" data-am-grip aria-label="${esc(t.name)} 줄 순서 바꾸기 — 끌거나 ↑·↓" title="끌어서 순서 바꾸기">⠿</button>
        <button type="button" class="fi-box-fav am-fav${isFav ? ' is-fav' : ''}" data-am-fav-key="${esc(keyOf(t))}" aria-pressed="${isFav}" aria-label="${isFav ? '즐겨찾기 해제' : '즐겨찾기 — 표 맨 위로'}: ${esc(t.name)}"></button>
        <span class="am-task-name" title="${esc(t.name)}">${esc(t.name)}</span>
        <span class="am-week-tag">개인</span>
      </span></td>
      <td><span class="am-cell">
        <button type="button" class="am-status am-task-check${t.done ? ' is-confirmed' : ''}" data-task-check="${esc(t.id)}" aria-pressed="${t.done}" aria-label="${esc(t.name)} — ${doneLabel}, 눌러서 ${t.done ? '미완료로' : '완료로'}">
          <span class="am-dot am-dot-${t.done ? 'confirmed_manual' : 'unconfirmed'}" aria-hidden="true"></span><span>${doneLabel}</span>
        </button>
      </span></td>
      <td><span class="am-note-cell">
        <button type="button" class="am-note-btn${t.detail ? ' is-set' : ''}" data-task-open="${esc(t.id)}" aria-haspopup="dialog" aria-label="${esc(t.name)} 자세히보기">자세히보기</button>
        ${dueBadge(t)}
      </span></td>
      <td></td>
    </tr>`;
  }
  const addRowHtml = () => `<tr class="am-task-add-row" data-am-group="task-add"><td colspan="4">${adding
    ? `<span class="am-task-add-form"><input type="text" class="am-task-add-input" maxlength="${NAME_MAX}" placeholder="할 일 이름 — Enter로 추가, Esc로 취소" aria-label="새 할 일 이름">
        <span class="am-task-add-due-slot"></span></span>`
    : '<button type="button" class="pill pill-start am-task-add" data-task-add>+ 할 일 추가</button>'}</td></tr>`;

  function draw() {
    tbody.querySelectorAll('.am-task-row,.am-task-add-row').forEach(tr => tr.remove());
    if (!live || tasks === null || week == null) return;
    const am = window.PhiBrain.amTable, favs = am.favorites();
    const shown = tasks.filter(t => visibleIn(t, week));
    // 별표 안 한 할 일 → 과목 줄과 한 묶음("rest", 사용자 지시 2026-10-06): 같은 순서 목록의 순위대로 과목 줄 사이에 끼운다.
    // 과목 줄은 render()가 이미 같은 순위로 세워 두었으니, 과목·할 일을 한 줄로 정렬(순위 같으면 과목 먼저 — 순서를 정한 적 없는
    // 새 할 일은 과목 줄 아래)한 뒤 할 일만 바로 앞 줄 뒤에 넣는다. 마지막에 "+ 할 일 추가" 줄(수강기간 아님·완강 줄 앞)
    const courseRows = [...tbody.querySelectorAll('tr[data-am-group="rest"]')];
    const merged = [
      ...courseRows.map(tr => ({ tr, rank: am.orderRank(tr.dataset.amRow.split(':')[0]) })),
      ...shown.filter(t => !favs.includes(keyOf(t))).map(t => ({ t, rank: am.orderRank(keyOf(t)) })),
    ].sort((a, b) => a.rank - b.rank || 0);
    const favRowsNow = tbody.querySelectorAll('tr[data-am-group="fav"]');
    let anchor = courseRows[0]?.previousElementSibling ?? favRowsNow[favRowsNow.length - 1] ?? null;
    const putAfter = html => {
      if (anchor) anchor.insertAdjacentHTML('afterend', html);
      else tbody.insertAdjacentHTML('afterbegin', html);
      anchor = anchor ? anchor.nextElementSibling : tbody.firstElementChild;
    };
    for (const m of merged) m.tr ? (anchor = m.tr) : putAfter(rowHtml(m.t, false));
    putAfter(addRowHtml());
    // 별표한 할 일 → 즐겨찾기 묶음 안, 즐겨찾기 목록 순서의 제자리
    for (const t of shown.filter(x => favs.includes(keyOf(x)))) {
      const i = favs.indexOf(keyOf(t)), favRows = [...tbody.querySelectorAll('tr[data-am-group="fav"]')];
      const next = favRows.find(tr => favs.indexOf(tr.dataset.amRow) > i);
      if (next) next.insertAdjacentHTML('beforebegin', rowHtml(t, true));
      else if (favRows.length) favRows[favRows.length - 1].insertAdjacentHTML('afterend', rowHtml(t, true));
      else tbody.insertAdjacentHTML('afterbegin', rowHtml(t, true));
    }
    am.markFavLast();
    const slot = tbody.querySelector('.am-task-add-due-slot');
    if (slot) slot.append(window.PhiBrain.duePicker({ value: addDue, onChange: v => { addDue = v; } }).el);
    if (adding) tbody.querySelector('.am-task-add-input')?.focus({ preventScroll: true });
    placePop();
  }

  document.addEventListener('phibrain:assignment-rendered', async e => {
    week = e.detail?.week ?? null;
    live = !!e.detail?.live;
    if (live && tasks === null) await load();
    draw();
  });
  auth.onChange(() => { tasks = null; adding = false; addDue = null; closePop(false); });

  // ---- 추가 ----
  async function create(name, dueAt) {
    const w = week;
    let res = null;
    try { res = await api('', jsonOpts('POST', { name, weekNo: w, dueAt: dueAt || null })); } catch {}
    if (!res?.ok) { toast('할 일을 추가하지 못했어요', null, 'error'); return; }
    tasks.push((await res.json()).task);
    draw();
    changedEvent();
  }

  // ---- 체크 · 고치기 · 지우기 ----
  async function update(id, patch, { quiet = false } = {}) {
    let res = null;
    try { res = await api(`/${id}`, jsonOpts('PUT', patch)); } catch {}
    if (!res?.ok) { toast('저장하지 못했어요', { label: '다시 시도', run: () => update(id, patch, { quiet }) }, 'error'); return null; }
    const { task } = await res.json();
    tasks = tasks.map(t => (t.id === id ? task : t));
    draw();
    changedEvent();
    return task;
  }
  async function toggle(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const task = await update(id, t.done ? { done: false } : { done: true, doneWeek: week });
    if (task) tbody.querySelector(`[data-task-check="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
  }
  async function remove(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    let res = null;
    try { res = await api(`/${id}`, { method: 'DELETE' }); } catch {}
    if (!res?.ok) { toast('삭제하지 못했어요', null, 'error'); return; }
    tasks = tasks.filter(x => x.id !== id);
    closePop(false);
    draw();
    changedEvent();
    toast(`'${t.name}' 할 일을 삭제했어요`, {
      label: '되돌리기',
      run: async () => {
        let r = null;
        try { r = await api('', jsonOpts('POST', { name: t.name, weekNo: t.weekNo, detail: t.detail, dueAt: t.dueAt })); } catch {}
        if (!r?.ok) { toast('되돌리지 못했어요', null, 'error'); return; }
        const back = (await r.json()).task;
        window.PhiBrain.amTable.renameKey(keyOf(t), keyOf(back)); // 별표·순서도 되살린다
        tasks.push(back);
        if (t.done) await update(back.id, { done: true, doneWeek: t.doneWeek }); // 완료였으면 완료로(새 id)
        else { draw(); changedEvent(); }
      },
    }, '', true);
  }

  // ---- 자세히보기 팝업: 이름 + 내용. 저장하기(Ctrl+Enter), 닫으면 바뀐 내용은 저장 ----
  const anchorOf = id => tbody.querySelector(`[data-task-open="${CSS.escape(id)}"]`);
  function placePop() {
    if (!open || pop.hidden) return;
    if (matchMedia('(max-width:640px)').matches) { pop.style.top = pop.style.left = ''; return; } // 화면 아래 시트(CSS)
    const a = anchorOf(open.id);
    if (!a) return;
    const r = a.getBoundingClientRect(), gap = 6, edge = 16, w = pop.offsetWidth, h = pop.offsetHeight;
    let top = r.bottom + gap;
    if (top + h > innerHeight - edge && r.top - gap - h >= edge) top = r.top - gap - h;
    pop.style.top = `${Math.max(edge, Math.min(top, innerHeight - edge - h))}px`;
    pop.style.left = `${Math.max(edge, Math.min(r.left, innerWidth - edge - w))}px`;
  }
  addEventListener('scroll', placePop, { passive: true, capture: true });
  addEventListener('resize', placePop);

  function openPop(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    open = { id, name: t.name, detail: t.detail, dueAt: t.dueAt || '', confirmDelete: false };
    renderPop();
    popIn(pop);
    placePop();
    const ta = pop.querySelector('.am-note-input');
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }
  function renderPop() {
    const t = tasks.find(x => x.id === open.id);
    pop.innerHTML = `
      <button type="button" class="am-detail-close" data-task-pop="close" aria-label="닫기">✕</button>
      <input type="text" class="am-task-title-input" maxlength="${NAME_MAX}" value="${esc(open.name)}" aria-label="할 일 이름">
      <p class="am-task-meta">개인 할 일 · ${t.weekNo}주차에 추가${t.done ? ` · ${t.doneWeek ?? t.weekNo}주차에 완료` : ''}</p>
      <div class="am-task-pop-due"></div>
      <textarea class="am-note-input" aria-label="할 일 내용" placeholder="무엇을, 어떻게 할지 적어 두세요">${esc(open.detail)}</textarea>
      <div class="am-detail-actions am-task-actions">
        ${open.confirmDelete
          ? `<span class="am-task-confirm">이 할 일을 삭제할까요?</span>
             <button type="button" class="pill" data-task-pop="delete-yes"><b>삭제</b></button>
             <button type="button" class="pill" data-task-pop="delete-no">취소</button>`
          : `<button type="button" class="pill pill-start" data-task-pop="delete">삭제</button>
             <button type="button" class="btn-primary" data-task-pop="save">저장</button>`}
      </div>`;
    pop.querySelector('.am-task-pop-due').append(window.PhiBrain.duePicker({ value: open.dueAt || null, onChange: v => { if (open) open.dueAt = v || ''; } }).el);
  }
  const changed = () => {
    const t = open && tasks.find(x => x.id === open.id);
    return t && (open.name.replace(/\s+/g, ' ').trim() !== t.name || open.detail !== t.detail || (open.dueAt || null) !== (t.dueAt || null));
  };
  async function savePop({ close = true } = {}) {
    if (!open) return;
    const id = open.id, name = open.name.replace(/\s+/g, ' ').trim();
    if (!name) { toast('이름을 적어 주세요', null, 'error'); pop.querySelector('.am-task-title-input')?.focus(); return; }
    if (changed()) {
      const task = await update(id, { name, detail: open.detail, dueAt: open.dueAt || null });
      if (!task) return; // 실패 — 팝업과 적은 내용은 그대로
      toast('저장했어요');
    }
    if (close) closePop(false);
  }
  function closePop(save = true) {
    if (!open) return;
    if (save && changed()) { savePop(); return; } // 닫을 때 바뀐 내용은 저장(잃지 않게)
    const id = open.id;
    open = null;
    if (!pop.hidden && pop.dataset.open) popOut(pop);
    anchorOf(id)?.focus({ preventScroll: true });
  }
  const onField = e => {
    if (!open) return;
    if (e.target.matches('.am-task-title-input')) open.name = e.target.value;
    if (e.target.matches('.am-note-input')) open.detail = e.target.value;
  };
  pop.addEventListener('input', onField);
  pop.addEventListener('click', e => {
    const act = e.target.closest('[data-task-pop]')?.dataset.taskPop;
    if (!act || !open) return;
    if (act === 'close') closePop();
    else if (act === 'save') savePop();
    else if (act === 'delete' || act === 'delete-no') {
      open.confirmDelete = act === 'delete';
      renderPop();
      pop.querySelector(`[data-task-pop="${act === 'delete' ? 'delete-no' : 'delete'}"]`)?.focus();
    } else if (act === 'delete-yes') remove(open.id);
  });
  pop.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); savePop(); }
    else if (e.key === 'Enter' && e.target.matches('.am-task-title-input') && !e.isComposing) { e.preventDefault(); pop.querySelector('.am-note-input')?.focus(); }
  });
  // 팝업 밖을 누르면 닫는다(바뀐 내용은 저장) — 연 "자세히보기"를 다시 누르는 건 아래 click이 닫는다
  document.addEventListener('pointerdown', e => {
    if (!open || pop.hidden || pop.contains(e.target) || e.target.closest('.toast')) return;
    if (anchorOf(open.id)?.contains(e.target)) return;
    closePop();
  });

  // ---- 표 안 클릭 — assignment.js의 표 클릭(상태 칸 → 메일 상세)보다 먼저 받아 거기로 넘기지 않는다 ----
  tbody.addEventListener('click', e => {
    const check = e.target.closest('[data-task-check]');
    const openBtn = e.target.closest('[data-task-open]');
    const add = e.target.closest('[data-task-add]');
    if (!check && !openBtn && !add) return; // 추가 줄의 마감 고르기 등은 그대로 흘려보낸다
    e.stopPropagation();
    if (check) toggle(check.dataset.taskCheck);
    else if (openBtn) open?.id === openBtn.dataset.taskOpen ? closePop() : (closePop(), openPop(openBtn.dataset.taskOpen));
    else if (add) { adding = true; draw(); }
  }, true);
  tbody.addEventListener('dblclick', e => { if (e.target.closest('.am-task-row')) e.stopPropagation(); }, true);
  tbody.addEventListener('keydown', e => {
    const input = e.target.closest('.am-task-add-input');
    if (!input) return;
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      const name = input.value.replace(/\s+/g, ' ').trim();
      if (!name) return;
      const dueAt = addDue;
      input.value = ''; addDue = null;
      create(name, dueAt); // 입력칸은 열어 둔다 — 여러 개를 이어서 적을 수 있게(마감은 다시 비움)
    } else if (e.key === 'Escape') {
      e.preventDefault();
      adding = false; addDue = null;
      draw();
      tbody.querySelector('[data-task-add]')?.focus();
    }
  });
  tbody.addEventListener('focusout', e => {
    if (!e.target.closest?.('.am-task-add-form')) return;
    // 이름·마감을 다 비운 채 추가 줄 밖으로 가면 버튼으로 되돌린다(다시 그리는 중의 잠깐 사라짐·마감 칸으로 옮겨 가는 것은 무시)
    setTimeout(() => {
      const form = tbody.querySelector('.am-task-add-form');
      if (!adding || !form || form.contains(document.activeElement)) return;
      if (form.querySelector('.am-task-add-input').value.trim() || addDue) return;
      adding = false; draw();
    }, 0);
  });
})();
