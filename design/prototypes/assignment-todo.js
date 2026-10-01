/*
  Assignment Manage — 오른쪽 TO-DO 열(사용자 요구사항 2026-10-01).

  이번 주에 무엇을 내야 하는지 마감 순으로 쌓는다 — 서버 GET /api/assignment/todo(worker/src/assignment/todo.js).
  과제는 과제 공지(과제 내용 칸)에 마감이 있는 과목 × 주차마다, 셀프피드백은 매주 세션 요일이 되면(공지와 무관,
  사용자 확정 2026-10-01). 셀프피드백 마감은 그 주 과제 지각 마감, 공지가 없으면 "마감 미정"(이번 주 맨 아래). 아직 안 낸 것만 보여준다 —
  전체·완료 탭은 두지 않는다(사용자 지시 2026-10-01). 제출 상태는 표와 같은 메일 확인이라 내면 목록에서 저절로 빠진다.

  우선순위(사용자 확정 "드래그 순서 + 항목별 메모"): 항목을 끌어 같은 묶음 안 순서를 바꾸고
  (키보드: Alt+↑/↓), 항목마다 한 줄 메모를 단다. 둘 다 서버에 저장(PUT /api/assignment/todo/prefs).
  로그인해야 보인다 — 공개 상태 파일에는 공지·마감이 없다.
*/
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const root = $('#am-todo');
  if (!root) return;
  const auth = window.PhiBrain.auth;
  const { ui: { toast } } = window.PhiBrain;
  const groupsEl = $('#am-todo-groups'), hintEl = $('#am-todo-hint');

  const DAY = 864e5, WINDOW = 7 * DAY; // 지난 마감은 7일까지만, '이번 주' = 앞으로 7일
  const DOW = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const DONE = new Set(['confirmed_mail', 'confirmed_manual', 'not_applicable']);
  const GROUPS = [['past', '지난 마감'], ['week', '이번 주'], ['later', '다음']];
  const KIND_LABEL = { assignment: '과제', self_feedback: '셀프피드백' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const safeHref = url => (typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null);
  // "2026-09-28T23:59"는 한국 시각 — assignment.js의 kstMs와 같다
  const kstMs = at => { const [d, t = '23:59'] = at.split('T'); const [y, m, dd] = d.split('-').map(Number); const [hh, mm] = t.split(':').map(Number); return Date.UTC(y, m - 1, dd, hh - 9, mm); };

  let items = [];
  let prefs = { order: [], memos: {} };
  let editingKey = null; // 메모를 쓰는 중인 항목 — 그동안은 다시 그리지 않는다
  let dragKey = null;
  let pendingRender = false;

  const dueMs = item => (item.dueAt ? kstMs(item.dueAt) : Infinity); // 마감 미정은 맨 뒤
  function groupOf(item, now) {
    if (!item.dueAt) return 'week';
    const due = kstMs(item.dueAt);
    if (due < now) return now - due <= WINDOW ? 'past' : null;
    return due - now <= WINDOW ? 'week' : 'later';
  }
  const isDone = item => DONE.has(item.status);
  function rank(item) {
    const i = prefs.order.indexOf(item.key);
    return i < 0 ? Infinity : i;
  }
  // 끌어서 정한 순서가 먼저, 아직 안 건드린 항목은 마감 → 과목 → 과제·셀프피드백 순
  const byPriority = (a, b) => rank(a) - rank(b) || (dueMs(a) - dueMs(b) || 0) || a.code.localeCompare(b.code) || a.kind.localeCompare(b.kind);

  function setHint(text) { hintEl.textContent = text || ''; hintEl.hidden = !text; }

  function render() {
    if (editingKey || dragKey) { pendingRender = true; return; }
    pendingRender = false;
    const now = Date.now();
    const visible = items.filter(it => !isDone(it)).map(it => ({ ...it, group: groupOf(it, now) })).filter(it => it.group).sort(byPriority);
    if (!visible.length) {
      groupsEl.innerHTML = `<p class="am-todo-empty">${items.length ? '이번 주에 할 과제가 없어요' : '과제 내용에 공지를 붙여넣으면 마감이 여기에 쌓여요'}</p>`;
      return;
    }
    groupsEl.innerHTML = GROUPS.map(([g, label]) => {
      const list = visible.filter(it => it.group === g);
      if (!list.length) return '';
      return `<section class="am-todo-group" data-group="${g}">
        <p class="am-todo-label${g === 'past' ? ' is-past' : ''}">${label}</p>
        <ol class="am-todo-list">${list.map(renderItem).join('')}</ol>
      </section>`;
    }).join('');
  }

  function renderItem(it) {
    let dateCell, dueText;
    if (it.dueAt) {
      const [y, m, d] = it.dueAt.slice(0, 10).split('-').map(Number);
      const dow = DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      dueText = `${m}월 ${d}일 ${dow} 마감`;
      dateCell = `<span class="am-todo-date" title="${m}월 ${d}일 ${dow} ${esc(it.dueAt.slice(11))}"><b>${String(d).padStart(2, '0')}</b><span>${dow}</span></span>`;
    } else {
      dueText = '마감 미정';
      dateCell = '<span class="am-todo-date" title="과제 내용에 공지를 붙여넣으면 마감이 채워져요"><span>마감</span><b>미정</b></span>';
    }
    const title = `${it.code} ${it.weekNo}주차 ${KIND_LABEL[it.kind] || ''}`;
    const href = safeHref(it.url);
    const memo = prefs.memos[it.key] || '';
    const memoPart = editingKey === it.key
      ? `<input type="text" class="am-todo-memo-input" maxlength="200" value="${esc(memo)}" aria-label="${esc(title)} 메모" placeholder="먼저 할 것, 순서 이유 등 한 줄">`
      : memo ? `<button type="button" class="am-todo-memo" data-todo-memo title="눌러서 메모 고치기">${esc(memo)}</button>` : '';
    return `<li class="am-todo-item" data-key="${esc(it.key)}" draggable="true" tabindex="0" aria-label="${esc(`${dueText}, ${it.name}, ${title}`)}">
      <span class="am-todo-grip" aria-hidden="true">⠿</span>
      ${dateCell}
      <span class="am-todo-body">
        <span class="am-todo-course">${esc(it.name)}</span>
        ${href ? `<a class="am-todo-title" href="${esc(href)}" target="_blank" rel="noopener" title="${esc(title)} 제출폼 열기" draggable="false">${esc(title)}</a>` : `<span class="am-todo-title">${esc(title)}</span>`}
        ${memoPart}
      </span>
      ${memo || editingKey === it.key ? '' : `<button type="button" class="pill am-todo-memo-btn" data-todo-memo aria-label="${esc(title)} 메모 달기">메모</button>`}
    </li>`;
  }

  // ---- 불러오기 ----
  let loadRun = 0;
  async function load() {
    const run = ++loadRun;
    if (!auth.session) {
      items = []; setHint('로그인하면 과제 공지의 마감으로 이번 주 할 일을 모아 보여줘요');
      groupsEl.innerHTML = '';
      return;
    }
    let body = null;
    try {
      const res = await auth.fetch('/api/assignment/todo');
      if (res.ok) body = await res.json();
    } catch {}
    if (run !== loadRun) return;
    if (!body) { setHint('할 일을 불러오지 못했어요 — 잠시 뒤 다시 열어 주세요'); return; }
    setHint('');
    items = Array.isArray(body.items) ? body.items : [];
    if (!editingKey && !dragKey) prefs = { order: body.prefs?.order || [], memos: body.prefs?.memos || {} };
    render();
  }
  let loadTimer = 0;
  const scheduleLoad = () => { clearTimeout(loadTimer); loadTimer = setTimeout(load, 150); };

  // ---- 저장(순서·메모) ----
  let saveTimer = 0;
  function save() {
    // 지금 목록에 없는 항목의 순서는 버린다 — 학기 내내 쌓이지 않게
    const keys = new Set(items.map(it => it.key));
    prefs.order = prefs.order.filter(k => keys.has(k));
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      let ok = false;
      try {
        const res = await auth.fetch('/api/assignment/todo/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefs) });
        ok = res.ok;
      } catch {}
      if (!ok) toast('할 일 순서·메모를 저장하지 못했어요', { label: '다시 시도', run: save }, 'error');
    }, 300);
  }

  // 한 묶음 안의 새 순서 → 전체 순서. 이 묶음을 앞에 두고 나머지는 원래 상대 순서 그대로
  function applyGroupOrder(groupKeys) {
    prefs.order = [...groupKeys, ...prefs.order.filter(k => !groupKeys.includes(k))];
    save();
  }
  const groupKeysOf = li => [...li.parentElement.children].map(el => el.dataset.key);

  // ---- 메모 ----
  function startMemo(key) {
    editingKey = key;
    pendingRender = false;
    const li = groupsEl.querySelector(`[data-key="${CSS.escape(key)}"]`);
    const it = items.find(x => x.key === key);
    if (!li || !it) { editingKey = null; return; }
    li.outerHTML = renderItem(it);
    const input = groupsEl.querySelector('.am-todo-memo-input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  function finishMemo(input, keep) {
    const key = editingKey;
    if (!key) return;
    editingKey = null;
    if (keep) {
      const text = input.value.replace(/\s+/g, ' ').trim();
      if (text !== (prefs.memos[key] || '')) {
        if (text) prefs.memos[key] = text; else delete prefs.memos[key];
        save();
      }
    }
    render();
    groupsEl.querySelector(`[data-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
  }
  groupsEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-todo-memo]');
    if (btn) startMemo(btn.closest('.am-todo-item').dataset.key);
  });
  groupsEl.addEventListener('keydown', e => {
    const input = e.target.closest('.am-todo-memo-input');
    if (input) {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); finishMemo(input, true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finishMemo(input, false); }
      return;
    }
    // Alt+↑/↓: 끌기 대신 키보드로 순서 바꾸기
    const li = e.target.closest('.am-todo-item[draggable="true"]');
    if (!li || e.target !== li || !e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const keys = groupKeysOf(li), i = keys.indexOf(li.dataset.key), j = i + (e.key === 'ArrowUp' ? -1 : 1);
    if (j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    applyGroupOrder(keys);
    render();
    groupsEl.querySelector(`[data-key="${CSS.escape(li.dataset.key)}"]`)?.focus();
  });
  groupsEl.addEventListener('focusout', e => {
    if (e.target.matches('.am-todo-memo-input')) finishMemo(e.target, true);
  });

  // ---- 끌어서 순서 바꾸기(같은 묶음 안) ----
  const clearDrop = () => groupsEl.querySelectorAll('.drop-before,.drop-after').forEach(el => el.classList.remove('drop-before', 'drop-after'));
  groupsEl.addEventListener('dragstart', e => {
    const li = e.target.closest?.('.am-todo-item[draggable="true"]');
    if (!li || editingKey) { e.preventDefault(); return; }
    dragKey = li.dataset.key;
    li.classList.add('is-drag-src');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragKey);
  });
  groupsEl.addEventListener('dragover', e => {
    if (!dragKey) return;
    const li = e.target.closest('.am-todo-item');
    const src = groupsEl.querySelector(`[data-key="${CSS.escape(dragKey)}"]`);
    if (!li || !src || li.parentElement !== src.parentElement) { clearDrop(); return; } // 다른 묶음(마감이 다른 칸)으로는 못 옮긴다
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const r = li.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    clearDrop();
    if (li !== src) li.classList.add(after ? 'drop-after' : 'drop-before');
  });
  groupsEl.addEventListener('drop', e => {
    const li = groupsEl.querySelector('.drop-before,.drop-after');
    if (!dragKey || !li) return;
    e.preventDefault();
    const keys = groupKeysOf(li).filter(k => k !== dragKey);
    keys.splice(keys.indexOf(li.dataset.key) + (li.classList.contains('drop-after') ? 1 : 0), 0, dragKey);
    applyGroupOrder(keys);
  });
  groupsEl.addEventListener('dragend', () => {
    const key = dragKey;
    dragKey = null;
    clearDrop();
    render();
    groupsEl.querySelector(`[data-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
  });

  // 표가 다시 그려질 때(주차 이동·새로고침·과제 내용 저장·직접 확인) 같이 새로 읽는다 — assignment.js가 알려 준다
  document.addEventListener('phibrain:assignment-rendered', scheduleLoad);
  auth.onChange(scheduleLoad);
  addEventListener('focus', () => { if (pendingRender) render(); });
})();
