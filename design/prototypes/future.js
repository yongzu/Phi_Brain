/*
  Future Items — concrete actions (Activity), managed like a to-do list.
  Flow: 빠르게 작성 → 과목별 분류 → 실행 → 완료.

  - Saved in this browser's localStorage only (key phi-brain:future:v2).
    There is no server, account or cross-device sync yet.
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
  const monthDay = s => { const [, m, d] = s.split('-').map(Number); return `${m}월 ${d}일`; };
  // dueAt is stored as whatever <input type="datetime-local"> gives (local
  // wall-clock time, no timezone) — parsed as local time for display/sorting too
  const dueLabel = iso => {
    if (!iso) return '';
    const [d, t] = iso.split('T');
    const [, m, day] = d.split('-').map(Number);
    return `${m}월 ${day}일${t ? ` ${t.slice(0, 5)}` : ''}`;
  };
  const dueMs = iso => (iso ? new Date(iso.length === 10 ? `${iso}T23:59` : iso).getTime() : NaN);

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
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.items)) {
        const customBoxes = saneCustomBoxes(s.customBoxes);
        // BOX_KEYS hasn't been refreshed with these customBoxes yet (that
        // happens right after loadState returns) — validate against a local
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
    if (persistState(state)) { render(focus); return { ok: true, value }; }
    state = before;
    render(focus);
    toast('저장하지 못했어요. 바꾼 내용을 되돌렸어요.', { label: '다시 시도', run: retry || (() => commit(fn, { focus })) }, 'error');
    return { ok: false };
  }

  // ---- UI state ----
  let filter = 'all';
  let draftKey = 'unassigned'; // composer's membership; reset by each filter change
  let editingId = null;
  let editingDueId = null; // item whose deadline is being set (mutually exclusive with editingId)
  let editingBoxId = null; // custom box key being renamed
  let addingBox = false; // the "+ 박스 추가" tile is showing its name input
  const openDone = new Set(); // which 완료한 항목 areas are expanded (kept across re-renders)

  const view = $('#view-future'), filtersEl = $('#fi-filters'), listEl = $('#fi-list'), sortEl = $('#fi-sort'), sortBtn = $('#fi-sort-btn');
  const form = $('#fi-composer'), input = $('#fi-input'), scopeChipsEl = $('#fi-scope-chips');
  const menu = $('#fi-menu');

  const itemsIn = key => state.items.filter(i => keyOf(i) === key);
  const openCount = f => state.items.filter(i => !i.done && (f === 'all' || keyOf(i) === f)).length;
  const visibleUnder = key => filter === 'all' || filter === key;

  // ---- render ----
  function renderFilters() {
    const f = k => {
      const n = openCount(k);
      const label = k === 'all' ? 'All' : shortLabel(k);
      const full = k === 'all' ? '전체' : k === 'general' ? 'General — 특정 과목이 아닌 항목' : k === 'unassigned' ? '임시 — 소속을 정하지 않은 항목' : fullLabel(k);
      return `<button type="button" class="pill fi-filter" data-filter="${k}"${k === 'all' ? '' : ` data-drop="${k}"`}`
        + ` aria-pressed="${k === filter}" title="${esc(full)}" aria-label="${esc(full)}, 미완료 ${n}개">`
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

  const rowHTML = i => {
    const overdue = !i.done && i.dueAt && dueMs(i.dueAt) < Date.now();
    return `
    <li class="fi-row${i.done ? ' is-done' : ''}${overdue ? ' is-overdue' : ''}" data-id="${i.id}"${i.id === editingId || i.id === editingDueId ? '' : ' draggable="true"'}>
      <input type="checkbox" class="fi-check"${i.done ? ' checked' : ''} aria-label="${i.done ? '완료 취소' : '완료'}: ${esc(i.text)}">
      ${i.id === editingId
        ? `<input type="text" class="fi-edit" value="${esc(i.text)}" aria-label="행동 문구 수정 — Enter 저장, Esc 취소">`
        : `<span class="fi-text">${esc(i.text)}</span>`}
      ${i.id === editingDueId
        ? `<input type="datetime-local" class="fi-due-edit" value="${esc(i.dueAt || '')}" aria-label="마감 시간 — Enter 저장, Esc 취소">`
        : i.dueAt ? `<span class="fi-due">마감 ${dueLabel(i.dueAt)}</span>` : ''}
      <button type="button" class="pill pill-icon fi-more" aria-haspopup="menu" aria-label="항목 메뉴: ${esc(i.text)}">⋯</button>
    </li>`;
  };

  function boxHTML(key, { forced = false } = {}) {
    const items = itemsIn(key).sort((a, b) => b.placedAt - a.placedAt);
    const open = items.filter(i => !i.done), done = items.filter(i => i.done);
    const temp = key === 'unassigned';
    // 임시/General live in the fixed top row, not the reorderable course grid —
    // they're never draggable and have no ⋯ menu (nothing to favorite/rename/delete).
    const inGrid = key !== 'unassigned' && key !== 'general';
    const empty = open.length ? '' : `<p class="fi-box-empty">${
      done.length ? '남은 항목이 없어요.' : temp ? '소속을 정하지 않은 항목이 여기에 모여요.' : '아직 없어요. 위에서 실행할 행동을 추가해 보세요.'}</p>`;
    return `
      <section class="fi-box${temp ? ' is-temp' : ''}" data-box="${key}" data-drop="${key}" draggable="${inGrid}" aria-label="${esc(temp ? '임시 — 소속 미지정' : fullLabel(key))}">
        <header class="fi-box-head">
          ${key === editingBoxId
            ? `<input type="text" class="fi-box-name-edit" value="${esc(customName(key.slice(7)))}" aria-label="박스 이름 수정 — Enter 저장, Esc 취소" maxlength="24">`
            : `<h2 class="fi-box-title" title="${esc(temp ? '소속을 정하지 않은 항목' : fullLabel(key))}">${titleHTML(key)}</h2>`}
          <span class="resume-count" aria-label="미완료 ${open.length}개">${open.length}</span>
          ${inGrid && key !== editingBoxId ? `<button type="button" class="pill pill-icon fi-box-more" data-box-menu="${key}" aria-haspopup="menu" aria-label="${esc(shortLabel(key))} 박스 메뉴">⋯</button>` : ''}
        </header>
        ${temp && (forced || open.length) ? '<p class="fi-box-hint">박스나 위 필터로 끌어다 놓거나, ⋯ 메뉴의 ‘소속 변경’으로 자리를 정해 주세요.</p>' : ''}
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
    $$('.fi-done', listEl).forEach(d => (d.open ? openDone.add(d.dataset.done) : openDone.delete(d.dataset.done)));
    let html = '';
    if (filter !== 'all') html = boxHTML(filter, { forced: true });
    else {
      // General과 임시는 늘 이 상단 줄에 반반씩 — General은 "특정 과목이 아니라고
      // 정한" 항목이 모이는 곳, 임시는 아직 정하지 않은 항목이 모이는 곳이라
      // 둘 다 아래 과목 그리드(드래그로 순서 바꾸는 곳)에는 속하지 않는다.
      html += `<div class="fi-top-row">${boxHTML('general', { forced: true })}${boxHTML('unassigned', { forced: true })}</div>`;
      const order = gridOrder();
      const favs = order.filter(k => state.favorites.includes(k));
      const rest = order.filter(k => !state.favorites.includes(k));
      if (favs.length) html += `<p class="fi-section-label">즐겨찾기</p>${favs.map(k => boxHTML(k)).join('')}`;
      html += `${favs.length ? '<p class="fi-section-label">과목</p>' : ''}${rest.map(k => boxHTML(k)).join('')}${addBoxTileHTML()}`;
    }
    listEl.innerHTML = html;
    $$('.fi-done', listEl).forEach(d => window.StyleKit?.createAccordion(d));
  }

  function render(focus) {
    renderFilters();
    renderList();
    if (sortEl) sortEl.hidden = filter !== 'all';
    renderScopeChips();
    if (editingId) { const e = $('.fi-edit', listEl); if (e) { e.focus(); e.select(); } return; }
    if (editingDueId) { const e = $('.fi-due-edit', listEl); if (e) e.focus(); return; }
    if (editingBoxId) { const e = $('.fi-box-name-edit', listEl); if (e) { e.focus(); e.select(); } return; }
    if (addingBox) { const e = $('.fi-box-add-input', listEl); if (e) e.focus(); return; }
    if (focus) (typeof focus === 'function' ? focus() : $(focus, view))?.focus();
  }

  // ---- filters ----
  const hashFor = f => (f === 'all' ? '#future-item' : `#future-item/${f === 'unassigned' ? 'temp' : f === 'general' ? 'general' : f.slice(7)}`);
  const filterFromHash = h => {
    const raw = h.split('/')[1] || '';
    const part = raw.toUpperCase();
    if (!part) return 'all';
    if (part === 'TEMP') return 'unassigned';
    if (part === 'GENERAL') return 'general';
    const code = ALIASES[part] || part;
    if (BOX_KEYS.includes(`course:${code}`)) return `course:${code}`;
    const custom = state.customBoxes.find(b => b.id.toUpperCase() === part || b.id === raw);
    return custom ? `custom:${custom.id}` : 'all';
  };
  function setFilter(f, focusFilter = false) {
    filter = f;
    draftKey = f === 'all' ? 'unassigned' : f; // default membership follows the filter
    editingId = null;
    if (currentView === 'future') history.replaceState(null, '', hashFor(f));
    render(focusFilter ? `.fi-filter[data-filter="${f}"]` : null);
  }

  // ---- actions ----
  function add(text, key, dueAt = null) {
    text = text.trim();
    if (!text) return false;
    const r = commit(s => { const it = newItem(text, key); it.dueAt = dueAt; s.items.push(it); });
    if (r.ok && !visibleUnder(key)) toast(`${inPhrase(key)} 추가했어요`, { label: '보기', run: () => setFilter(key) });
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
    }, { focus: stillHere ? `[data-id="${id}"] .fi-more` : null });
    if (!r.ok) return;
    toast(`${toPhrase(key)} 옮겼어요`, {
      label: '되돌리기',
      run: () => commit(s => { const it = s.items.find(i => i.id === id); if (it) Object.assign(it, prev); }, { focus: `[data-id="${id}"] .fi-more` }),
    }, '', !stillHere); // item left this view → hand keyboard focus to 되돌리기
  }

  function toggleDone(id) {
    const row = $(`.fi-row[data-id="${id}"]`, listEl);
    const item = find(id);
    if (!item) return;
    // keep keyboard focus nearby: finishing an item hands focus to its neighbour (or the 완료 area)
    const neighbour = item.done ? null : (row?.nextElementSibling || row?.previousElementSibling)?.dataset.id;
    const box = keyOf(item);
    commit(s => {
      const it = s.items.find(i => i.id === id);
      it.done = !it.done;
      it.doneAt = it.done ? Date.now() : null; // order (placedAt) stays as it was
    }, {
      focus: item.done ? `[data-id="${id}"] .fi-check`
        : neighbour ? `[data-id="${neighbour}"] .fi-check` : `[data-done="${box}"] summary`,
    });
  }

  function saveEdit(id, value, cancel = false) {
    if (editingId !== id) return;
    editingId = null;
    const item = find(id), text = (value || '').trim();
    if (cancel || !item || !text || text === item.text) { render(`[data-id="${id}"] .fi-more`); return; }
    commit(s => { const it = s.items.find(i => i.id === id); it.text = text; it.updatedAt = Date.now(); },
      { focus: `[data-id="${id}"] .fi-more` });
  }

  function setDue(id, value, cancel = false) {
    if (editingDueId !== id) return;
    editingDueId = null;
    const item = find(id);
    if (cancel || !item) { render(`[data-id="${id}"] .fi-more`); return; }
    const dueAt = saneDue(value) || null;
    if (dueAt === item.dueAt) { render(`[data-id="${id}"] .fi-more`); return; }
    commit(s => { const it = s.items.find(i => i.id === id); it.dueAt = dueAt; it.updatedAt = Date.now(); },
      { focus: `[data-id="${id}"] .fi-more` });
  }

  function remove(id) {
    const index = state.items.findIndex(i => i.id === id);
    if (index < 0) return;
    const copy = clone(state.items[index]);
    const r = commit(s => { s.items.splice(s.items.findIndex(i => i.id === id), 1); });
    if (!r.ok) return;
    toast('삭제했어요', {
      label: '되돌리기',
      run: () => commit(s => { if (!s.items.some(i => i.id === id)) s.items.splice(Math.min(index, s.items.length), 0, copy); },
        { focus: `[data-id="${id}"] .fi-more` }),
    }, '', true);
  }

  function toggleFavorite(key) {
    commit(s => {
      const at = s.favorites.indexOf(key);
      at >= 0 ? s.favorites.splice(at, 1) : s.favorites.push(key); // new pins go to the end; pinned order never shuffles
    }, { focus: `[data-box-menu="${key}"]` });
  }

  // ---- custom boxes (과목 섹션에 박스 추가) ----
  function addCustomBox(name) {
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
    if (filter === key) { filter = 'all'; draftKey = 'unassigned'; }
    const r = commit(s => {
      s.customBoxes.splice(s.customBoxes.findIndex(b => b.id === id), 1);
      s.boxOrder = s.boxOrder.filter(k => k !== key);
      s.favorites = s.favorites.filter(k => k !== key);
      s.items.forEach(i => { if (i.scope === 'custom' && i.customId === id) Object.assign(i, { scope: 'unassigned', courseId: null, customId: null }); });
      refreshBoxKeys();
    });
    if (!r.ok) { refreshBoxKeys(); return; }
    toast(`'${boxCopy.name}' 박스를 삭제했어요`, {
      label: '되돌리기',
      run: () => commit(s => {
        if (!s.customBoxes.some(b => b.id === id)) s.customBoxes.splice(Math.min(boxIdx, s.customBoxes.length), 0, boxCopy);
        if (orderIdx >= 0 && !s.boxOrder.includes(key)) s.boxOrder.splice(Math.min(orderIdx, s.boxOrder.length), 0, key);
        if (wasFav && !s.favorites.includes(key)) s.favorites.push(key);
        affected.forEach(a => { const it = s.items.find(i => i.id === a.id); if (it) Object.assign(it, { scope: a.scope, courseId: a.courseId, customId: a.customId }); });
        refreshBoxKeys();
      }),
    }, '', true);
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
    commit(s => { s.boxOrder = without; }, { focus: `[data-box="${srcKey}"] .fi-box-title` });
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

  // ---- menus (item ⋯ and membership picker share one floating card) ----
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
  const scopeListHTML = (current, { unassignedLabel }) =>
    [['unassigned', unassignedLabel], ['general', 'General'], ...COURSES.map(([c, n]) => [`course:${c}`, `<span class="nav-code">${c}</span>_${n}`]),
      ...state.customBoxes.map(b => [`custom:${b.id}`, esc(b.name)])]
      .map(([k, label]) => `<button type="button" class="cm-item" role="menuitemradio" data-key="${k}" aria-checked="${k === current}">${label}</button>`)
      .join('');

  let pickScope = null; // what a membership pick does for the open menu
  function openScopeMenu(anchor, current, onPick, unassignedLabel) {
    pickScope = onPick;
    openMenu(anchor, `<p class="cm-head">소속</p>${scopeListHTML(current, { unassignedLabel })}`);
    $('.cm-item[aria-checked="true"]', menu)?.focus({ preventScroll: true });
  }
  function openBoxMenu(btn, key) {
    const fav = state.favorites.includes(key), isCustom = key.startsWith('custom:');
    pickScope = null;
    openMenu(btn, `
      <button type="button" class="cm-item" role="menuitem" data-box-act="fav" data-box="${key}">${fav ? '즐겨찾기 해제' : '즐겨찾기'}</button>
      ${isCustom ? `<button type="button" class="cm-item" role="menuitem" data-box-act="rename" data-box="${key}">이름 바꾸기</button>
      <div class="cm-sep" role="separator"></div>
      <button type="button" class="cm-item" role="menuitem" data-box-act="delete" data-box="${key}">삭제</button>` : ''}`);
  }
  function openSortMenu(btn) {
    pickScope = null;
    openMenu(btn, `
      <button type="button" class="cm-item" role="menuitem" data-sort-act="recent">최신 추가순</button>
      <button type="button" class="cm-item" role="menuitem" data-sort-act="due">마감 급한순</button>
      <button type="button" class="cm-item" role="menuitem" data-sort-act="alpha">알파벳순</button>`);
  }
  function openItemMenu(btn) {
    const id = btn.closest('.fi-row').dataset.id, item = find(id);
    if (!item) return;
    pickScope = null;
    openMenu(btn, `
      <button type="button" class="cm-item" role="menuitem" data-act="edit" data-id="${id}">수정</button>
      <button type="button" class="cm-item" role="menuitem" data-act="due" data-id="${id}">${item.dueAt ? '마감 변경' : '마감 설정'} ${item.dueAt ? `<span class="cm-note">${dueLabel(item.dueAt)}</span>` : ''}</button>
      <button type="button" class="cm-item" role="menuitem" data-act="scope" data-id="${id}">소속 변경 <span class="cm-note">${esc(shortLabel(keyOf(item)))}</span></button>
      ${item.source?.journalDate ? `<button type="button" class="cm-item" role="menuitem" data-act="journal" data-id="${id}">원문 저널 열기 <span class="cm-note">${monthDay(item.source.journalDate)}</span></button>` : ''}
      <div class="cm-sep" role="separator"></div>
      <button type="button" class="cm-item" role="menuitem" data-act="delete" data-id="${id}">삭제</button>`);
  }

  menu.addEventListener('click', e => {
    const b = e.target.closest('.cm-item');
    if (!b) return;
    if (b.dataset.key) { const run = pickScope; closeMenu(!run?.keepFocus); run?.(b.dataset.key); return; }
    if (b.dataset.boxAct) {
      const key = b.dataset.box;
      switch (b.dataset.boxAct) {
        case 'fav': closeMenu(false); toggleFavorite(key); break;
        case 'rename': closeMenu(false); editingBoxId = key; render(); break;
        case 'delete': closeMenu(false); deleteBox(key); break;
      }
      return;
    }
    if (b.dataset.sortAct) { closeMenu(false); applySort(b.dataset.sortAct); return; }
    const id = b.dataset.id, anchor = menuAnchor;
    switch (b.dataset.act) {
      case 'edit': closeMenu(false); editingId = id; render(); break;
      case 'due': closeMenu(false); editingDueId = id; render(); break;
      case 'scope': {
        const pick = key => move(id, key);
        pick.keepFocus = true;
        openScopeMenu(anchor, keyOf(find(id)), pick, '임시 (미지정)');
        break;
      }
      case 'journal': closeMenu(false); window.PhiBrain.openJournal?.(find(id).source.journalDate); break;
      case 'delete': closeMenu(false); remove(id); break;
    }
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
  // Hangul IME is still composing — that Enter only commits the syllable
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (e.isComposing || e.keyCode === 229) return;
    form.requestSubmit();
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    // date defaults to today and stays silent; a due date only attaches once
    // the user actually changes something — a time, or the date itself
    const dueAt = dueTimeValue ? `${dueDate}T${dueTimeValue}` : (dueDate !== todayIso() ? dueDate : null);
    if (add(input.value, draftKey, dueAt)) {
      input.value = '';
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
  function pickDueDate(date) { closeDuePicker(); dueDate = date; renderDueDateLabel(); }
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
  const MINUTE_STEP = 5;
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

  sortBtn.addEventListener('click', () => (menuAnchor === sortBtn ? closeMenu() : openSortMenu(sortBtn)));

  // ---- list + filter clicks ----
  view.addEventListener('click', e => {
    const chip = e.target.closest('[data-scope-chip]');
    if (chip) { draftKey = chip.dataset.scopeChip; renderScopeChips(); input.focus(); return; }
    const f = e.target.closest('.fi-filter');
    if (f) { setFilter(f.dataset.filter, true); return; }
    const more = e.target.closest('.fi-more');
    if (more) { menuAnchor === more ? closeMenu() : openItemMenu(more); return; }
    const boxMore = e.target.closest('.fi-box-more');
    if (boxMore) { menuAnchor === boxMore ? closeMenu() : openBoxMenu(boxMore, boxMore.dataset.boxMenu); return; }
    const addBtn = e.target.closest('#fi-box-add-btn');
    if (addBtn) { addingBox = true; render(); }
  });
  listEl.addEventListener('change', e => {
    const c = e.target.closest('.fi-check');
    if (c) toggleDone(c.closest('.fi-row').dataset.id);
  });
  listEl.addEventListener('keydown', e => {
    const ed = e.target.closest('.fi-edit');
    if (ed) {
      const id = ed.closest('.fi-row').dataset.id;
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); saveEdit(id, ed.value); }
      if (e.key === 'Escape') { e.preventDefault(); saveEdit(id, '', true); }
      return;
    }
    const due = e.target.closest('.fi-due-edit');
    if (due) {
      const id = due.closest('.fi-row').dataset.id;
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); setDue(id, due.value); }
      if (e.key === 'Escape') { e.preventDefault(); setDue(id, '', true); }
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
  });
  listEl.addEventListener('focusout', e => {
    const ed = e.target.closest('.fi-edit');
    if (ed && ed.isConnected) { saveEdit(ed.closest('.fi-row').dataset.id, ed.value); return; }
    const due = e.target.closest('.fi-due-edit');
    if (due && due.isConnected) { setDue(due.closest('.fi-row').dataset.id, due.value); return; }
    const boxName = e.target.closest('.fi-box-name-edit');
    if (boxName && boxName.isConnected) { renameCustomBox(boxName.closest('.fi-box').dataset.box, boxName.value); return; }
    const addInput = e.target.closest('.fi-box-add-input');
    if (addInput && addInput.isConnected) addCustomBox(addInput.value);
  });

  // ---- drag to change an item's membership (filters except All, boxes, 임시) ----
  let dragId = null;
  // ---- drag to reorder course/custom boxes themselves (상하좌우 — a grid position
  // is just an index, so moving one entry in boxOrder relocates it any direction) ----
  let dragBoxKey = null;
  const clearDrag = () => {
    dragId = null;
    dragBoxKey = null;
    view.classList.remove('is-dragging', 'is-dragging-box');
    $$('.drop-ok, .drop-over, .is-drag-src, .box-drag-src, .box-drop-over', view)
      .forEach(el => el.classList.remove('drop-ok', 'drop-over', 'is-drag-src', 'box-drag-src', 'box-drop-over'));
  };
  view.addEventListener('dragstart', e => {
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
    const box = e.target.closest?.('.fi-box[draggable="true"]');
    if (box && !addingBox && !e.target.closest('button, input, .fi-done')) {
      dragBoxKey = box.dataset.box;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
      view.classList.add('is-dragging-box');
      box.classList.add('box-drag-src');
    }
  });
  view.addEventListener('dragover', e => {
    if (dragBoxKey) {
      const t = e.target.closest?.('.fi-box[draggable="true"]');
      if (!t || t.dataset.box === dragBoxKey) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      $$('.box-drop-over', view).forEach(el => el !== t && el.classList.remove('box-drop-over'));
      t.classList.add('box-drop-over');
      return;
    }
    const t = dragId && e.target.closest?.('[data-drop].drop-ok');
    if (!t) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    $$('.drop-over', view).forEach(el => el !== t && el.classList.remove('drop-over'));
    t.classList.add('drop-over');
  });
  view.addEventListener('dragleave', e => {
    const t = e.target.closest?.('[data-drop]');
    if (t && !t.contains(e.relatedTarget)) t.classList.remove('drop-over', 'box-drop-over');
  });
  view.addEventListener('drop', e => {
    if (dragBoxKey) {
      const t = e.target.closest?.('.fi-box[draggable="true"]');
      if (t && t.dataset.box !== dragBoxKey) {
        e.preventDefault();
        const srcKey = dragBoxKey;
        clearDrag();
        reorderBox(srcKey, t.dataset.box);
        return;
      }
      clearDrag();
      return;
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
  const views = { journal: $('#view-journal'), future: view, assignment: $('#view-assignment') };
  const navTabs = $$('.side-nav [data-view]');
  let currentView = 'journal';
  function show(name, { filter: f } = {}) {
    if (!views[name]) name = 'journal';
    currentView = name;
    closeMenu(false);
    Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
    navTabs.forEach(t => {
      const on = t.dataset.view === name;
      t.classList.toggle('active', on);
      on ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current');
    });
    if (name === 'future') setFilter(f || filter);
    else history.replaceState(null, '', location.pathname + location.search);
    if (!reduce.matches) views[name].animate(
      [{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)' }], { duration: 320, easing: EASE });
    // other view modules (assignment.js, ...) load after this and need to know
    // when they're shown — the hash is gone by then (replaceState above clears
    // it for every non-future view), so a DOM event is the only reliable signal.
    document.dispatchEvent(new CustomEvent('phibrain:view', { detail: { name } }));
  }
  navTabs.forEach(t => t.addEventListener('click', () => show(t.dataset.view)));

  window.PhiBrain = { COURSES, ALIASES, future, show, getCurrentView: () => currentView, ui: { popIn, popOut, toast } };
  // the hash is the address of a view/filter: first load, an edited URL, back/forward
  // (our own replaceState calls don't fire hashchange, so this never loops)
  const route = () => {
    const h = location.hash;
    const name = h.startsWith('#future-item') ? 'future' : h.startsWith('#assignment') ? 'assignment' : 'journal';
    show(name, { filter: filterFromHash(h) });
  };
  addEventListener('hashchange', route);
  route();
})();
