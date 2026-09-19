/*
  Future Items — concrete actions (Activity), managed like a to-do list.
  Flow: 빠르게 작성 → 과목별 분류 → 실행 → 완료.

  - Signed out: saved in this browser's localStorage (key phi-brain:future:v2).
    Signed in: the whole board is kept on the server as one versioned
    document (future-sync.js, 온라인 전환 4단계) — this file only swaps where
    commit() saves to (futureStore.useBackend) and accepts a board from outside
    (futureStore.replace).
  - One membership per item: a course, a user-added custom box, General, or
    임시 (unassigned). General = "decided: belongs to no course"; 임시 = "not
    decided yet". They are separate scopes, not fake courses.
  - 임시/General always sit in a fixed top row, half-width each. Every course
    and custom box below is freely drag-reorderable (boxOrder); "+ 박스 추가"
    appends a new custom box to the end of that same order.
  - Separate from Assignment Manage: completing an item never touches
    assignment / submission state.
  - Every change goes through commit(): apply → save → on failure roll back
    and offer 다시 시도. Moves and deletes offer 되돌리기.
  - Also owns the shared course list, the floating-card helpers, and the
    Journaling ↔ Future Item view switch (journal.js reads PhiBrain).
*/
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // dueAt is stored as whatever <input type="datetime-local"> gives (local
  // wall-clock time, no timezone) — parsed as local time for display/sorting too
  const dueLabel = iso => {
    if (!iso) return '';
    const [d, t] = iso.split('T');
    const [, m, day] = d.split('-').map(Number);
    return `${m}월 ${day}일${t ? ` ${t.slice(0, 5)}` : ''}`;
  };
  const dueMs = iso => (iso ? new Date(iso.length === 10 ? `${iso}T23:59` : iso).getTime() : NaN);

  // ---- weeks: same semester basis as Journal Archive (journal.js) / Assignment
  // Manage (server/db.js) — if the semester start ever changes, update all three.
  const SEMESTER_START_MS = new Date(2026, 8, 7).getTime(); // 2026-09-07
  const weekOf = ms => Math.max(1, Math.floor((ms - SEMESTER_START_MS) / 86400000 / 7) + 1);
  const weekRangeLabel = n => {
    const md = ms => { const d = new Date(ms); return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };
    const start = SEMESTER_START_MS + (n - 1) * 7 * 86400000;
    return `Week ${String(n).padStart(2, '0')} (${md(start)}~${md(start + 6 * 86400000)})`;
  };

  // ---- courses: one list, one order, used everywhere ----
  const COURSES = [
    ['AL', 'Aesthetic Literacy'], ['AOR', 'Art of Reading'], ['BI', 'Beautiful Interface'],
    ['EWA', 'Engaging with AI'], ['IAE', 'Interviewing as Exploration'], ['IPS', 'Iterative Problem Solving'],
    ['PC', 'Peer Coaching'], ['RW', 'Readable Writing'], ['SI', 'Self Introduction'],
    ['TF', 'Typography as Foundation'], ['VT', 'Visual Translation'], ['WI', 'What If'],
  ];
  // other spellings resolve to an existing course — never a course of their own
  const ALIASES = { EAI: 'EWA' };
  const courseName = code => COURSES.find(c => c[0] === code)?.[1] || '';

  // ---- floating cards come in from a blur and leave into one (shared with journal.js) ----
  const popIn = el => {
    el.getAnimations().forEach(a => a.cancel());
    el.dataset.open = '1'; // a late finish from an earlier close must not hide it again
    el.hidden = false;
    if (!reduce.matches) el.animate(
      [{ opacity: 0, filter: 'blur(6px)', transform: 'translateY(-4px)' }, { opacity: 1, filter: 'blur(0px)', transform: 'none' }],
      { duration: 280, easing: EASE });
  };
  const popOut = el => {
    el.getAnimations().forEach(a => a.cancel());
    delete el.dataset.open;
    if (reduce.matches) { el.hidden = true; return; }
    el.animate([{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(6px)' }], { duration: 180, easing: EASE })
      .onfinish = () => { if (!el.dataset.open) el.hidden = true; };
  };

  // ---- memberships: 'unassigned' | 'general' | 'course:BI' | 'custom:<id>' ----
  // custom boxes are user-added (박스 추가) — same shape as a course box, but
  // with a plain name instead of a course code, and no Figma/board link.
  let BOX_KEYS = ['general', ...COURSES.map(c => `course:${c[0]}`)];
  const refreshBoxKeys = () => { BOX_KEYS = ['general', ...COURSES.map(c => `course:${c[0]}`), ...state.customBoxes.map(b => `custom:${b.id}`)]; };
  const customName = id => state.customBoxes.find(b => b.id === id)?.name || '';
  const isKey = k => k === 'unassigned' || BOX_KEYS.includes(k);
  const keyOf = item => (item.scope === 'course' ? `course:${item.courseId}` : item.scope === 'custom' ? `custom:${item.customId}` : item.scope);
  const scopeOf = key => (key.startsWith('course:') ? { scope: 'course', courseId: key.slice(7), customId: null }
    : key.startsWith('custom:') ? { scope: 'custom', courseId: null, customId: key.slice(7) }
    : { scope: key, courseId: null, customId: null });
  const shortLabel = key => (key === 'general' ? 'General' : key === 'unassigned' ? '임시' : key.startsWith('custom:') ? customName(key.slice(7)) : key.slice(7));
  const fullLabel = key => (key === 'general' ? 'General' : key === 'unassigned' ? '임시' : key.startsWith('custom:') ? customName(key.slice(7)) : `${key.slice(7)}_${courseName(key.slice(7))}`);
  const titleHTML = key => (key.startsWith('course:')
    ? `<span class="nav-code">${key.slice(7)}</span>_${courseName(key.slice(7))}`
    : `<span class="nav-code">${esc(shortLabel(key))}</span>`);
  const toPhrase = key => (key === 'unassigned' ? '임시로' : `${fullLabel(key)} 박스로`);
  const inPhrase = key => (key === 'unassigned' ? '임시에' : `${fullLabel(key)} 박스에`);

  // ---- store ----
  const KEY = 'phi-brain:future:v2';
  const V1_KEY = 'phi-brain:future-items'; // the temporary tab's shape — kept untouched as a backup
  const uid = () => `fi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const clone = o => JSON.parse(JSON.stringify(o));
  const newItem = (text, key, source = null, at = Date.now()) =>
    ({ id: uid(), text, ...scopeOf(key), done: false, doneAt: null, dueAt: null, createdAt: at, placedAt: at, updatedAt: at, source });
  const saneDue = v => (typeof v === 'string' && v) ? v : null;

  const sane = item => { const normalized = { ...item, courseId: ALIASES[item.courseId] || item.courseId, dueAt: saneDue(item.dueAt) }; return isKey(keyOf(normalized)) ? normalized : { ...normalized, scope: 'unassigned', courseId: null, customId: null }; }; // unknown course → 임시, text kept
  // sane custom-box list: only well-shaped {id,name} entries, deduped by id
  const saneCustomBoxes = list => Array.isArray(list)
    ? [...new Map(list.filter(b => b && typeof b.id === 'string' && typeof b.name === 'string' && b.name.trim())
        .map(b => [b.id, { id: b.id, name: b.name }])).values()]
    : [];
  // a board from anywhere (this browser, the server, an import) → a board this file can trust
  function normalizeBoard(s) {
    if (s && Array.isArray(s.items)) {
      const customBoxes = saneCustomBoxes(s.customBoxes);
      // BOX_KEYS hasn't been refreshed with these customBoxes yet (that
      // happens right after the board is swapped in) — validate against a local
      // key set instead of the shared isKey()/BOX_KEYS to avoid the order dependency.
      const knownKeys = new Set(['general', ...COURSES.map(c => `course:${c[0]}`), ...customBoxes.map(b => `custom:${b.id}`)]);
      const saneWithKeys = item => {
        const normalized = { ...item, courseId: ALIASES[item.courseId] || item.courseId, dueAt: saneDue(item.dueAt) };
        const key = normalized.scope === 'course' ? `course:${normalized.courseId}` : normalized.scope === 'custom' ? `custom:${normalized.customId}` : normalized.scope;
        return (key === 'unassigned' || knownKeys.has(key)) ? normalized : { ...normalized, scope: 'unassigned', courseId: null, customId: null };
      };
      return {
        items: s.items.map(saneWithKeys),
        favorites: [...new Set((s.favorites || []).map(k => k === 'course:EAI' ? 'course:EWA' : k))].filter(k => knownKeys.has(k)),
        customBoxes,
        boxOrder: Array.isArray(s.boxOrder) ? s.boxOrder.filter(k => typeof k === 'string') : [],
      };
    }
    return { items: [], favorites: [], customBoxes: [], boxOrder: [] };
  }
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.items)) return normalizeBoard(s);
    } catch { /* fall through to migration */ }
    // v1 → v2. Each v1 item already had exactly one course or none, so nothing is split or dropped.
    let v1 = [];
    try { v1 = JSON.parse(localStorage.getItem(V1_KEY)) || []; } catch { v1 = []; }
    const items = v1.map(o => {
      const at = Number(String(o.id).split('-')[3]) || Date.now();
      return {
        id: uid(), text: o.text, ...(o.course ? { scope: 'course', courseId: o.course } : { scope: 'unassigned', courseId: null }),
        done: !!o.done, doneAt: null, createdAt: at, placedAt: at, updatedAt: at,
        source: o.date ? { journalDate: o.date, text: o.text } : null,
      };
    }).map(sane);
    const s = { items, favorites: [], customBoxes: [], boxOrder: [] };
    if (items.length) persistState(s);
    return s;
  }
  function persistState(s) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 2, items: s.items, favorites: s.favorites, customBoxes: s.customBoxes, boxOrder: s.boxOrder })); return true; }
    catch { return false; }
  }
  let state = loadState();
  refreshBoxKeys();
  // where commit() saves: this browser by default; future-sync.js swaps in the server while signed in
  let backend = { save: persistState };
  const find = id => state.items.find(i => i.id === id);
  // the course/custom grid's display order: the user's saved preference, with
  // any box that isn't in it yet (a course, or a freshly-added custom box)
  // appended at the end in canonical order — always complete, never stale
  const gridOrder = () => {
    const valid = BOX_KEYS.filter(k => k !== 'general');
    const known = new Set(valid);
    const ordered = state.boxOrder.filter(k => known.has(k));
    const missing = valid.filter(k => !ordered.includes(k));
    return [...ordered, ...missing];
  };
  // sort-button helpers: 0 for an empty box sorts it last in both directions
  const lastPlaced = key => { const items = itemsIn(key); return items.length ? Math.max(...items.map(i => i.placedAt)) : 0; };
  const soonestDue = key => { const dues = itemsIn(key).filter(i => !i.done && i.dueAt).map(i => dueMs(i.dueAt)); return dues.length ? Math.min(...dues) : Infinity; };

  // apply → save; on failure put everything back and say so
  function commit(fn, { focus, retry } = {}) {
    const before = clone(state);
    const value = fn(state);
    if (backend.save(state)) { render(focus); return { ok: true, value }; }
    state = before;
    render(focus);
    toast('저장하지 못했어요. 바꾼 내용을 되돌렸어요.', { label: '다시 시도', run: retry || (() => commit(fn, { focus })) }, 'error');
    return { ok: false };
  }

  // ---- 되돌리기: 토스트의 "되돌리기" 버튼과 Ctrl+Z가 같은 것을 되돌린다 ----
  // 되돌릴 일이 생길 때마다 "원래대로 돌리는 함수"를 쌓아 둔다. 버튼으로 한 번 되돌린 걸
  // Ctrl+Z가 또 되돌리지 않도록 각 항목은 한 번만 실행된다(used).
  const undoStack = [];
  function undoable(run) {
    const entry = { used: false };
    entry.once = () => { if (entry.used) return false; entry.used = true; run(); return true; };
    undoStack.push(entry);
    if (undoStack.length > 30) undoStack.shift();
    return entry.once;
  }
  function undoLast() {
    while (undoStack.length) {
      const entry = undoStack.pop();
      if (entry.once()) { toast('되돌렸어요'); return; }
    }
    toast('되돌릴 게 없어요');
  }
  // Ctrl/⌘+Z — Future Item 화면에서만. 입력칸·본문 안에서는 브라우저의 글자 실행취소를 그대로 둔다
  addEventListener('keydown', e => {
    if ((e.key !== 'z' && e.key !== 'Z') || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
    if (currentView !== 'future') return;
    // 글자를 치는 칸에서는 브라우저의 글자 실행취소를 그대로 둔다. 체크박스·버튼처럼
    // 글자를 담지 않는 요소에 포커스가 있을 때는 우리 되돌리기가 동작해야 한다
    const el = document.activeElement;
    const typing = el && (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
      || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(el.type)));
    if (typing) return;
    e.preventDefault();
    undoLast();
  });

  // ---- UI state ----
  // 선택한 박스 필터들(복수 선택, 사용자 확정) — 빈 배열 = All. 순서는 누른 순서가
  // 아니라 늘 화면의 박스 순서로 정규화해 둔다(orderedFilters)
  let filters = [];
  let viewWeek = weekOf(Date.now()); // which week's items the grid/filters show; independent of the box filter
  let draftKey = 'unassigned'; // composer's membership; reset by each filter change
  let editingId = null;
  let editingBoxId = null; // custom box key being renamed
  let addingBox = false; // the "+ 박스 추가" tile is showing its name input
  const openDone = new Set(); // which 완료한 항목 areas are expanded (kept across re-renders)

  const view = $('#view-future'), filtersEl = $('#fi-filters'), listEl = $('#fi-list'), sortEl = $('#fi-sort'), sortBtn = $('#fi-sort-btn');
  const topRowSlot = $('#fi-top-row-slot');
  const weekPrevBtn = $('#fi-week-prev'), weekNextBtn = $('#fi-week-next'), weekLabelEl = $('#fi-week-label');
  const form = $('#fi-composer'), input = $('#fi-input'), scopeChipsEl = $('#fi-scope-chips');
  const menu = $('#fi-menu');

  // 항목이 속한 주차 — 저장값이 아니라 매번 계산한다(사용자 확정: 지난주에 못 한
  // 행동은 이번 주로 넘어오고, 지난주 화면에서는 사라진다).
  //   완료한 항목 = 완료한 주(doneAt; 예전 데이터처럼 없으면 만든 주)에 남는다
  //   미완료 항목 = 만든 주가 지났으면 늘 "이번 주"
  // 데이터를 옮겨 쓰지 않으니 마이그레이션도 없고, 지난주에 넘어온 항목을 이번 주에
  // 완료하면 이번 주 기록으로 남는다. 완료를 취소하면 다시 이번 주로 돌아온다.
  const itemWeek = i => (i.done
    ? weekOf(i.doneAt || i.createdAt)
    : Math.max(weekOf(i.createdAt), weekOf(Date.now())));
  const weekItems = () => state.items.filter(i => itemWeek(i) === viewWeek);
  const itemsIn = key => weekItems().filter(i => keyOf(i) === key);
  const openCount = f => weekItems().filter(i => !i.done && (f === 'all' || keyOf(i) === f)).length;
  const visibleUnder = key => !filters.length || filters.includes(key);

  // ---- render ----
  function renderWeekNav() {
    weekLabelEl.textContent = weekRangeLabel(viewWeek);
    weekPrevBtn.disabled = viewWeek <= 1;
    weekNextBtn.disabled = viewWeek >= weekOf(Date.now());
  }
  function renderFilters() {
    const f = k => {
      const n = openCount(k);
      const label = k === 'all' ? 'All' : shortLabel(k);
      const full = k === 'all' ? '전체' : k === 'general' ? 'General — 특정 과목이 아닌 항목' : k === 'unassigned' ? '임시 — 소속을 정하지 않은 항목' : fullLabel(k);
      return `<button type="button" class="pill fi-filter" data-filter="${k}"${k === 'all' ? '' : ` data-drop="${k}"`}`
        + ` aria-pressed="${k === 'all' ? !filters.length : filters.includes(k)}" title="${esc(full)}" aria-label="${esc(full)}, 미완료 ${n}개">`
        + `${label}${n ? `<span class="f-count" aria-hidden="true">${n}</span>` : ''}</button>`;
    };
    filtersEl.innerHTML = ['all', 'general', 'unassigned'].map(f).join('')
      + '<span class="tool-sep" aria-hidden="true"></span>'
      + BOX_KEYS.slice(1).map(f).join('');
  }

  // composer's membership chips — 다룬 과목 (Journaling) reused as a single-pick
  // row instead of a dropdown menu; the picked chip becomes the new item's box
  function renderScopeChips() {
    const opts = [['unassigned', '미지정'], ['general', 'General'], ...COURSES.map(([c]) => [`course:${c}`, c]), ...state.customBoxes.map(b => [`custom:${b.id}`, b.name])];
    scopeChipsEl.innerHTML = opts.map(([k, label]) => `<button type="button" class="pill" data-scope-chip="${k}" aria-pressed="${k === draftKey}" title="${esc(k === 'unassigned' ? '미지정 (임시로 추가)' : fullLabel(k))}">${esc(label)}</button>`).join('');
  }

  // pencil(수정)·시계(마감) — 삭제(✕)와 같은 .pill.pill-icon 스타일, currentColor
  // 더블클릭으로 수정·삭제는 ✕ 버튼 하나만 항상 보인다 — 펜·시계 아이콘은 없앴다.
  // 마감이 없는 항목은 수정 상태로 들어갔을 때만 우측에 + 버튼이 떠서 그걸로 새로
  // 붙인다(마감이 이미 있으면 아래 배지를 더블클릭해서 바꾼다, 수정 상태와 무관).
  const rowHTML = i => {
    const overdue = !i.done && i.dueAt && dueMs(i.dueAt) < Date.now();
    const editing = i.id === editingId;
    return `
    <li class="fi-row${i.done ? ' is-done' : ''}${overdue ? ' is-overdue' : ''}" data-id="${i.id}"${editing ? '' : ' draggable="true"'}>
      <div class="fi-row-main">
        <input type="checkbox" class="fi-check"${i.done ? ' checked' : ''} aria-label="${i.done ? '완료 취소' : '완료'}: ${esc(i.text)}">
        <span class="fi-num" aria-hidden="true"></span>
        ${editing
          ? `<textarea class="fi-edit" rows="1" aria-label="행동 문구 수정 — Enter 저장, Shift+Enter 줄바꿈, Esc 취소">${esc(i.text)}</textarea>`
          : `<span class="fi-text" title="더블클릭해서 수정">${esc(i.text)}</span>`}
        ${editing && !i.dueAt ? `<button type="button" class="pill pill-icon fi-due-add" aria-label="마감 추가: ${esc(i.text)}">+</button>` : ''}
        <button type="button" class="pill pill-icon fi-delete" aria-label="삭제: ${esc(i.text)}">✕</button>
      </div>
      ${i.dueAt ? `<span class="fi-due" title="더블클릭해서 수정">마감 ${dueLabel(i.dueAt)}</span>` : ''}
    </li>`;
  };

  function boxHTML(key, { forced = false } = {}) {
    const items = itemsIn(key).sort((a, b) => b.placedAt - a.placedAt);
    const open = items.filter(i => !i.done), done = items.filter(i => i.done);
    const temp = key === 'unassigned';
    // 임시/General live in the fixed top row, not the reorderable course grid —
    // they're never draggable and have no 즐겨찾기 별표(고정 자리라 즐겨찾기할
    // 대상이 아님)나 ⋯ 메뉴(과목은 이름바꾸기·삭제할 게 없고, 커스텀 박스만 있다).
    const inGrid = key !== 'unassigned' && key !== 'general';
    // 즐겨찾기 별표는 과목명 바로 왼쪽(사용자 지시 2026-09-19) — 누르면 박스가 맨 위 즐겨찾기 줄로 올라간다
    const isCustom = key.startsWith('custom:'), isFav = state.favorites.includes(key);
    const empty = open.length ? '' : `<p class="fi-box-empty">${
      done.length ? '남은 항목이 없어요.' : temp ? '소속을 정하지 않은 항목이 여기에 모여요.' : '아직 없어요. 위에서 실행할 행동을 추가해 보세요.'}</p>`;
    return `
      <section class="fi-box${temp ? ' is-temp' : ''}" data-box="${key}" data-drop="${key}" aria-label="${esc(temp ? '임시 — 소속 미지정' : fullLabel(key))}">
        <header class="fi-box-head"${inGrid ? ' draggable="true"' : ''}>
          ${inGrid ? '<span class="fi-box-grip" aria-hidden="true" title="끌어서 박스 순서 바꾸기">⠿</span>' : ''}
          ${inGrid ? `<button type="button" class="fi-box-fav fi-box-fav-lead${isFav ? ' is-fav' : ''}" data-box-fav="${key}" aria-pressed="${isFav}" aria-label="${isFav ? '즐겨찾기 해제' : '즐겨찾기'}: ${esc(shortLabel(key))}"></button>` : ''}
          ${key === editingBoxId
            ? `<input type="text" class="fi-box-name-edit" value="${esc(customName(key.slice(7)))}" aria-label="박스 이름 수정 — Enter 저장, Esc 취소" maxlength="24">`
            : `<h2 class="fi-box-title" title="${esc(temp ? '소속을 정하지 않은 항목' : fullLabel(key))}">${titleHTML(key)}</h2>`}
          <span class="resume-count" aria-label="미완료 ${open.length}개">${open.length}</span>
          ${inGrid && isCustom && key !== editingBoxId ? `<button type="button" class="pill pill-icon fi-box-more" data-box-menu="${key}" aria-haspopup="menu" aria-label="${esc(shortLabel(key))} 박스 메뉴">⋯</button>` : ''}
        </header>
        ${temp && (forced || open.length) ? '<p class="fi-box-hint">박스나 위 필터로 끌어다 놓아 자리를 정해 주세요.</p>' : ''}
        ${open.length ? `<ul class="fi-rows">${open.map(rowHTML).join('')}</ul>` : empty}
        ${done.length ? `
          <details class="fi-done" data-done="${key}"${openDone.has(key) ? ' open' : ''}>
            <summary class="fi-done-summary">완료한 항목 <span class="resume-count">${done.length}</span><span class="caret" aria-hidden="true">▾</span></summary>
            <div class="accordion-content"><ul class="fi-rows">${done.map(rowHTML).join('')}</ul></div>
          </details>` : ''}
      </section>`;
  }

  const addBoxTileHTML = () => (addingBox
    ? `<div class="fi-box fi-box-add is-editing"><input type="text" class="fi-box-add-input" placeholder="박스 이름" aria-label="새 박스 이름 — Enter 추가, Esc 취소" maxlength="24"></div>`
    : `<button type="button" class="fi-box fi-box-add" id="fi-box-add-btn">+ 박스 추가</button>`);

  function renderList() {
    [...$$('.fi-done', listEl), ...$$('.fi-done', topRowSlot)].forEach(d => (d.open ? openDone.add(d.dataset.done) : openDone.delete(d.dataset.done)));
    let html = '';
    if (filters.length) {
      // 고른 박스들만, 한 줄 최대 4개(.fi-list 4열 그대로) — 하나만 골라도 1/4 칸 고정
      html = filters.map(k => boxHTML(k, { forced: true })).join('');
      topRowSlot.innerHTML = '';
    } else {
      // General과 임시는 늘 이 상단 줄에 반반씩 — General은 "특정 과목이 아니라고
      // 정한" 항목이 모이는 곳, 임시는 아직 정하지 않은 항목이 모이는 곳이라
      // 둘 다 아래 과목 그리드(드래그로 순서 바꾸는 곳)에는 속하지 않는다. 필터·정렬
      // 줄보다 위, 작성 카드 바로 아래에 오도록 별도 슬롯에 그린다.
      topRowSlot.innerHTML = `<div class="fi-top-row">${boxHTML('general', { forced: true })}${boxHTML('unassigned', { forced: true })}</div>`;
      const order = gridOrder();
      const favs = order.filter(k => state.favorites.includes(k));
      const rest = order.filter(k => !state.favorites.includes(k));
      if (favs.length) html += `<p class="fi-section-label">즐겨찾기</p>${favs.map(k => boxHTML(k)).join('')}`;
      html += `${favs.length ? '<p class="fi-section-label">과목</p>' : ''}${rest.map(k => boxHTML(k)).join('')}${addBoxTileHTML()}`;
    }
    listEl.innerHTML = html;
    [...$$('.fi-done', listEl), ...$$('.fi-done', topRowSlot)].forEach(d => window.StyleKit?.createAccordion(d));
  }

  // 수정 칸(.fi-edit)은 한 줄로 시작해 Shift+Enter로 줄이 늘면 그만큼 키운다(사용자 지시 2026-09-16)
  const growEdit = el => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; };
  function render(focus) {
    renderWeekNav();
    renderFilters();
    renderList();
    if (sortEl) sortEl.hidden = filters.length > 0;
    renderScopeChips();
    if (editingId) { const e = $('.fi-edit', listEl); if (e) { growEdit(e); e.focus(); e.select(); } return; }
    if (editingBoxId) { const e = $('.fi-box-name-edit', listEl); if (e) { e.focus(); e.select(); } return; }
    if (addingBox) { const e = $('.fi-box-add-input', listEl); if (e) e.focus(); return; }
    if (focus) (typeof focus === 'function' ? focus() : $(focus, view))?.focus();
  }

  // ---- filters ----
  // 복수 선택은 쉼표로: #future-item/BI,AL,temp
  const keyToHashPart = f => (f === 'unassigned' ? 'temp' : f === 'general' ? 'general' : f.slice(7));
  const hashFor = fs => (fs.length ? `#future-item/${fs.map(keyToHashPart).join(',')}` : '#future-item');
  const hashPartToKey = raw => {
    const part = raw.toUpperCase();
    if (!part) return null;
    if (part === 'TEMP') return 'unassigned';
    if (part === 'GENERAL') return 'general';
    const code = ALIASES[part] || part;
    if (BOX_KEYS.includes(`course:${code}`)) return `course:${code}`;
    const custom = state.customBoxes.find(b => b.id.toUpperCase() === part || b.id === raw);
    return custom ? `custom:${custom.id}` : null;
  };
  const filterFromHash = h => (h.split('/')[1] || '').split(',').map(hashPartToKey).filter(Boolean);
  // 화면 순서(General·임시 → 과목/커스텀 그리드 순서)로 정렬 + 중복·모르는 키 제거
  const orderedFilters = fs => ['general', 'unassigned', ...gridOrder()].filter(k => fs.includes(k));
  function setFilters(fs, focusKey = null) {
    filters = orderedFilters(fs);
    // 새 행동의 기본 소속: 박스를 딱 하나 골랐을 때만 그 박스, 아니면 미지정
    draftKey = filters.length === 1 ? filters[0] : 'unassigned';
    editingId = null;
    if (currentView === 'future') history.replaceState(null, '', hashFor(filters));
    render(focusKey ? `.fi-filter[data-filter="${focusKey}"]` : null);
  }
  // pill 클릭: All은 선택 해제, 나머지는 켜고 끄기(마지막 하나를 끄면 All로 돌아간다)
  const toggleFilter = k => setFilters(k === 'all' ? [] : filters.includes(k) ? filters.filter(x => x !== k) : [...filters, k], k);

  // ---- actions ----
  function add(text, key, dueAt = null) {
    text = text.trim();
    if (!text) return false;
    viewWeek = weekOf(Date.now()); // a new item always belongs to this week — follow it there
    const r = commit(s => { const it = newItem(text, key); it.dueAt = dueAt; s.items.push(it); });
    if (r.ok && !visibleUnder(key)) toast(`${inPhrase(key)} 추가했어요`, { label: '보기', run: () => setFilters([key]) });
    return r.ok;
  }

  function move(id, key) {
    const item = find(id);
    if (!item || !isKey(key) || keyOf(item) === key) return; // same place → nothing happens
    const prev = { scope: item.scope, courseId: item.courseId, placedAt: item.placedAt, updatedAt: item.updatedAt };
    const stillHere = visibleUnder(key);
    const r = commit(s => {
      const it = s.items.find(i => i.id === id);
      const now = Date.now();
      Object.assign(it, scopeOf(key), { placedAt: now, updatedAt: now }); // arrives as the newest in its new box
    }, { focus: stillHere ? `[data-id="${id}"] .fi-delete` : null });
    if (!r.ok) return;
    const undo = undoable(() => commit(s => { const it = s.items.find(i => i.id === id); if (it) Object.assign(it, prev); },
      { focus: `[data-id="${id}"] .fi-delete` }));
    toast(`${toPhrase(key)} 옮겼어요`, { label: '되돌리기', run: undo }, '', !stillHere); // item left this view → hand keyboard focus to 되돌리기
  }

  function toggleDone(id) {
    const row = $(`.fi-row[data-id="${id}"]`, listEl);
    const item = find(id);
    if (!item) return;
    // keep keyboard focus nearby: finishing an item hands focus to its neighbour (or the 완료 area)
    const neighbour = item.done ? null : (row?.nextElementSibling || row?.previousElementSibling)?.dataset.id;
    const box = keyOf(item);
    const finishing = !item.done;
    const r = commit(s => {
      const it = s.items.find(i => i.id === id);
      it.done = !it.done;
      it.doneAt = it.done ? Date.now() : null; // order (placedAt) stays as it was
    }, {
      focus: item.done ? `[data-id="${id}"] .fi-check`
        : neighbour ? `[data-id="${neighbour}"] .fi-check` : `[data-done="${box}"] summary`,
    });
    if (!r.ok) return;
    const wasDoneAt = item.doneAt;
    undoable(() => commit(s => { const it = s.items.find(i => i.id === id); if (it) { it.done = !finishing; it.doneAt = wasDoneAt; } },
      { focus: `[data-id="${id}"] .fi-check` }));
    // 완료할 때만 알림(사용자 확정) — 완료 취소는 조용히. 저장 실패 시엔 commit이 이미 오류 토스트를 띄웠다
    if (finishing) toast(`${doneSubject(item.text)} 완료했어요`);
  }
  // "OOO를 완료했어요" — 긴 문장은 20자에서 줄이고, 조사(을/를)는 원문 마지막 글자의
  // 받침으로 고른다. 한글로 끝나지 않으면(영문·숫자 등) 받침을 알 수 없어 "을(를)".
  function doneSubject(text) {
    const t = text.trim(), last = t.charCodeAt(t.length - 1);
    const shown = [...t].length > 20 ? `${[...t].slice(0, 20).join('')}…` : t;
    const josa = last >= 0xAC00 && last <= 0xD7A3 ? ((last - 0xAC00) % 28 ? '을' : '를') : '을(를)';
    return shown + josa;
  }

  function saveEdit(id, value, cancel = false) {
    if (editingId !== id) return;
    editingId = null;
    const item = find(id), text = (value || '').trim();
    if (cancel || !item || !text || text === item.text) { render(`[data-id="${id}"] .fi-delete`); return; }
    commit(s => { const it = s.items.find(i => i.id === id); it.text = text; it.updatedAt = Date.now(); },
      { focus: `[data-id="${id}"] .fi-delete` });
  }

  // fi-rowdue-pop(아래)에서 날짜/시간을 고를 때마다 바로 호출된다 — 팝오버 자체는
  // 별도 상태라 render()가 지우지 않으니, 여기선 그냥 값만 반영하면 된다
  function setDue(id, value) {
    const item = find(id);
    const dueAt = saneDue(value) || null;
    if (!item || dueAt === item.dueAt) return;
    commit(s => { const it = s.items.find(i => i.id === id); it.dueAt = dueAt; it.updatedAt = Date.now(); },
      { focus: `[data-id="${id}"] .fi-delete` });
  }

  function remove(id) {
    const index = state.items.findIndex(i => i.id === id);
    if (index < 0) return;
    const copy = clone(state.items[index]);
    const r = commit(s => { s.items.splice(s.items.findIndex(i => i.id === id), 1); });
    if (!r.ok) return;
    const undo = undoable(() => commit(s => { if (!s.items.some(i => i.id === id)) s.items.splice(Math.min(index, s.items.length), 0, copy); },
      { focus: `[data-id="${id}"] .fi-delete` }));
    toast('삭제했어요', { label: '되돌리기', run: undo }, '', true);
  }

  function toggleFavorite(key) {
    commit(s => {
      const at = s.favorites.indexOf(key);
      at >= 0 ? s.favorites.splice(at, 1) : s.favorites.push(key); // new pins go to the end; pinned order never shuffles
    }, { focus: `[data-box-fav="${key}"]` }); // 별표는 박스와 함께 다른 줄로 옮겨 가니 포커스를 따라 보낸다
  }

  // ---- custom boxes (과목 섹션에 박스 추가) ----
  function addCustomBox(name) {
    // Enter commits → render() removes the focused input → its focusout calls
    // this again (still connected mid-removal); without this guard that second
    // call saved a duplicate box that only showed up on the next render.
    // Also stops Esc (cancelAddBox) from turning into an add the same way.
    if (!addingBox) return;
    name = name.trim();
    addingBox = false;
    if (!name) { render(); return; }
    const id = uid();
    // BOX_KEYS must know about the new box before commit's render() runs,
    // or gridOrder() would filter it straight back out as "unknown"
    const r = commit(s => {
      s.customBoxes.push({ id, name });
      s.boxOrder.push(`custom:${id}`);
      refreshBoxKeys();
    }, { focus: `[data-box="custom:${id}"] .fi-box-title` });
    if (!r.ok) refreshBoxKeys(); // roll back to match the reverted state
  }
  function cancelAddBox() { addingBox = false; render('#fi-box-add-btn'); }

  function renameCustomBox(key, value, cancel = false) {
    if (editingBoxId !== key) return;
    editingBoxId = null;
    const id = key.slice(7), box = state.customBoxes.find(b => b.id === id), name = (value || '').trim();
    if (cancel || !box || !name || name === box.name) { render(`[data-box="${key}"] .fi-box-more`); return; }
    commit(s => { const b = s.customBoxes.find(b => b.id === id); if (b) b.name = name; },
      { focus: `[data-box="${key}"] .fi-box-more` });
  }

  function deleteBox(key) {
    if (!key.startsWith('custom:')) return;
    const id = key.slice(7);
    const boxIdx = state.customBoxes.findIndex(b => b.id === id);
    if (boxIdx < 0) return;
    const boxCopy = clone(state.customBoxes[boxIdx]);
    const orderIdx = state.boxOrder.indexOf(key);
    const wasFav = state.favorites.includes(key);
    // items in a deleted box fall back to 임시, same as any other now-unknown scope (sane())
    const affected = state.items.filter(i => i.scope === 'custom' && i.customId === id)
      .map(i => ({ id: i.id, scope: i.scope, courseId: i.courseId, customId: i.customId }));
    if (filters.includes(key)) { filters = filters.filter(k => k !== key); draftKey = filters.length === 1 ? filters[0] : 'unassigned'; }
    const r = commit(s => {
      s.customBoxes.splice(s.customBoxes.findIndex(b => b.id === id), 1);
      s.boxOrder = s.boxOrder.filter(k => k !== key);
      s.favorites = s.favorites.filter(k => k !== key);
      s.items.forEach(i => { if (i.scope === 'custom' && i.customId === id) Object.assign(i, { scope: 'unassigned', courseId: null, customId: null }); });
      refreshBoxKeys();
    });
    if (!r.ok) { refreshBoxKeys(); return; }
    const undo = undoable(() => commit(s => {
        if (!s.customBoxes.some(b => b.id === id)) s.customBoxes.splice(Math.min(boxIdx, s.customBoxes.length), 0, boxCopy);
        if (orderIdx >= 0 && !s.boxOrder.includes(key)) s.boxOrder.splice(Math.min(orderIdx, s.boxOrder.length), 0, key);
        if (wasFav && !s.favorites.includes(key)) s.favorites.push(key);
        affected.forEach(a => { const it = s.items.find(i => i.id === a.id); if (it) Object.assign(it, { scope: a.scope, courseId: a.courseId, customId: a.customId }); });
      refreshBoxKeys();
    }));
    toast(`'${boxCopy.name}' 박스를 삭제했어요`, { label: '되돌리기', run: undo }, '', true);
  }

  // ---- reordering course/custom boxes (드래그로 순서 변경, 상하좌우 모두) ----
  // Direction comes from index comparison, not cursor position, so a drop
  // registers the same way whether the target sits left/right OR in a row
  // above/below — every drop simply relocates the box next to its target.
  function reorderBox(srcKey, targetKey) {
    if (srcKey === targetKey) return;
    const order = gridOrder();
    const srcIdx = order.indexOf(srcKey), tgtIdx = order.indexOf(targetKey);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const without = order.filter(k => k !== srcKey);
    const insertAt = without.indexOf(targetKey) + (srcIdx < tgtIdx ? 1 : 0);
    without.splice(insertAt, 0, srcKey);
    const prevOrder = [...state.boxOrder];
    // 새 자리로 미끄러져 들어가게(FLIP)
    flipBoxes(() => commit(s => { s.boxOrder = without; }, { focus: `[data-box="${srcKey}"] .fi-box-title` }));
    undoable(() => flipBoxes(() => commit(s => { s.boxOrder = prevOrder; }, { focus: `[data-box="${srcKey}"] .fi-box-title` })));
  }

  // ---- reordering activities within a box (드래그로 순서 변경) ----
  // Same trick as reorderBox, applied to placedAt instead of a boxOrder array:
  // there's no separate "manual order" field, so re-stamping every open item's
  // placedAt in the new order (strictly decreasing) both encodes the order and
  // keeps sorting by placedAt DESC working everywhere else unchanged.
  function reorderItem(srcId, targetId) {
    if (srcId === targetId) return;
    const src = find(srcId), target = find(targetId);
    if (!src || !target || src.done || target.done) return;
    const box = keyOf(src);
    if (keyOf(target) !== box) return;
    const order = itemsIn(box).filter(i => !i.done).sort((a, b) => b.placedAt - a.placedAt).map(i => i.id);
    const srcIdx = order.indexOf(srcId), tgtIdx = order.indexOf(targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const without = order.filter(id => id !== srcId);
    const insertAt = without.indexOf(targetId) + (srcIdx < tgtIdx ? 1 : 0);
    without.splice(insertAt, 0, srcId);
    const now = Date.now();
    const prevPlaced = order.map(id => [id, find(id)?.placedAt]);
    commit(s => { without.forEach((id, i) => { const it = s.items.find(x => x.id === id); if (it) it.placedAt = now - i; }); },
      { focus: `[data-id="${srcId}"] .fi-delete` });
    undoable(() => commit(s => { prevPlaced.forEach(([id, at]) => { const it = s.items.find(x => x.id === id); if (it && at != null) it.placedAt = at; }); },
      { focus: `[data-id="${srcId}"] .fi-delete` }));
  }

  // ---- sorting the whole course/custom grid at once (정렬 버튼) ----
  // A one-shot rearrangement, not a persistent "mode": it just rewrites
  // boxOrder, so the user can keep fine-tuning by drag afterward. Sorting
  // the flat order this way also keeps the 즐겨찾기/과목 split correctly
  // sub-sorted, since filtering an already-sorted array preserves order.
  function applySort(mode) {
    const cmp = {
      recent: (a, b) => lastPlaced(b) - lastPlaced(a),
      due: (a, b) => soonestDue(a) - soonestDue(b),
      alpha: (a, b) => fullLabel(a).localeCompare(fullLabel(b), 'ko'),
    }[mode];
    if (!cmp) return;
    commit(s => { s.boxOrder = gridOrder().sort(cmp); });
  }

  // ---- menus: box ⋯(커스텀 박스 전용: 이름바꾸기·삭제)와 정렬 메뉴가 하나의
  // 플로팅 카드를 공유한다. 항목(activity)은 더블클릭·✕·드래그로 다 되니
  // 별도 메뉴가 없다(item ⋯ 메뉴와 소속 선택 메뉴는 그래서 삭제됨) ----
  let menuAnchor = null;
  function openMenu(anchor, html) {
    menuAnchor = anchor;
    menu.innerHTML = html;
    const v = view.getBoundingClientRect(), a = anchor.getBoundingClientRect();
    menu.hidden = false; // measure
    const w = menu.offsetWidth;
    menu.style.top = `${a.bottom - v.top + 6}px`;
    menu.style.left = `${Math.max(0, Math.min(a.right - v.left - w, v.width - w))}px`;
    popIn(menu);
    $('.cm-item', menu)?.focus({ preventScroll: true });
  }
  function closeMenu(refocus = true) {
    if (!menuAnchor) return;
    const a = menuAnchor;
    menuAnchor = null;
    popOut(menu);
    if (refocus && a.isConnected) a.focus();
  }
  function openBoxMenu(btn, key) {
    openMenu(btn, `
      <button type="button" class="cm-item" role="menuitem" data-box-act="rename" data-box="${key}">이름 바꾸기</button>
      <div class="cm-sep" role="separator"></div>
      <button type="button" class="cm-item" role="menuitem" data-box-act="delete" data-box="${key}">삭제</button>`);
  }
  function openSortMenu(btn) {
    openMenu(btn, `
      <button type="button" class="cm-item" role="menuitem" data-sort-act="recent">최신 추가순</button>
      <button type="button" class="cm-item" role="menuitem" data-sort-act="due">마감 급한순</button>
      <button type="button" class="cm-item" role="menuitem" data-sort-act="alpha">알파벳순</button>`);
  }

  menu.addEventListener('click', e => {
    const b = e.target.closest('.cm-item');
    if (!b) return;
    if (b.dataset.boxAct) {
      const key = b.dataset.box;
      switch (b.dataset.boxAct) {
        case 'rename': closeMenu(false); editingBoxId = key; render(); break;
        case 'delete': closeMenu(false); deleteBox(key); break;
      }
      return;
    }
    if (b.dataset.sortAct) { closeMenu(false); applySort(b.dataset.sortAct); }
  });
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeMenu(); return; }
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const items = $$('.cm-item', menu), i = items.indexOf(document.activeElement);
    items[(i + step + items.length) % items.length].focus();
  });
  document.addEventListener('pointerdown', e => {
    if (menuAnchor && !menu.contains(e.target) && !menuAnchor.contains(e.target)) closeMenu(false);
  });

  // ---- composer ----
  // Enter submits explicitly (not via implicit form submission), except while the
  // Hangul IME is still composing — that Enter only commits the syllable.
  // Shift+Enter는 줄바꿈(사용자 지시 2026-09-16) — 기본 동작에 맡긴다
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    if (e.isComposing || e.keyCode === 229) return;
    form.requestSubmit();
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    // 마감 체크박스가 꺼져 있으면 날짜가 무엇이든 마감 없음 — 체크박스 자체가 신호
    const dueAt = dueEnable.checked ? (dueTimeValue ? `${dueDate}T${dueTimeValue}` : dueDate) : null;
    if (add(input.value, draftKey, dueAt)) {
      input.value = '';
      dueEnable.checked = false; dueDateField.hidden = true; dueTimeField.hidden = true;
      dueDate = todayIso(); renderDueDateLabel();
      dueTimeValue = ''; renderTimeLabel();
    }
    input.focus();
  });

  // ---- composer's own due-date picker — same calendar as Journaling's date
  // picker (identical .datepicker/.dp-* markup+CSS, no shared JS instance
  // since each is bound to its own ids), but every date is pickable, not
  // just past ones, since a deadline looks forward
  const dueDateField = $('#fi-due-date-field'), dueDateBtn = $('#fi-due-date-btn'), dueDateLabel = $('#fi-due-date-label');
  const dueDatepicker = $('#fi-due-datepicker'), dueDpGrid = $('#fi-due-dp-grid'), dueDpTitle = $('#fi-due-dp-title');
  const pad2 = n => String(n).padStart(2, '0');
  const isoDate = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayIso = () => isoDate(new Date());
  const dateFromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  let dueDate = todayIso();
  let dueViewY = 0, dueViewM = 0;
  function renderDueDateLabel() { dueDateLabel.textContent = dueLabel(dueDate); }
  function renderDuePicker(focusDate) {
    dueDpTitle.textContent = `${dueViewY}년 ${dueViewM + 1}월`;
    const lead = new Date(dueViewY, dueViewM, 1).getDay();
    const days = new Date(dueViewY, dueViewM + 1, 0).getDate();
    const focusable = focusDate || (dueDate.startsWith(`${dueViewY}-${pad2(dueViewM + 1)}`) ? dueDate : isoDate(new Date(dueViewY, dueViewM, 1)));
    const t = todayIso();
    let html = '<span></span>'.repeat(lead);
    for (let d = 1; d <= days; d++) {
      const date = `${dueViewY}-${pad2(dueViewM + 1)}-${pad2(d)}`;
      html += `<button type="button" class="dp-day" data-date="${date}" tabindex="${date === focusable ? 0 : -1}"`
        + `${date === dueDate ? ' aria-selected="true"' : ''}${date === t ? ' data-today' : ''}`
        + ` aria-label="${dueViewM + 1}월 ${d}일${date === t ? ', 오늘' : ''}">${d}</button>`;
    }
    dueDpGrid.innerHTML = html;
  }
  function openDuePicker() {
    const d = dateFromIso(dueDate);
    dueViewY = d.getFullYear(); dueViewM = d.getMonth();
    renderDuePicker();
    popIn(dueDatepicker);
    dueDateBtn.setAttribute('aria-expanded', 'true');
    dueDpGrid.querySelector('[tabindex="0"]')?.focus();
  }
  function closeDuePicker(refocus = true) {
    if (dueDatepicker.hidden || dueDateBtn.getAttribute('aria-expanded') === 'false') return;
    dueDateBtn.setAttribute('aria-expanded', 'false');
    if (refocus) dueDateBtn.focus();
    popOut(dueDatepicker);
  }
  function pickDueDate(date) { closeDuePicker(); dueDate = date; renderDueDateLabel(); if (!dueTimeValue) { dueTimeValue = DEFAULT_DUE_TIME; renderTimeLabel(); } }
  const stepDueMonth = n => { const d = new Date(dueViewY, dueViewM + n, 1); dueViewY = d.getFullYear(); dueViewM = d.getMonth(); renderDuePicker(); };
  dueDateBtn.addEventListener('click', () => (dueDatepicker.hidden ? openDuePicker() : closeDuePicker()));
  $('#fi-due-dp-prev').addEventListener('click', () => stepDueMonth(-1));
  $('#fi-due-dp-next').addEventListener('click', () => stepDueMonth(1));
  $('#fi-due-dp-today').addEventListener('click', () => pickDueDate(todayIso()));
  dueDpGrid.addEventListener('click', e => { const b = e.target.closest('.dp-day'); if (b) pickDueDate(b.dataset.date); });
  dueDpGrid.addEventListener('keydown', e => { // arrows move by day / week, across months
    const b = e.target.closest('.dp-day');
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!b || !step) return;
    e.preventDefault();
    const d = dateFromIso(b.dataset.date);
    d.setDate(d.getDate() + step);
    const next = isoDate(d);
    if (d.getMonth() !== dueViewM || d.getFullYear() !== dueViewY) { dueViewY = d.getFullYear(); dueViewM = d.getMonth(); }
    renderDuePicker(next);
    dueDpGrid.querySelector(`[data-date="${next}"]`)?.focus();
  });
  dueDatepicker.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeDuePicker(); } });
  document.addEventListener('pointerdown', e => { if (!dueDateField.contains(e.target)) closeDuePicker(false); });
  renderDueDateLabel();

  // ---- composer's own due-time picker — same card as the date picker
  // (.datepicker), but three scrollable columns (오전/오후, 시, 분) instead of
  // the browser's native time widget, which doesn't match the app at all
  const dueTimeField = $('#fi-due-time-field'), dueTimeBtn = $('#fi-due-time-btn'), dueTimeLabelEl = $('#fi-due-time-label');
  const dueTimepicker = $('#fi-due-timepicker');
  const tpMeridiemEl = $('#fi-due-tp-meridiem'), tpHourEl = $('#fi-due-tp-hour'), tpMinuteEl = $('#fi-due-tp-minute');
  const MINUTE_STEP = 1; // 분은 00~59 1분 단위(사용자 지시 2026-09-14, 예전 5분 단위)
  const DEFAULT_DUE_TIME = '23:59'; // 날짜만 고르면 시간은 일단 오후 11:59(사용자 지시 2026-09-14) — 시간 선택으로 바꾸거나 지우기로 뺄 수 있음
  let dueTimeValue = ''; // '' (no time picked) | 'HH:mm' 24h, matches dueAt's own time format
  const timeParts = v => { if (!v) return null; const [h, m] = v.split(':').map(Number); return { meridiem: h < 12 ? 'am' : 'pm', hour12: h % 12 || 12, minute: m }; };
  const to24h = (meridiem, hour12, minute) => `${pad2((hour12 % 12) + (meridiem === 'pm' ? 12 : 0))}:${pad2(minute)}`;
  const timeLabel = v => { const p = timeParts(v); return p ? `${p.meridiem === 'am' ? '오전' : '오후'} ${p.hour12}:${pad2(p.minute)}` : '시간 선택'; };
  function renderTimeLabel() { dueTimeLabelEl.textContent = timeLabel(dueTimeValue); }
  function renderTimePicker() {
    const p = timeParts(dueTimeValue);
    const cur = p || { meridiem: 'am', hour12: 12, minute: 0 }; // nothing picked yet → highlight noon as a neutral starting point
    tpMeridiemEl.innerHTML = [['am', '오전'], ['pm', '오후']]
      .map(([k, label]) => `<button type="button" class="cm-item" role="option" data-meridiem="${k}" aria-selected="${!!p && cur.meridiem === k}">${label}</button>`).join('');
    tpHourEl.innerHTML = Array.from({ length: 12 }, (_, i) => i + 1)
      .map(h => `<button type="button" class="cm-item" role="option" data-hour="${h}" aria-selected="${!!p && cur.hour12 === h}">${h}</button>`).join('');
    tpMinuteEl.innerHTML = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP)
      .map(m => `<button type="button" class="cm-item" role="option" data-minute="${m}" aria-selected="${!!p && cur.minute === m}">${pad2(m)}</button>`).join('');
  }
  function openTimePicker() {
    renderTimePicker();
    popIn(dueTimepicker);
    dueTimeBtn.setAttribute('aria-expanded', 'true');
    [tpMeridiemEl, tpHourEl, tpMinuteEl].forEach(col => col.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' }));
  }
  function closeTimePicker(refocus = true) {
    if (dueTimepicker.hidden || dueTimeBtn.getAttribute('aria-expanded') === 'false') return;
    dueTimeBtn.setAttribute('aria-expanded', 'false');
    if (refocus) dueTimeBtn.focus();
    popOut(dueTimepicker);
  }
  // picking one column fills the other two from their current (or default)
  // value instead of closing — the panel stays open until all three matter
  function setTimePart(kind, value) {
    const p = timeParts(dueTimeValue) || { meridiem: 'am', hour12: 12, minute: 0 };
    p[kind] = value;
    dueTimeValue = to24h(p.meridiem, p.hour12, p.minute);
    renderTimeLabel();
    renderTimePicker();
  }
  dueTimeBtn.addEventListener('click', () => (dueTimepicker.hidden ? openTimePicker() : closeTimePicker()));
  dueTimepicker.addEventListener('click', e => {
    const b = e.target.closest('[role="option"]');
    if (!b) return;
    if (b.dataset.meridiem) setTimePart('meridiem', b.dataset.meridiem);
    else if (b.dataset.hour) setTimePart('hour12', Number(b.dataset.hour));
    else if (b.dataset.minute !== undefined) setTimePart('minute', Number(b.dataset.minute));
  });
  $('#fi-due-time-clear').addEventListener('click', () => { dueTimeValue = ''; renderTimeLabel(); closeTimePicker(); });
  $('#fi-due-time-now').addEventListener('click', () => {
    const n = new Date();
    dueTimeValue = `${pad2(n.getHours())}:${pad2(Math.round(n.getMinutes() / MINUTE_STEP) * MINUTE_STEP % 60)}`;
    renderTimeLabel();
    closeTimePicker();
  });
  dueTimepicker.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeTimePicker(); } });
  document.addEventListener('pointerdown', e => { if (!dueTimeField.contains(e.target)) closeTimePicker(false); });
  renderTimeLabel();

  // ---- 행 마감 팝오버: 시계 아이콘을 누르면 뜨는, 이미 있는 항목 하나의 마감을
  // 고르는 창. 작성 카드의 .datepicker/.tp-col 컴포넌트·pad2/isoDate/todayIso/
  // dateFromIso/timeParts/to24h/timeLabel/MINUTE_STEP 순수 헬퍼는 그대로 재사용
  // 하고, 렌더 대상(그리드/라벨)과 상태(rowDueDate/rowDueTime)만 별도로 둔다 —
  // 골라질 때마다 setDue()로 바로 커밋되는, 네이티브 datetime-local 입력의 대체.
  const rowDuePop = $('#fi-rowdue-pop');
  const rowDueDateField = $('#fi-rowdue-date-field'), rowDueDateBtn = $('#fi-rowdue-date-btn'), rowDueDateLabel = $('#fi-rowdue-date-label');
  const rowDueDatepicker = $('#fi-rowdue-datepicker'), rowDueDpGrid = $('#fi-rowdue-dp-grid'), rowDueDpTitle = $('#fi-rowdue-dp-title');
  const rowDueTimeField = $('#fi-rowdue-time-field'), rowDueTimeBtn = $('#fi-rowdue-time-btn'), rowDueTimeLabelEl = $('#fi-rowdue-time-label');
  const rowDueTimepicker = $('#fi-rowdue-timepicker');
  const rowTpMeridiemEl = $('#fi-rowdue-tp-meridiem'), rowTpHourEl = $('#fi-rowdue-tp-hour'), rowTpMinuteEl = $('#fi-rowdue-tp-minute');
  let rowDueId = null; // item the popover is currently open for
  let rowDueDate = '', rowDueTime = ''; // '' date = 마감 없음
  let rowDueViewY = 0, rowDueViewM = 0;

  function rowDueCommitNow() {
    if (!rowDueId) return;
    setDue(rowDueId, rowDueDate ? (rowDueTime ? `${rowDueDate}T${rowDueTime}` : rowDueDate) : null);
  }
  function renderRowDueDateLabel() { rowDueDateLabel.textContent = rowDueDate ? dueLabel(rowDueDate) : '날짜 선택'; }
  function renderRowDuePicker(focusDate) {
    rowDueDpTitle.textContent = `${rowDueViewY}년 ${rowDueViewM + 1}월`;
    const lead = new Date(rowDueViewY, rowDueViewM, 1).getDay();
    const days = new Date(rowDueViewY, rowDueViewM + 1, 0).getDate();
    const focusable = focusDate || (rowDueDate.startsWith(`${rowDueViewY}-${pad2(rowDueViewM + 1)}`) ? rowDueDate : isoDate(new Date(rowDueViewY, rowDueViewM, 1)));
    const t = todayIso();
    let html = '<span></span>'.repeat(lead);
    for (let d = 1; d <= days; d++) {
      const date = `${rowDueViewY}-${pad2(rowDueViewM + 1)}-${pad2(d)}`;
      html += `<button type="button" class="dp-day" data-date="${date}" tabindex="${date === focusable ? 0 : -1}"`
        + `${date === rowDueDate ? ' aria-selected="true"' : ''}${date === t ? ' data-today' : ''}`
        + ` aria-label="${rowDueViewM + 1}월 ${d}일${date === t ? ', 오늘' : ''}">${d}</button>`;
    }
    rowDueDpGrid.innerHTML = html;
  }
  function openRowDueDatePicker() {
    const base = rowDueDate ? dateFromIso(rowDueDate) : new Date();
    rowDueViewY = base.getFullYear(); rowDueViewM = base.getMonth();
    renderRowDuePicker();
    popIn(rowDueDatepicker);
    rowDueDateBtn.setAttribute('aria-expanded', 'true');
    rowDueDpGrid.querySelector('[tabindex="0"]')?.focus();
  }
  function closeRowDueDatePicker(refocus = true) {
    if (rowDueDatepicker.hidden || rowDueDateBtn.getAttribute('aria-expanded') === 'false') return;
    rowDueDateBtn.setAttribute('aria-expanded', 'false');
    if (refocus) rowDueDateBtn.focus();
    popOut(rowDueDatepicker);
  }
  function pickRowDueDate(date) {
    closeRowDueDatePicker(); rowDueDate = date; renderRowDueDateLabel();
    if (!rowDueTime) { rowDueTime = DEFAULT_DUE_TIME; renderRowDueTimeLabel(); } // 날짜만 고르면 오후 11:59
    rowDueCommitNow();
  }
  function rowDueClear() { closeRowDueDatePicker(); rowDueDate = ''; rowDueTime = ''; renderRowDueDateLabel(); renderRowDueTimeLabel(); rowDueCommitNow(); }
  const stepRowDueMonth = n => { const d = new Date(rowDueViewY, rowDueViewM + n, 1); rowDueViewY = d.getFullYear(); rowDueViewM = d.getMonth(); renderRowDuePicker(); };
  rowDueDateBtn.addEventListener('click', () => (rowDueDatepicker.hidden ? openRowDueDatePicker() : closeRowDueDatePicker()));
  $('#fi-rowdue-dp-prev').addEventListener('click', () => stepRowDueMonth(-1));
  $('#fi-rowdue-dp-next').addEventListener('click', () => stepRowDueMonth(1));
  $('#fi-rowdue-dp-today').addEventListener('click', () => pickRowDueDate(todayIso()));
  $('#fi-rowdue-clear').addEventListener('click', () => rowDueClear());
  rowDueDpGrid.addEventListener('click', e => { const b = e.target.closest('.dp-day'); if (b) pickRowDueDate(b.dataset.date); });
  rowDueDpGrid.addEventListener('keydown', e => {
    const b = e.target.closest('.dp-day');
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!b || !step) return;
    e.preventDefault();
    const d = dateFromIso(b.dataset.date);
    d.setDate(d.getDate() + step);
    const next = isoDate(d);
    if (d.getMonth() !== rowDueViewM || d.getFullYear() !== rowDueViewY) { rowDueViewY = d.getFullYear(); rowDueViewM = d.getMonth(); }
    renderRowDuePicker(next);
    rowDueDpGrid.querySelector(`[data-date="${next}"]`)?.focus();
  });
  rowDueDatepicker.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeRowDueDatePicker(); } });

  function renderRowDueTimeLabel() { rowDueTimeLabelEl.textContent = timeLabel(rowDueTime); }
  function renderRowDueTimePicker() {
    const p = timeParts(rowDueTime);
    const cur = p || { meridiem: 'am', hour12: 12, minute: 0 };
    rowTpMeridiemEl.innerHTML = [['am', '오전'], ['pm', '오후']]
      .map(([k, label]) => `<button type="button" class="cm-item" role="option" data-meridiem="${k}" aria-selected="${!!p && cur.meridiem === k}">${label}</button>`).join('');
    rowTpHourEl.innerHTML = Array.from({ length: 12 }, (_, i) => i + 1)
      .map(h => `<button type="button" class="cm-item" role="option" data-hour="${h}" aria-selected="${!!p && cur.hour12 === h}">${h}</button>`).join('');
    rowTpMinuteEl.innerHTML = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP)
      .map(m => `<button type="button" class="cm-item" role="option" data-minute="${m}" aria-selected="${!!p && cur.minute === m}">${pad2(m)}</button>`).join('');
  }
  function openRowDueTimePicker() {
    renderRowDueTimePicker();
    popIn(rowDueTimepicker);
    rowDueTimeBtn.setAttribute('aria-expanded', 'true');
    [rowTpMeridiemEl, rowTpHourEl, rowTpMinuteEl].forEach(col => col.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' }));
  }
  function closeRowDueTimePicker(refocus = true) {
    if (rowDueTimepicker.hidden || rowDueTimeBtn.getAttribute('aria-expanded') === 'false') return;
    rowDueTimeBtn.setAttribute('aria-expanded', 'false');
    if (refocus) rowDueTimeBtn.focus();
    popOut(rowDueTimepicker);
  }
  function setRowDueTimePart(kind, value) {
    const p = timeParts(rowDueTime) || { meridiem: 'am', hour12: 12, minute: 0 };
    p[kind] = value;
    rowDueTime = to24h(p.meridiem, p.hour12, p.minute);
    renderRowDueTimeLabel();
    renderRowDueTimePicker();
    rowDueCommitNow();
  }
  rowDueTimeBtn.addEventListener('click', () => (rowDueTimepicker.hidden ? openRowDueTimePicker() : closeRowDueTimePicker()));
  rowDueTimepicker.addEventListener('click', e => {
    const b = e.target.closest('[role="option"]');
    if (!b) return;
    if (b.dataset.meridiem) setRowDueTimePart('meridiem', b.dataset.meridiem);
    else if (b.dataset.hour) setRowDueTimePart('hour12', Number(b.dataset.hour));
    else if (b.dataset.minute !== undefined) setRowDueTimePart('minute', Number(b.dataset.minute));
  });
  $('#fi-rowdue-time-clear').addEventListener('click', () => { rowDueTime = ''; renderRowDueTimeLabel(); closeRowDueTimePicker(); rowDueCommitNow(); });
  $('#fi-rowdue-time-now').addEventListener('click', () => {
    const n = new Date();
    rowDueTime = `${pad2(n.getHours())}:${pad2(Math.round(n.getMinutes() / MINUTE_STEP) * MINUTE_STEP % 60)}`;
    renderRowDueTimeLabel();
    closeRowDueTimePicker();
    rowDueCommitNow();
  });
  rowDueTimepicker.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeRowDueTimePicker(); } });

  function openRowDuePopover(btn, id) {
    const item = find(id);
    if (!item) return;
    closeMenu(false);
    rowDueId = id;
    rowDueDate = item.dueAt ? item.dueAt.slice(0, 10) : '';
    rowDueTime = item.dueAt && item.dueAt.length > 10 ? item.dueAt.slice(11, 16) : '';
    renderRowDueDateLabel();
    renderRowDueTimeLabel();
    closeRowDueDatePicker(false);
    closeRowDueTimePicker(false);
    const v = view.getBoundingClientRect(), a = btn.getBoundingClientRect();
    rowDuePop.hidden = false; // measure
    const w = rowDuePop.offsetWidth;
    rowDuePop.style.top = `${a.bottom - v.top + 6}px`;
    rowDuePop.style.left = `${Math.max(0, Math.min(a.left - v.left, v.width - w))}px`;
    popIn(rowDuePop);
  }
  function closeRowDuePopover() {
    if (!rowDueId) return;
    closeRowDueDatePicker(false);
    closeRowDueTimePicker(false);
    popOut(rowDuePop);
    rowDueId = null;
  }
  document.addEventListener('pointerdown', e => { if (!rowDueDateField.contains(e.target)) closeRowDueDatePicker(false); });
  document.addEventListener('pointerdown', e => { if (!rowDueTimeField.contains(e.target)) closeRowDueTimePicker(false); });
  document.addEventListener('pointerdown', e => {
    if (rowDueId && !rowDuePop.contains(e.target) && !e.target.closest('.fi-due-add') && !e.target.closest('.fi-due')) closeRowDuePopover();
  });
  rowDuePop.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeRowDuePopover(); } });

  // ---- 마감 켜기/끄기 — 체크 전에는 날짜/시간 선택창을 아예 숨겨서 "마감 없음"임을
  // 분명히 하고, 체크하면 그 순간 보이는 날짜(기본 오늘)+시간이 실제 마감이 된다
  const dueEnable = $('#fi-due-enable');
  dueEnable.addEventListener('change', () => {
    dueDateField.hidden = !dueEnable.checked;
    dueTimeField.hidden = !dueEnable.checked;
    if (dueEnable.checked && !dueTimeValue) { dueTimeValue = DEFAULT_DUE_TIME; renderTimeLabel(); } // 마감 켜면 오늘 · 오후 11:59로 시작
    if (!dueEnable.checked) { closeDuePicker(false); closeTimePicker(false); }
  });

  sortBtn.addEventListener('click', () => (menuAnchor === sortBtn ? closeMenu() : openSortMenu(sortBtn)));

  weekPrevBtn.addEventListener('click', () => { if (viewWeek > 1) { viewWeek--; render(); } });
  weekNextBtn.addEventListener('click', () => { if (viewWeek < weekOf(Date.now())) { viewWeek++; render(); } });

  // clicking a row's + / ✕ while its text is mid-edit would otherwise blur
  // .fi-edit first — that fires onListFocusout → saveEdit() → render(), which
  // wipes editingId and (for +) removes the very button being clicked before
  // the click event reaches it. Blocking mousedown's default focus-shift keeps
  // the input focused, so no blur/re-render happens before the click lands
  // (same fix as journal.js's course-chip buttons).
  view.addEventListener('mousedown', e => {
    if (e.target.closest('.fi-due-add') || e.target.closest('.fi-delete')) e.preventDefault();
  });

  // ---- list + filter clicks ----
  view.addEventListener('click', e => {
    const chip = e.target.closest('[data-scope-chip]');
    if (chip) { draftKey = chip.dataset.scopeChip; renderScopeChips(); input.focus(); return; }
    const f = e.target.closest('.fi-filter');
    if (f) { toggleFilter(f.dataset.filter); return; }
    const dueAddBtn = e.target.closest('.fi-due-add');
    if (dueAddBtn) {
      const id = dueAddBtn.closest('.fi-row').dataset.id;
      rowDueId === id && !rowDuePop.hidden ? closeRowDuePopover() : openRowDuePopover(dueAddBtn, id);
      return;
    }
    const del = e.target.closest('.fi-delete');
    if (del) { remove(del.closest('.fi-row').dataset.id); return; }
    const boxFav = e.target.closest('.fi-box-fav');
    if (boxFav) { toggleFavorite(boxFav.dataset.boxFav); return; }
    const boxMore = e.target.closest('.fi-box-more');
    if (boxMore) { menuAnchor === boxMore ? closeMenu() : openBoxMenu(boxMore, boxMore.dataset.boxMenu); return; }
    const addBtn = e.target.closest('#fi-box-add-btn');
    if (addBtn) { addingBox = true; render(); }
  });
  // 행동 텍스트를 더블클릭하면 그 자리에서 바로 수정 상태로 들어간다(마감이 없으면
  // 그 상태에서 우측에 뜨는 + 버튼으로 새로 정한다). 이미 붙은 마감 배지는 수정
  // 상태와 무관하게 그 자체를 더블클릭해서 바꾼다.
  function onListDblClick(e) {
    const text = e.target.closest('.fi-text');
    if (text) { editingId = text.closest('.fi-row').dataset.id; render(); return; }
    const due = e.target.closest('.fi-due');
    if (due) { openRowDuePopover(due, due.closest('.fi-row').dataset.id); }
  }
  // General/임시 live in their own #fi-top-row-slot, outside #fi-list, but their
  // rows (checkbox, edit, due, ⋯) need the exact same handling — attach each
  // listener to both containers rather than duplicating the logic.
  function onListChange(e) {
    const c = e.target.closest('.fi-check');
    if (c) toggleDone(c.closest('.fi-row').dataset.id);
  }
  function onListKeydown(e) {
    const ed = e.target.closest('.fi-edit');
    if (ed) {
      const id = ed.closest('.fi-row').dataset.id;
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); saveEdit(id, ed.value); } // Shift+Enter는 줄바꿈
      if (e.key === 'Enter' && e.shiftKey) setTimeout(() => growEdit(ed)); // 줄이 늘면 칸도 늘린다
      if (e.key === 'Escape') { e.preventDefault(); saveEdit(id, '', true); }
      return;
    }
    const boxName = e.target.closest('.fi-box-name-edit');
    if (boxName) {
      const key = boxName.closest('.fi-box').dataset.box;
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); renameCustomBox(key, boxName.value); }
      if (e.key === 'Escape') { e.preventDefault(); renameCustomBox(key, '', true); }
      return;
    }
    const addInput = e.target.closest('.fi-box-add-input');
    if (addInput) {
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); addCustomBox(addInput.value); }
      if (e.key === 'Escape') { e.preventDefault(); cancelAddBox(); }
    }
  }
  function onListFocusout(e) {
    const ed = e.target.closest('.fi-edit');
    if (ed && ed.isConnected) { saveEdit(ed.closest('.fi-row').dataset.id, ed.value); return; }
    const boxName = e.target.closest('.fi-box-name-edit');
    if (boxName && boxName.isConnected) { renameCustomBox(boxName.closest('.fi-box').dataset.box, boxName.value); return; }
    const addInput = e.target.closest('.fi-box-add-input');
    if (addInput && addInput.isConnected) addCustomBox(addInput.value);
  }
  [listEl, topRowSlot].forEach(el => {
    el.addEventListener('change', onListChange);
    el.addEventListener('keydown', onListKeydown);
    el.addEventListener('focusout', onListFocusout);
    el.addEventListener('dblclick', onListDblClick);
  });

  // ---- drag to change an item's membership (filters except All, boxes, 임시) ----
  let dragId = null;
  // ---- 박스 순서 바꾸기(상하좌우 — 그리드 자리는 결국 boxOrder의 인덱스 하나다) ----
  // 박스는 머리줄(⠿ 손잡이가 있는 줄)에서만 끌 수 있다. 예전엔 박스 전체가 draggable이라 본문
  // 아무 데나 잡아도 끌렸는데, 행 위에서 시작하면 행이 끌려 "박스 순서를 바꾸려다 행동이 다른
  // 박스로 들어가는" 일이 생겼다(사용자 제보 2026-09-18).
  let dragBoxKey = null;
  const clearDrag = () => {
    dragId = null;
    dragBoxKey = null;
    view.classList.remove('is-dragging', 'is-dragging-box');
    $$('.drop-ok, .drop-over, .is-drag-src, .box-drag-src, .box-drop-before, .box-drop-after, .row-drop-over', view)
      .forEach(el => el.classList.remove('drop-ok', 'drop-over', 'is-drag-src', 'box-drag-src', 'box-drop-before', 'box-drop-after', 'row-drop-over'));
  };
  // 순서가 바뀐 박스들이 새 자리로 미끄러져 들어간다(FLIP): 바꾸기 전 위치를 재두고, 다시 그린 뒤
  // 그 차이에서 0으로 애니메이션한다 — 무엇이 어디로 갔는지 눈으로 따라갈 수 있게
  function flipBoxes(run) {
    const before = new Map($$('.fi-box[data-box]', listEl).map(el => [el.dataset.box, el.getBoundingClientRect()]));
    run();
    if (reduce.matches) return;
    $$('.fi-box[data-box]', listEl).forEach(el => {
      const b = before.get(el.dataset.box);
      if (!b) return;
      const a = el.getBoundingClientRect();
      const dx = Math.round(b.left - a.left), dy = Math.round(b.top - a.top);
      if (!dx && !dy) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 320, easing: EASE });
    });
  }
  // 끌고 있는 박스가 목표보다 앞에 있으면 목표 뒤에, 뒤에 있으면 목표 앞에 꽂힌다(reorderBox와 같은
  // 규칙) — 그 자리를 칸 사이 틈의 세로 선으로 미리 보여준다
  const boxDropTarget = e => {
    const t = e.target.closest?.('.fi-box[data-box]');
    return t && listEl.contains(t) && t.dataset.box !== dragBoxKey ? t : null;
  };
  function markBoxTarget(t) {
    const order = gridOrder();
    const after = order.indexOf(dragBoxKey) < order.indexOf(t.dataset.box);
    $$('.box-drop-before, .box-drop-after', view).forEach(el => el !== t && el.classList.remove('box-drop-before', 'box-drop-after'));
    t.classList.toggle('box-drop-after', after);
    t.classList.toggle('box-drop-before', !after);
  }
  // dropping an item ON another row reorders within that row's box (only when
  // it's the same box the dragged item is already in and both are open items)
  const rowDropTarget = e => {
    const row = e.target.closest?.('.fi-row');
    if (!row || row.dataset.id === dragId) return null;
    const src = find(dragId), target = find(row.dataset.id);
    return src && target && !src.done && !target.done && keyOf(src) === keyOf(target) ? row : null;
  };
  view.addEventListener('dragstart', e => {
    closeRowDuePopover();
    const head = e.target.closest?.('.fi-box-head[draggable="true"]');
    if (head) { // 머리줄에서 시작 = 박스 순서 바꾸기
      if (e.target.closest('button, input') || addingBox || editingBoxId) { e.preventDefault(); return; }
      const box = head.closest('.fi-box');
      dragBoxKey = box.dataset.box;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
      // 끌리는 그림은 머리줄이 아니라 박스 전체 — 무엇을 옮기는지 분명하게
      const r = box.getBoundingClientRect();
      e.dataTransfer.setDragImage?.(box, e.clientX - r.left, e.clientY - r.top);
      view.classList.add('is-dragging-box');
      box.classList.add('box-drag-src');
      return;
    }
    const row = e.target.closest?.('.fi-row');
    if (row && !editingId) {
      dragId = row.dataset.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', find(dragId)?.text || '');
      const from = keyOf(find(dragId));
      view.classList.add('is-dragging');
      row.classList.add('is-drag-src');
      $$('[data-drop]', view).forEach(t => t.classList.toggle('drop-ok', t.dataset.drop !== from));
      return;
    }
    e.preventDefault(); // 그 밖의 곳(본문·빈 자리)에서는 아무것도 끌리지 않는다
  });
  view.addEventListener('dragover', e => {
    if (dragBoxKey) {
      const t = boxDropTarget(e);
      if (!t) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      markBoxTarget(t);
      return;
    }
    if (dragId) {
      const row = rowDropTarget(e);
      if (row) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        $$('.row-drop-over', view).forEach(el => el !== row && el.classList.remove('row-drop-over'));
        $$('.drop-over', view).forEach(el => el.classList.remove('drop-over'));
        row.classList.add('row-drop-over');
        return;
      }
    }
    const t = dragId && e.target.closest?.('[data-drop].drop-ok');
    if (!t) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    $$('.row-drop-over', view).forEach(el => el.classList.remove('row-drop-over'));
    $$('.drop-over', view).forEach(el => el !== t && el.classList.remove('drop-over'));
    t.classList.add('drop-over');
  });
  view.addEventListener('dragleave', e => {
    const t = e.target.closest?.('[data-drop]');
    if (t && !t.contains(e.relatedTarget)) t.classList.remove('drop-over', 'box-drop-before', 'box-drop-after');
    const row = e.target.closest?.('.fi-row');
    if (row && !row.contains(e.relatedTarget)) row.classList.remove('row-drop-over');
  });
  view.addEventListener('drop', e => {
    if (dragBoxKey) {
      const t = boxDropTarget(e);
      if (t) {
        e.preventDefault();
        const srcKey = dragBoxKey, targetKey = t.dataset.box;
        clearDrag();
        reorderBox(srcKey, targetKey);
        return;
      }
      clearDrag();
      return;
    }
    if (dragId) {
      const row = rowDropTarget(e);
      if (row) {
        e.preventDefault();
        const id = dragId;
        clearDrag();
        reorderItem(id, row.dataset.id);
        return;
      }
    }
    const t = dragId && e.target.closest?.('[data-drop].drop-ok');
    if (!t) return;
    e.preventDefault();
    const id = dragId;
    clearDrag();
    move(id, t.dataset.drop);
  });
  view.addEventListener('dragend', clearDrag);

  // ---- toast: undo / retry / where-it-went ----
  const toastEl = $('#toast'), toastMsg = $('.toast-msg', toastEl), toastBtn = $('.toast-act', toastEl), live = $('#toast-live');
  let toastTimer = 0, toastRun = null;
  function toast(message, action, kind = '', takeFocus = false) {
    toastMsg.textContent = message;
    toastRun = action?.run || null;
    toastBtn.hidden = !action;
    if (action) toastBtn.textContent = action.label;
    toastEl.classList.toggle('is-error', kind === 'error');
    live.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
    live.textContent = action ? `${message}. ${action.label} 가능` : message;
    popIn(toastEl);
    if (takeFocus && action) toastBtn.focus({ preventScroll: true });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, kind === 'error' ? 10000 : 6000);
  }
  function hideToast() { clearTimeout(toastTimer); toastRun = null; if (!toastEl.hidden) popOut(toastEl); }
  toastBtn.addEventListener('click', () => { const run = toastRun; hideToast(); run?.(); });

  // ---- journal → Future Item ----
  const future = {
    all: () => clone(state.items),
    /** entries: [{course, text}] from one journal date. Adds only lines not already registered
        from that journal (matched by their original text), so edits/moves made here survive. */
    register(date, entries) {
      let added = 0;
      const r = commit(s => {
        added = 0;
        const now = Date.now();
        entries.forEach((e, n) => {
          if (s.items.some(i => i.source?.journalDate === date && i.source?.text === e.text)) return;
          const code = ALIASES[e.course] || e.course;
          s.items.push(newItem(e.text, code === 'general' ? 'general' : code && BOX_KEYS.includes(`course:${code}`) ? `course:${code}` : 'unassigned',
            { journalDate: date, text: e.text }, now - n)); // keep the journal's line order: first line on top
          added++;
        });
      });
      return r.ok ? added : -1;
    },
  };

  // ---- view switch (only the built views; other nav tabs stay inert) ----
  const views = { journal: $('#view-journal'), future: view, assignment: $('#view-assignment'), 'journal-archive': $('#view-archive'), findings: $('#view-findings') };
  const navTabs = $$('.side-nav [data-view]');
  let currentView = 'future'; // 첫 화면(사용자 지시 2026-09-18)
  function show(name, { filter: f } = {}) {
    if (!views[name]) name = 'future';
    currentView = name;
    closeMenu(false);
    closeRowDuePopover();
    Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
    navTabs.forEach(t => {
      const on = t.dataset.view === name;
      t.classList.toggle('active', on);
      on ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current');
    });
    if (name === 'future') setFilters(f || filters); // 사이드바에서 들어오면(f 없음) 고르던 필터 유지
    // journal-archive/findings own their own hash (journal.js) — their filter
    // lives in the URL too, so don't clear it here before that module reads it
    else if (name !== 'journal-archive' && name !== 'findings') history.replaceState(null, '', location.pathname + location.search);
    if (!reduce.matches) views[name].animate(
      [{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)' }], { duration: 320, easing: EASE });
    // other view modules (assignment.js, ...) load after this and need to know
    // when they're shown — the hash is gone by then (replaceState above clears
    // it for every non-future view), so a DOM event is the only reliable signal.
    document.dispatchEvent(new CustomEvent('phibrain:view', { detail: { name } }));
  }
  navTabs.forEach(t => t.addEventListener('click', () => show(t.dataset.view)));

  // for future-sync.js (loads after auth.js): read the board, replace it, choose where saves go
  const futureStore = {
    snapshot: () => ({ items: clone(state.items), favorites: [...state.favorites], customBoxes: clone(state.customBoxes), boxOrder: [...state.boxOrder] }),
    localBoard: loadState, // this browser's own signed-out board (shown again after sign-out)
    replace(board) {
      undoStack.length = 0; // 다른 보드로 바뀌면 쌓아 둔 되돌리기는 더 이상 맞지 않는다
      state = normalizeBoard(board);
      refreshBoxKeys();
      render();
      document.dispatchEvent(new CustomEvent('phibrain:future-changed'));
    },
    useBackend(b) { backend = b || { save: persistState }; },
  };
  window.PhiBrain = { COURSES, ALIASES, future, futureStore, show, getCurrentView: () => currentView, ui: { popIn, popOut, toast } };
  // the hash is the address of a view/filter: first load, an edited URL, back/forward
  // (our own replaceState calls don't fire hashchange, so this never loops)
  const route = () => {
    const h = location.hash;
    const name = h.startsWith('#future-item') ? 'future' : h.startsWith('#assignment') ? 'assignment'
      : h.startsWith('#journal-archive') ? 'journal-archive' : h.startsWith('#findings') ? 'findings'
      : h.startsWith('#journal') ? 'journal' : 'future'; // 해시가 없으면 Future Item
    show(name, { filter: filterFromHash(h) });
  };
  addEventListener('hashchange', route);
  route();
})();
