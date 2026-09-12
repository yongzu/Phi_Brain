/*
  Journaling — prototype behavior (no backend).

  - Drafts autosave per date to localStorage. A saved draft is only a
    draft: nothing is filed into a course until 정리하기 → review →
    confirm, which needs the AI step that isn't connected yet. So
    정리하기 shows its real states (정리 중 → 실패 → 다시 시도) honestly.
  - The editor is one document; 4F are headings (fill pills) inside it,
    each carrying its guiding question for the hover hint.
*/
(() => {
  const $ = s => document.querySelector(s);
  const editor = $('#editor'), titleInput = $('#title-input');
  const dateField = $('#date-field'), dateBtn = $('#date-button'), dateLabel = $('#date-label');
  const picker = $('#datepicker'), dpGrid = $('#dp-grid'), dpTitle = $('#dp-title'), dpPrev = $('#dp-prev'), dpNext = $('#dp-next');
  const heading = $('#journal-heading'), status = $('#save-status'), organize = $('#organize');
  const chipsEl = $('#course-chips'), formatBar = $('.format-bar');
  const archiveFiltersEl = $('#archive-filters'), archiveListEl = $('#archive-list');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  // shared with future.js: course list, Future Item store, floating-card animation
  const { COURSES, ALIASES, future, ui: { popIn, popOut } } = window.PhiBrain;
  const JOURNAL_SCOPES = [['general', 'General'], ...COURSES];
  const FOUR_F = [
    ['Fact', '오늘 무엇을 배우거나 경험했나요?'],
    ['Feeling', '무엇이 인상적이거나 불편했나요?'],
    ['Finding', '새롭게 깨달은 것은 무엇인가요?'],
    ['Future Item', '다음에 구체적으로 무엇을 해볼 건가요?'],
  ];

  // ---- dates ----
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
  const monthDay = s => { const [, m, d] = s.split('-').map(Number); return `${m}월 ${d}일`; };
  const clock = ts => new Date(ts).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  const today = daysAgo(0);

  // ---- storage (may be unavailable: private mode, blocked site data) ----
  const KEY = 'phi-brain:journal:';
  const store = {
    get(date) { try { return JSON.parse(localStorage.getItem(KEY + date)); } catch { return null; } },
    set(date, v) { try { localStorage.setItem(KEY + date, JSON.stringify(v)); return true; } catch { return false; } },
    dates() {
      try { return Object.keys(localStorage).filter(k => k.startsWith(KEY)).map(k => k.slice(KEY.length)); }
      catch { return []; }
    },
  };

  // ---- example data (shown until the user edits; never auto-saved) ----
  // Today always opens as a blank document — 4F boxes appear only via the
  // 4F 템플릿 button. The past draft below shows what a resumed one looks like.
  const guideFor = text => FOUR_F.find(([f]) => f.toLowerCase() === text.trim().toLowerCase())?.[1];
  const section = (f, body) => `<h3 data-guide="${guideFor(f)}">${f}</h3>` + (body ?? '<p><br></p>');
  const EXAMPLES = {
    [daysAgo(2)]: {
      courses: ['SI'],
      html: section('Fact', '<p>SI — 자기소개 초안을 서로 읽고 피드백을 주고받았다.</p>')
        + section('Feeling', '<p>내 문장이 생각보다 길고 설명적이라는 걸 느꼈다.</p>') + section('Finding') + section('Future Item'),
    },
  };
  const REVIEW = [ // AI-organized, not yet confirmed (examples)
    { date: daysAgo(4), meta: '정리 완료 · 확인 전' },
    { date: daysAgo(7), meta: '과목 분류 확인 필요' },
  ];

  // ---- state ----
  let current = today, chosen = new Set(), saveTimer = 0, dirty = false;

  const isEmpty = () => editor.textContent.trim() === '' && !editor.querySelector('h3, li, .course-box');
  const refreshEmpty = () => editor.classList.toggle('is-empty', isEmpty());
  // any heading whose text is a 4F name gets that F's question — typed,
  // pasted, renamed or template-made alike
  const syncGuides = () => editor.querySelectorAll('h3').forEach(h => {
    const g = guideFor(h.textContent);
    g ? h.setAttribute('data-guide', g) : h.removeAttribute('data-guide');
  });

  function setStatus(text, kind = '') {
    status.textContent = text;
    status.className = 'save-status' + (kind ? ' is-' + kind : '');
  }

  function load(date) {
    closeCourseMenu();
    current = date;
    const saved = store.get(date);
    const example = !saved && EXAMPLES[date];
    const data = saved || example || { title: '', courses: [], html: '' };
    titleInput.value = data.title || '';
    editor.innerHTML = data.html || '';
    chosen = new Set((data.courses || []).map(c => ALIASES[c] || c));
    editor.querySelectorAll('.course-box[data-course="EAI"]').forEach(box => { box.dataset.course = 'EWA'; box.innerHTML = courseBoxInner('EWA'); });
    $('#fi-register').checked = false;
    dirty = false;
    renderDate(); renderCourses(); syncGuides(); refreshEmpty(); refreshTemplateState(); resetOrganize();
    setStatus(saved ? `초안 저장됨 · ${clock(saved.savedAt)}` : example ? '예시 초안 · 입력하면 자동 저장돼요' : '');
    renderResume();
  }

  // ---- autosave: a draft, not a confirmed record ----
  function scheduleSave() {
    dirty = true;
    resetOrganize();
    setStatus('저장 중…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 700);
  }
  function save() {
    clearTimeout(saveTimer);
    if (!dirty) return;
    dirty = false;
    const data = { title: titleInput.value.trim(), courses: [...chosen], html: editor.innerHTML, savedAt: Date.now() };
    if (store.set(current, data)) setStatus(`초안 저장됨 · ${clock(data.savedAt)}`);
    else setStatus('이 브라우저에서는 저장할 수 없어요', 'error');
    renderResume();
  }

  // ---- date ----
  function renderDate() {
    const label = monthDay(current);
    dateLabel.textContent = label;
    heading.textContent = current === today ? '오늘의 저널' : '지난 저널';
    titleInput.placeholder = `${label} 저널`;
    editor.dataset.placeholder = current === today ? '오늘의 저널링을 적어주세요' : `${label}의 저널링을 적어주세요`;
  }

  // ---- date picker: today or earlier only ----
  let viewY = 0, viewM = 0; // month on screen (0-based month)
  const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  function renderPicker(focusDate) {
    dpTitle.textContent = `${viewY}년 ${viewM + 1}월`;
    const [ty, tm] = today.split('-').map(Number);
    dpNext.disabled = viewY > ty || (viewY === ty && viewM >= tm - 1);
    const lead = new Date(viewY, viewM, 1).getDay();
    const days = new Date(viewY, viewM + 1, 0).getDate();
    const focusable = focusDate || (current.startsWith(`${viewY}-${pad(viewM + 1)}`) ? current : iso(new Date(viewY, viewM, 1)));
    let html = '<span></span>'.repeat(lead);
    for (let d = 1; d <= days; d++) {
      const date = `${viewY}-${pad(viewM + 1)}-${pad(d)}`;
      html += `<button type="button" class="dp-day" data-date="${date}" tabindex="${date === focusable ? 0 : -1}"`
        + `${date === current ? ' aria-selected="true"' : ''}${date === today ? ' data-today' : ''}${date > today ? ' disabled' : ''}`
        + ` aria-label="${viewM + 1}월 ${d}일${date === today ? ', 오늘' : ''}">${d}</button>`;
    }
    dpGrid.innerHTML = html;
  }
  function openPicker() {
    const d = fromIso(current);
    viewY = d.getFullYear(); viewM = d.getMonth();
    renderPicker();
    popIn(picker);
    dateBtn.setAttribute('aria-expanded', 'true');
    dpGrid.querySelector('[tabindex="0"]')?.focus();
  }
  function closePicker(refocus = true) {
    if (picker.hidden || dateBtn.getAttribute('aria-expanded') === 'false') return;
    dateBtn.setAttribute('aria-expanded', 'false');
    if (refocus) dateBtn.focus();
    popOut(picker);
  }
  function pick(date) {
    closePicker();
    if (date === current) return;
    save();
    load(date);
  }
  const stepMonth = n => { const d = new Date(viewY, viewM + n, 1); viewY = d.getFullYear(); viewM = d.getMonth(); renderPicker(); };
  dateBtn.addEventListener('click', () => (picker.hidden ? openPicker() : closePicker()));
  dpPrev.addEventListener('click', () => stepMonth(-1));
  dpNext.addEventListener('click', () => stepMonth(1));
  $('#dp-today').addEventListener('click', () => pick(today));
  dpGrid.addEventListener('click', e => { const b = e.target.closest('.dp-day'); if (b && !b.disabled) pick(b.dataset.date); });
  dpGrid.addEventListener('keydown', e => { // arrows move by day / week, across months
    const b = e.target.closest('.dp-day');
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!b || !step) return;
    e.preventDefault();
    const d = fromIso(b.dataset.date);
    d.setDate(d.getDate() + step);
    const next = iso(d);
    if (next > today) return;
    if (d.getMonth() !== viewM || d.getFullYear() !== viewY) { viewY = d.getFullYear(); viewM = d.getMonth(); }
    renderPicker(next);
    dpGrid.querySelector(`[data-date="${next}"]`)?.focus();
  });
  picker.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closePicker(); } });
  document.addEventListener('pointerdown', e => { if (!dateField.contains(e.target)) closePicker(false); });

  // ---- courses (optional hint for the AI) — always expanded, like Future
  // Item's scope chips; no accordion to open/close ----
  chipsEl.innerHTML = JOURNAL_SCOPES.map(([code, name]) =>
    `<button type="button" class="pill" data-code="${code}" aria-pressed="false" title="${code}_${name}">${code === 'general' ? 'General' : code}</button>`).join('');
  function renderCourses() {
    chipsEl.querySelectorAll('[data-code]').forEach(b => b.setAttribute('aria-pressed', String(chosen.has(b.dataset.code))));
  }
  chipsEl.addEventListener('click', e => {
    const b = e.target.closest('[data-code]');
    if (!b) return;
    chosen.has(b.dataset.code) ? chosen.delete(b.dataset.code) : chosen.add(b.dataset.code);
    renderCourses();
    scheduleSave();
  });
  titleInput.addEventListener('input', scheduleSave);

  // ---- editor ----
  const blockOf = node => {
    for (; node && node !== editor; node = node.parentNode)
      if (node.nodeType === 1 && /^(P|H3|LI|DIV)$/.test(node.tagName)) return node;
    return null;
  };
  const caretIn = el => {
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(true);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
  };
  function ensureCaret() {
    const s = getSelection();
    if (s.rangeCount && editor.contains(s.anchorNode)) return;
    editor.focus();
    if (isEmpty()) editor.innerHTML = '<p><br></p>';
    const r = document.createRange();
    r.selectNodeContents(editor);
    r.collapse(false);
    s.removeAllRanges();
    s.addRange(r);
  }

  // 4F 템플릿 is a toggle: with 4F boxes present it takes them out again.
  // Only the boxes (and the blank line each one brought) go — writing stays.
  const fourFHeads = () => [...editor.querySelectorAll('h3')].filter(h => guideFor(h.textContent));
  const templateBtn = document.querySelector('[data-cmd="template"]');
  const refreshTemplateState = () => templateBtn.setAttribute('aria-pressed', String(fourFHeads().length > 0));
  function toggleTemplate() {
    const heads = fourFHeads();
    if (heads.length) {
      heads.forEach(h => {
        const next = h.nextElementSibling;
        if (next && next.tagName === 'P' && next.textContent.trim() === '') next.remove();
        h.remove();
      });
      if (isEmpty()) editor.innerHTML = '';
      afterEdit();
      return;
    }
    if (isEmpty()) editor.innerHTML = '';
    editor.insertAdjacentHTML('beforeend', FOUR_F.map(([f]) => section(f)).join(''));
    editor.focus();
    // caret into the first 4F section that has nothing written under it yet
    const open = [...editor.querySelectorAll('h3[data-guide]')]
      .map(h => h.nextElementSibling)
      .find(el => el && el.tagName === 'P' && el.textContent.trim() === '');
    if (open) caretIn(open);
    afterEdit();
  }

  function toggleChecklist() {
    ensureCaret();
    document.execCommand('defaultParagraphSeparator', false, 'p');
    const ul = blockOf(getSelection().anchorNode)?.closest('ul');
    if (ul?.classList.contains('checklist')) document.execCommand('insertUnorderedList'); // toggle off
    else if (ul) ul.classList.add('checklist'); // a pasted bullet list becomes a checklist
    else {
      document.execCommand('insertUnorderedList');
      blockOf(getSelection().anchorNode)?.closest('ul')?.classList.add('checklist');
    }
    afterEdit();
  }

  // ---- course box: marks which course the lines below it belong to ----
  const courseName = code => COURSES.find(c => c[0] === code)?.[1];
  const courseBoxInner = code => `<button type="button" class="cb-btn" aria-haspopup="listbox">`
    + `<span>${code ? `<span class="nav-code">${code}</span>_${courseName(code)}` : '과목 선택'}</span>`
    + `<span class="caret" aria-hidden="true">▾</span></button>`;
  const courseMenu = $('#course-menu');
  let menuBox = null; // the course box the menu is open for

  function insertCourseBox() {
    ensureCaret();
    let top = blockOf(getSelection().anchorNode);
    while (top && top.parentNode !== editor) top = top.parentNode; // the editor-level block holding the caret
    const box = document.createElement('div');
    box.className = 'course-box';
    box.contentEditable = 'false';
    box.dataset.course = '';
    box.innerHTML = courseBoxInner('');
    let line;
    if (top && top.tagName === 'P' && top.textContent.trim() === '') { top.before(box); line = top; } // reuse an empty line
    else {
      line = document.createElement('p');
      line.innerHTML = '<br>';
      top ? top.after(box, line) : editor.append(box, line);
    }
    caretIn(line);
    afterEdit();
    openCourseMenu(box);
  }

  function openCourseMenu(box) {
    menuBox?.classList.remove('is-open');
    menuBox = box;
    box.classList.add('is-open');
    const cur = box.dataset.course;
    courseMenu.innerHTML = COURSES.map(([code, name]) =>
      `<button type="button" class="cm-item" role="option" data-code="${code}" aria-selected="${code === cur}"><span class="nav-code">${code}</span>_${name}</button>`).join('');
    const j = editor.closest('.journal').getBoundingClientRect(), b = box.getBoundingClientRect();
    courseMenu.style.top = `${b.bottom - j.top + 6}px`;
    courseMenu.style.left = `${b.left - j.left}px`;
    popIn(courseMenu);
    (courseMenu.querySelector('[aria-selected="true"]') || courseMenu.firstElementChild).focus({ preventScroll: true });
  }
  function closeCourseMenu(refocus = false) {
    if (!menuBox) return;
    const box = menuBox;
    menuBox = null;
    box.classList.remove('is-open');
    popOut(courseMenu);
    if (refocus && box.nextElementSibling) { editor.focus(); caretIn(box.nextElementSibling); }
  }
  courseMenu.addEventListener('click', e => {
    const item = e.target.closest('.cm-item');
    if (!item || !menuBox) return;
    const code = item.dataset.code;
    menuBox.dataset.course = code;
    menuBox.innerHTML = courseBoxInner(code);
    chosen.add(code); // a course marked in the body is also a course covered today
    renderCourses();
    closeCourseMenu(true);
    afterEdit();
  });
  courseMenu.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeCourseMenu(true); return; }
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const items = [...courseMenu.children], i = items.indexOf(document.activeElement);
    items[(i + step + items.length) % items.length].focus();
  });
  document.addEventListener('pointerdown', e => {
    if (menuBox && !courseMenu.contains(e.target) && !menuBox.contains(e.target)) closeCourseMenu();
  });

  // ---- format bar: acts on the dragged text ----
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const closestIn = (node, sel) => {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    const hit = el?.closest(sel);
    return hit && editor.contains(hit) ? hit : null;
  };
  const unwrap = el => { el.replaceWith(...el.childNodes); editor.normalize(); };

  function toggleQuote() {
    const bq = closestIn(getSelection().anchorNode, 'blockquote');
    if (!bq) { document.execCommand('formatBlock', false, 'blockquote'); return; }
    // unwrapping by hand: formatBlock('p') leaves Chrome's blockquote in place
    if ([...bq.childNodes].some(n => n.nodeType === 3 || !/^(P|UL|H3|DIV)$/.test(n.tagName))) {
      const p = document.createElement('p');
      p.append(...bq.childNodes);
      bq.replaceWith(p);
      caretIn(p);
    } else unwrap(bq);
  }
  function toggleCode() {
    const s = getSelection();
    const code = closestIn(s.anchorNode, 'code');
    if (code) { unwrap(code); return; }
    if (s.isCollapsed) return;
    document.execCommand('insertHTML', false, `<code>${esc(s.toString().replace(/\s*\n\s*/g, ' '))}</code>`);
  }
  function applyFormat(f) {
    ensureCaret();
    if (f === 'quote') toggleQuote();
    else if (f === 'code') toggleCode();
    else document.execCommand(f);
    afterEdit();
    refreshFormatState();
  }
  const fmtButtons = [...document.querySelectorAll('[data-fmt]')];
  function refreshFormatState() {
    const s = getSelection();
    const inside = s.rangeCount > 0 && editor.contains(s.anchorNode);
    // the format bar only means anything once text is actually selected —
    // the page opens with nothing arranged, no toolbar floating over a blank editor
    formatBar.hidden = !(inside && !s.isCollapsed);
    fmtButtons.forEach(b => {
      const f = b.dataset.fmt;
      let on = false;
      if (inside) {
        if (f === 'quote') on = !!closestIn(s.anchorNode, 'blockquote');
        else if (f === 'code') on = !!closestIn(s.anchorNode, 'code');
        else try { on = document.queryCommandState(f); } catch { on = false; }
      }
      b.setAttribute('aria-pressed', String(on));
    });
  }
  document.addEventListener('selectionchange', refreshFormatState);

  const COMMANDS = { template: toggleTemplate, course: insertCourseBox, check: toggleChecklist };
  document.querySelectorAll('[data-cmd], [data-fmt]').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault()); // keep the editor's selection
    btn.addEventListener('click', () => btn.dataset.cmd ? COMMANDS[btn.dataset.cmd]() : applyFormat(btn.dataset.fmt));
  });

  function afterEdit() { syncGuides(); refreshEmpty(); refreshTemplateState(); scheduleSave(); }

  // ---- Future Item에 등록하기 (feeds the temporary Future Item tab) ----
  const fiBtn = $('#fi-register');
  const futureHead = () => fourFHeads().find(h => h.textContent.trim().toLowerCase() === 'future item');
  // Course for each line, until the AI does this properly: the course box
  // above it in the section, else a leading code ("BI — …"), else the one
  // course picked in 다룬 과목, else unassigned.
  const LEAD_CODES = [...COURSES.map(c => c[0]), ...Object.keys(ALIASES)].sort((a, b) => b.length - a.length);
  const CODE_LEAD = new RegExp(`^(${LEAD_CODES.join('|')})(?:\\s*[—–:\\-·_]\\s*|\\s+)`);
  function collectFutureItems(head) {
    const fallback = chosen.size === 1 ? [...chosen][0] : '';
    const entries = [];
    let boxCourse = '';
    for (let el = head.nextElementSibling; el && el.tagName !== 'H3'; el = el.nextElementSibling) {
      if (el.classList.contains('course-box')) { boxCourse = el.dataset.course || ''; continue; }
      (el.tagName === 'UL' ? [...el.children] : [el]).forEach(line => {
        let text = line.textContent.split(String.fromCharCode(160)).join(' ').trim(); // nbsp → space
        if (!text) return;
        let course = boxCourse;
        const m = text.match(CODE_LEAD);
        if (m && text.length > m[0].length) { course = ALIASES[m[1]] || m[1]; text = text.slice(m[0].length).trim(); }
        entries.push({ course: course || fallback, text });
      });
    }
    return entries;
  }
  function registerFutureItems() {
    const head = futureHead();
    if (!head) { setStatus('Future Item 소제목과 행동을 먼저 작성해주세요', 'error'); return false; }
    const entries = collectFutureItems(head);
    if (!entries.length) { setStatus('등록할 Future Item이 없어요', 'error'); return false; }
    const n = future.register(current, entries);
    if (n < 0) { setStatus('Future Item을 저장하지 못했어요', 'error'); return false; }
    fiBtn.checked = false;
    window.PhiBrain.ui.toast(n ? `${n}개 Future Item 등록됨` : '이미 모두 등록됐어요');
    renderResume();
    return true;
  }
  editor.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'p'));
  editor.addEventListener('input', afterEdit);
  editor.addEventListener('paste', e => { // paste as plain text so Discord/Notion styling doesn't leak in
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  });
  editor.addEventListener('click', e => {
    const box = e.target.closest('.course-box');
    if (box) { menuBox === box ? closeCourseMenu() : openCourseMenu(box); return; }
    const li = e.target.closest('ul.checklist > li'); // the circle sits left of the <li> box
    if (li && e.clientX < li.getBoundingClientRect().left) { li.toggleAttribute('data-done'); scheduleSave(); }
  });

  // ---- 정리하기: the AI step isn't connected, so it shows the failure path ----
  function resetOrganize() { organize.disabled = false; organize.textContent = '정리하기'; }
  organize.addEventListener('click', () => {
    if (isEmpty()) { setStatus('정리할 내용을 먼저 적어주세요', 'error'); editor.focus(); return; }
    save();
    if (fiBtn.checked && !registerFutureItems()) return;
    organize.disabled = true;
    setStatus('정리 중…', 'busy');
    setTimeout(() => {
      setStatus('정리하지 못했어요 · AI가 아직 연결되지 않았어요', 'error');
      organize.disabled = false;
      organize.textContent = '다시 시도';
    }, 1600);
  });

  // ---- resume lists ----
  const item = (title, meta, attrs = '') =>
    `<li><button type="button" class="nav-tab" ${attrs}><span class="ri-title">${title}</span><span class="ri-meta">${meta}</span></button></li>`;
  function renderResume() {
    const draftDates = new Set([...Object.keys(EXAMPLES), ...store.dates()]);
    draftDates.delete(current);
    const drafts = [...draftDates].sort().reverse().map(date => {
      const d = store.get(date) || EXAMPLES[date];
      return { date, title: d.title || `${monthDay(date)} 저널`, courses: (d.courses || []).join(' · ') };
    });
    $('#list-drafts').innerHTML = drafts.map(d =>
      item(d.title, [d.courses, '작성 중'].filter(Boolean).join(' · '), `data-open="${d.date}"`)).join('');
    $('#count-drafts').textContent = drafts.length;
    $('#list-review').innerHTML = REVIEW.map(r => item(`${monthDay(r.date)} 저널`, r.meta)).join('');
    $('#count-review').textContent = REVIEW.length;
    // 지난 할 일: open Future Items, except the ones this journal itself registered
    const open = future.all().filter(i => !i.done && i.source?.journalDate !== current).sort((a, b) => b.placedAt - a.placedAt);
    const tag = i => (i.scope === 'course' ? i.courseId : i.scope === 'general' ? 'General' : '');
    $('#list-todo').innerHTML = open.length
      ? open.map(i => `<li>${tag(i) ? `<span class="nav-code">${tag(i)}</span>` : ''}${esc(i.text)}</li>`).join('')
      : '<li>아직 없어요</li>';
    $('#count-todo').textContent = open.length;
  }
  $('#list-drafts').addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    save();
    load(b.dataset.open);
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });
  // Future Item's ⋯ → 원문 저널 열기
  window.PhiBrain.openJournal = date => {
    save();
    load(date);
    window.PhiBrain.show('journal');
    scrollTo({ top: 0 });
  };

  // ---- Journal Archive: read-only browse over every real saved draft, no
  // fabricated data (EXAMPLES/REVIEW are for the homepage resume lists only) ----
  let archiveFilter = 'all';
  const openArchive = new Set(); // dates currently dropped open — stays pinned across filter/view changes
  const archiveHashFor = f => (f === 'all' ? '#journal-archive' : `#journal-archive/${f}`);
  const archiveFilterFromHash = h => {
    if (!h.startsWith('#journal-archive')) return 'all';
    const raw = (h.split('/')[1] || '').toUpperCase();
    if (!raw) return 'all';
    if (raw === 'GENERAL') return 'general';
    const code = ALIASES[raw] || raw;
    return COURSES.some(c => c[0] === code) ? code : 'all';
  };
  function archiveEntries() {
    return store.dates().map(date => {
      const d = store.get(date);
      if (!d) return null;
      return { date, title: (d.title || '').trim() || `${monthDay(date)} 저널`, courses: d.courses || [], savedAt: d.savedAt || 0, html: d.html || '' };
    }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
  }
  function renderArchiveFilters(entries) {
    const count = k => entries.filter(e => k === 'all' || e.courses.includes(k)).length;
    const pill = (k, label) => `<button type="button" class="pill fi-filter" data-archive-filter="${k}" aria-pressed="${k === archiveFilter}">`
      + `${label}${count(k) ? `<span class="f-count" aria-hidden="true">${count(k)}</span>` : ''}</button>`;
    archiveFiltersEl.innerHTML = pill('all', 'All') + pill('general', 'General') + COURSES.map(([code]) => pill(code, code)).join('');
  }
  // click a row's summary to drop its content open in place — it stays open
  // (pinned) across filter/view changes until clicked again; "Journaling에서
  // 열기" is the separate action for actually editing that date
  const archiveRowHTML = e => {
    const courseLabel = e.courses.map(c => (c === 'general' ? 'General' : c)).join(' · ');
    const meta = [courseLabel, e.savedAt ? clock(e.savedAt) : ''].filter(Boolean).join(' · ');
    return `<li>
      <details class="resume-row archive-entry" data-date="${e.date}"${openArchive.has(e.date) ? ' open' : ''}>
        <summary class="resume-summary"><span class="ri-title">${esc(e.title)}</span><span class="ri-meta">${esc(meta)}</span><span class="caret" aria-hidden="true">▾</span></summary>
        <div class="accordion-content">
          <div class="editor archive-preview">${e.html}</div>
          <button type="button" class="pill archive-open" data-open="${e.date}">Journaling에서 열기</button>
        </div>
      </details>
    </li>`;
  };
  function renderArchiveList(entries) {
    // snapshot which rows are currently dropped open before the rebuild wipes them
    archiveListEl.querySelectorAll('.archive-entry').forEach(d => (d.open ? openArchive.add(d.dataset.date) : openArchive.delete(d.dataset.date)));
    if (!entries.length) { archiveListEl.innerHTML = '<li class="archive-empty">아직 쓴 저널이 없어요</li>'; return; }
    const filtered = archiveFilter === 'all' ? entries : entries.filter(e => e.courses.includes(archiveFilter));
    if (!filtered.length) { archiveListEl.innerHTML = '<li class="archive-empty">이 과목이 들어간 저널이 아직 없어요</li>'; return; }
    archiveListEl.innerHTML = filtered.map(archiveRowHTML).join('');
    archiveListEl.querySelectorAll('.archive-entry').forEach(d => window.StyleKit?.createAccordion(d));
  }
  function renderArchive() {
    archiveFilter = archiveFilterFromHash(location.hash);
    const entries = archiveEntries();
    renderArchiveFilters(entries);
    renderArchiveList(entries);
    if (window.PhiBrain.getCurrentView() === 'journal-archive') history.replaceState(null, '', archiveHashFor(archiveFilter));
  }
  archiveFiltersEl.addEventListener('click', e => {
    const b = e.target.closest('[data-archive-filter]');
    if (!b) return;
    archiveFilter = b.dataset.archiveFilter;
    history.replaceState(null, '', archiveHashFor(archiveFilter));
    const entries = archiveEntries();
    renderArchiveFilters(entries);
    renderArchiveList(entries);
  });
  archiveListEl.addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (b) window.PhiBrain.openJournal(b.dataset.open);
  });
  document.addEventListener('phibrain:view', e => { if (e.detail.name === 'journal-archive') renderArchive(); });
  if (window.PhiBrain.getCurrentView() === 'journal-archive') renderArchive();

  addEventListener('pagehide', save);
  load(today);
})();
