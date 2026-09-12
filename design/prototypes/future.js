/*
  Future Items — concrete actions (Activity), managed like a to-do list.
  Flow: 빠르게 작성 → 과목별 분류 → 실행 → 완료.

  - Saved in this browser's localStorage only (key phi-brain:future:v2).
    There is no server, account or cross-device sync yet.
  - One membership per item: a course, General, or 임시 (unassigned).
    General = "decided: belongs to no course"; 임시 = "not decided yet".
    They are separate scopes, not fake courses.
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

  // ---- memberships: 'unassigned' | 'general' | 'course:BI' ----
  const BOX_KEYS = ['general', ...COURSES.map(c => `course:${c[0]}`)];
  const isKey = k => k === 'unassigned' || BOX_KEYS.includes(k);
  const keyOf = item => (item.scope === 'course' ? `course:${item.courseId}` : item.scope);
  const scopeOf = key => (key.startsWith('course:') ? { scope: 'course', courseId: key.slice(7) } : { scope: key, courseId: null });
  const shortLabel = key => (key === 'general' ? 'General' : key === 'unassigned' ? '임시' : key.slice(7));
  const fullLabel = key => (key === 'general' ? 'General' : key === 'unassigned' ? '임시' : `${key.slice(7)}_${courseName(key.slice(7))}`);
  const titleHTML = key => (key.startsWith('course:')
    ? `<span class="nav-code">${key.slice(7)}</span>_${courseName(key.slice(7))}`
    : `<span class="nav-code">${shortLabel(key)}</span>`);
  const toPhrase = key => (key === 'unassigned' ? '임시로' : `${fullLabel(key)} 박스로`);
  const inPhrase = key => (key === 'unassigned' ? '임시에' : `${fullLabel(key)} 박스에`);

  // ---- store ----
  const KEY = 'phi-brain:future:v2';
  const V1_KEY = 'phi-brain:future-items'; // the temporary tab's shape — kept untouched as a backup
  const uid = () => `fi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const clone = o => JSON.parse(JSON.stringify(o));
  const newItem = (text, key, source = null, at = Date.now()) =>
    ({ id: uid(), text, ...scopeOf(key), done: false, doneAt: null, createdAt: at, placedAt: at, updatedAt: at, source });

  const sane = item => { const normalized = { ...item, courseId: ALIASES[item.courseId] || item.courseId }; return isKey(keyOf(normalized)) ? normalized : { ...normalized, scope: 'unassigned', courseId: null }; }; // unknown course → 임시, text kept
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.items)) return { items: s.items.map(sane), favorites: [...new Set((s.favorites || []).map(k => k === 'course:EAI' ? 'course:EWA' : k))].filter(k => BOX_KEYS.includes(k)) };
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
    const s = { items, favorites: [] };
    if (items.length) persistState(s);
    return s;
  }
  function persistState(s) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 2, items: s.items, favorites: s.favorites })); return true; }
    catch { return false; }
  }
  let state = loadState();
  const find = id => state.items.find(i => i.id === id);

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
  const openDone = new Set(); // which 완료한 항목 areas are expanded (kept across re-renders)

  const view = $('#view-future'), filtersEl = $('#fi-filters'), listEl = $('#fi-list');
  const form = $('#fi-composer'), input = $('#fi-input'), scopeBtn = $('#fi-scope'), scopeLabel = $('#fi-scope-label');
  const menu = $('#fi-menu');

  const itemsIn = key => state.items.filter(i => keyOf(i) === key);
  const openCount = f => state.items.filter(i => !i.done && (f === 'all' || keyOf(i) === f)).length;
  const lastPlaced = key => Math.max(0, ...itemsIn(key).map(i => i.placedAt));
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

  const rowHTML = i => `
    <li class="fi-row${i.done ? ' is-done' : ''}" data-id="${i.id}"${i.id === editingId ? '' : ' draggable="true"'}>
      <input type="checkbox" class="fi-check"${i.done ? ' checked' : ''} aria-label="${i.done ? '완료 취소' : '완료'}: ${esc(i.text)}">
      ${i.id === editingId
        ? `<input type="text" class="fi-edit" value="${esc(i.text)}" aria-label="행동 문구 수정 — Enter 저장, Esc 취소">`
        : `<span class="fi-text">${esc(i.text)}</span>`}
      <button type="button" class="pill pill-icon fi-more" aria-haspopup="menu" aria-label="항목 메뉴: ${esc(i.text)}">⋯</button>
    </li>`;

  function boxHTML(key, { forced = false } = {}) {
    const items = itemsIn(key).sort((a, b) => b.placedAt - a.placedAt);
    const open = items.filter(i => !i.done), done = items.filter(i => i.done);
    const temp = key === 'unassigned', fav = state.favorites.includes(key);
    const empty = open.length ? '' : `<p class="fi-box-empty">${
      done.length ? '남은 항목이 없어요.' : temp ? '소속을 정하지 않은 항목이 여기에 모여요.' : '아직 없어요. 위에서 실행할 행동을 추가해 보세요.'}</p>`;
    return `
      <section class="fi-box${temp ? ' is-temp' : ''}" data-box="${key}" data-drop="${key}" aria-label="${esc(temp ? '임시 — 소속 미지정' : fullLabel(key))}">
        <header class="fi-box-head">
          <h2 class="fi-box-title" title="${esc(temp ? '소속을 정하지 않은 항목' : fullLabel(key))}">${titleHTML(key)}</h2>
          <span class="resume-count" aria-label="미완료 ${open.length}개">${open.length}</span>
          ${temp ? '' : `<button type="button" class="pill pill-icon fi-fav" data-fav="${key}" aria-pressed="${fav}" aria-label="${esc(shortLabel(key))} 박스 즐겨찾기" title="${fav ? '즐겨찾기 해제' : '즐겨찾기'}">${fav ? '★' : '☆'}</button>`}
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

  function renderList() {
    $$('.fi-done', listEl).forEach(d => (d.open ? openDone.add(d.dataset.done) : openDone.delete(d.dataset.done)));
    let html = '';
    if (filter !== 'all') html = boxHTML(filter, { forced: true });
    else {
      const favs = state.favorites;
      const rest = BOX_KEYS.filter(k => !favs.includes(k) && itemsIn(k).length).sort((a, b) => lastPlaced(b) - lastPlaced(a));
      if (itemsIn('unassigned').length) html += boxHTML('unassigned');
      if (favs.length) html += `<p class="fi-section-label">즐겨찾기</p>${favs.map(k => boxHTML(k)).join('')}`;
      if (rest.length) html += `${favs.length ? '<p class="fi-section-label">그 외</p>' : ''}${rest.map(k => boxHTML(k)).join('')}`;
      if (!html) html = '<p class="fi-box-empty fi-all-empty">아직 Future Item이 없어요. 위에 실행할 행동을 적어보세요. 저널의 Future Item에서 등록할 수도 있어요.</p>';
    }
    listEl.innerHTML = html;
    $$('.fi-done', listEl).forEach(d => window.StyleKit?.createAccordion(d));
  }

  function render(focus) {
    renderFilters();
    renderList();
    scopeLabel.textContent = draftKey === 'unassigned' ? '미지정' : shortLabel(draftKey);
    scopeBtn.setAttribute('aria-label', `소속: ${draftKey === 'unassigned' ? '미지정 (임시로 추가)' : fullLabel(draftKey)}`);
    if (editingId) { const e = $('.fi-edit', listEl); if (e) { e.focus(); e.select(); } return; }
    if (focus) (typeof focus === 'function' ? focus() : $(focus, view))?.focus();
  }

  // ---- filters ----
  const hashFor = f => (f === 'all' ? '#future-item' : `#future-item/${f === 'unassigned' ? 'temp' : f === 'general' ? 'general' : f.slice(7)}`);
  const filterFromHash = h => {
    const part = (h.split('/')[1] || '').toUpperCase();
    if (!part) return 'all';
    if (part === 'TEMP') return 'unassigned';
    if (part === 'GENERAL') return 'general';
    const code = ALIASES[part] || part;
    return BOX_KEYS.includes(`course:${code}`) ? `course:${code}` : 'all';
  };
  function setFilter(f, focusFilter = false) {
    filter = f;
    draftKey = f === 'all' ? 'unassigned' : f; // default membership follows the filter
    editingId = null;
    if (currentView === 'future') history.replaceState(null, '', hashFor(f));
    render(focusFilter ? `.fi-filter[data-filter="${f}"]` : null);
  }

  // ---- actions ----
  function add(text, key) {
    text = text.trim();
    if (!text) return false;
    const r = commit(s => { s.items.push(newItem(text, key)); });
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
    }, { focus: `[data-fav="${key}"]` });
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
    [['unassigned', unassignedLabel], ['general', 'General'], ...COURSES.map(([c, n]) => [`course:${c}`, `<span class="nav-code">${c}</span>_${n}`])]
      .map(([k, label]) => `<button type="button" class="cm-item" role="menuitemradio" data-key="${k}" aria-checked="${k === current}">${label}</button>`)
      .join('');

  let pickScope = null; // what a membership pick does for the open menu
  function openScopeMenu(anchor, current, onPick, unassignedLabel) {
    pickScope = onPick;
    openMenu(anchor, `<p class="cm-head">소속</p>${scopeListHTML(current, { unassignedLabel })}`);
    $('.cm-item[aria-checked="true"]', menu)?.focus({ preventScroll: true });
  }
  function openItemMenu(btn) {
    const id = btn.closest('.fi-row').dataset.id, item = find(id);
    if (!item) return;
    pickScope = null;
    openMenu(btn, `
      <button type="button" class="cm-item" role="menuitem" data-act="edit" data-id="${id}">수정</button>
      <button type="button" class="cm-item" role="menuitem" data-act="scope" data-id="${id}">소속 변경 <span class="cm-note">${esc(shortLabel(keyOf(item)))}</span></button>
      ${item.source?.journalDate ? `<button type="button" class="cm-item" role="menuitem" data-act="journal" data-id="${id}">원문 저널 열기 <span class="cm-note">${monthDay(item.source.journalDate)}</span></button>` : ''}
      <div class="cm-sep" role="separator"></div>
      <button type="button" class="cm-item" role="menuitem" data-act="delete" data-id="${id}">삭제</button>`);
  }

  menu.addEventListener('click', e => {
    const b = e.target.closest('.cm-item');
    if (!b) return;
    if (b.dataset.key) { const run = pickScope; closeMenu(!run?.keepFocus); run?.(b.dataset.key); return; }
    const id = b.dataset.id, anchor = menuAnchor;
    switch (b.dataset.act) {
      case 'edit': closeMenu(false); editingId = id; render(); break;
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
    if (add(input.value, draftKey)) input.value = '';
    input.focus();
  });
  scopeBtn.addEventListener('click', () => {
    if (menuAnchor === scopeBtn) { closeMenu(); return; }
    openScopeMenu(scopeBtn, draftKey, key => { draftKey = key; render(); input.focus(); }, '미지정 (임시로 추가)');
  });

  // ---- list + filter clicks ----
  view.addEventListener('click', e => {
    const f = e.target.closest('.fi-filter');
    if (f) { setFilter(f.dataset.filter, true); return; }
    const fav = e.target.closest('.fi-fav');
    if (fav) { toggleFavorite(fav.dataset.fav); return; }
    const more = e.target.closest('.fi-more');
    if (more) { menuAnchor === more ? closeMenu() : openItemMenu(more); }
  });
  listEl.addEventListener('change', e => {
    const c = e.target.closest('.fi-check');
    if (c) toggleDone(c.closest('.fi-row').dataset.id);
  });
  listEl.addEventListener('keydown', e => {
    const ed = e.target.closest('.fi-edit');
    if (!ed) return;
    const id = ed.closest('.fi-row').dataset.id;
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); saveEdit(id, ed.value); }
    if (e.key === 'Escape') { e.preventDefault(); saveEdit(id, '', true); }
  });
  listEl.addEventListener('focusout', e => {
    const ed = e.target.closest('.fi-edit');
    if (ed && ed.isConnected) saveEdit(ed.closest('.fi-row').dataset.id, ed.value);
  });

  // ---- drag to change membership (filters except All, boxes, 임시) ----
  let dragId = null;
  const clearDrag = () => {
    dragId = null;
    view.classList.remove('is-dragging');
    $$('.drop-ok, .drop-over, .is-drag-src', view).forEach(el => el.classList.remove('drop-ok', 'drop-over', 'is-drag-src'));
  };
  view.addEventListener('dragstart', e => {
    const row = e.target.closest?.('.fi-row');
    if (!row || editingId) return;
    dragId = row.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', find(dragId)?.text || '');
    const from = keyOf(find(dragId));
    view.classList.add('is-dragging');
    row.classList.add('is-drag-src');
    $$('[data-drop]', view).forEach(t => t.classList.toggle('drop-ok', t.dataset.drop !== from));
  });
  view.addEventListener('dragover', e => {
    const t = dragId && e.target.closest?.('[data-drop].drop-ok');
    if (!t) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    $$('.drop-over', view).forEach(el => el !== t && el.classList.remove('drop-over'));
    t.classList.add('drop-over');
  });
  view.addEventListener('dragleave', e => {
    const t = e.target.closest?.('[data-drop]');
    if (t && !t.contains(e.relatedTarget)) t.classList.remove('drop-over');
  });
  view.addEventListener('drop', e => {
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
