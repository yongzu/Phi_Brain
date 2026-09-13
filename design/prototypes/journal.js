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
  const chipsEl = $('#course-chips');
  const archiveFiltersEl = $('#archive-filters'), archiveListEl = $('#archive-list'), archiveCardsEl = $('#archive-cards');
  // the whole composer moves into #archive-compose-slot when editing from
  // Journal Archive, then back here (its original spot) when done
  const journalSection = document.querySelector('.journal'), viewJournal = $('#view-journal');
  const archiveBrowse = $('#archive-browse'), composeSlot = $('#archive-compose-slot'), archiveBackBtn = $('#archive-back');
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
  // wk#/요일 표시(Journal Archive All 탭): 학기 1주차 기준은 Assignment Manage와
  // 같은 server/db.js의 SEMESTER_START — 학기가 바뀌면 그 값만 바꾸면 된다.
  const SEMESTER_START = '2026-09-07';
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const weekOf = s => Math.max(1, Math.floor((fromIso(s) - fromIso(SEMESTER_START)) / 86400000 / 7) + 1);
  const monthDayDow = s => `${monthDay(s)}(${DOW[fromIso(s).getDay()]})`;

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
  // 과목 칩을 누르면(선택 상태로 바뀔 때) 그 과목의 과목 박스를 작성 중인
  // 위치에 바로 넣는다 — 예전 툴바의 "과목" 버튼+메뉴 선택을 한 번의 클릭으로
  // 대신한다. 다시 눌러 해제할 때는 이미 넣은 내용은 그대로 두고 표시만 끈다.
  chipsEl.addEventListener('click', e => {
    const b = e.target.closest('[data-code]');
    if (!b) return;
    const code = b.dataset.code;
    if (chosen.has(code)) { chosen.delete(code); renderCourses(); scheduleSave(); return; }
    chosen.add(code);
    renderCourses();
    insertCourseBox(code);
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

  // ---- course box: marks which course the lines below it belong to ----
  // 'general' is a legitimate box value too — same "특정 과목 아님" meaning as
  // the 다룬 과목 chip, just with no 3-letter code/full name pair to show
  const courseName = code => (code === 'general' ? 'General' : COURSES.find(c => c[0] === code)?.[1]);
  const courseBoxInner = code => `<button type="button" class="cb-btn" aria-haspopup="listbox">`
    + `<span>${code === 'general' ? 'General' : code ? `<span class="nav-code">${code}</span>_${courseName(code)}` : '과목 선택'}</span>`
    + `<span class="caret" aria-hidden="true">▾</span></button>`;
  const courseMenu = $('#course-menu');
  let menuBox = null; // the course box the menu is open for

  // code가 주어지면(다룬 과목 칩에서 호출) 바로 그 과목으로 박스를 넣고 메뉴는
  // 열지 않는다 — code가 없을 때만 메뉴로 고른다(현재는 이 경로로 호출하는 곳이
  // 없지만, 과목 박스 자체를 고르지 않고 넣는 경우를 위해 남겨둔다).
  function insertCourseBox(code = '') {
    ensureCaret();
    let top = blockOf(getSelection().anchorNode);
    while (top && top.parentNode !== editor) top = top.parentNode; // the editor-level block holding the caret
    const box = document.createElement('div');
    box.className = 'course-box';
    box.contentEditable = 'false';
    box.dataset.course = code;
    box.innerHTML = courseBoxInner(code);
    let line;
    if (top && top.tagName === 'P' && top.textContent.trim() === '') { top.before(box); line = top; } // reuse an empty line
    else {
      line = document.createElement('p');
      line.innerHTML = '<br>';
      top ? top.after(box, line) : editor.append(box, line);
    }
    caretIn(line);
    afterEdit();
    if (!code) openCourseMenu(box);
  }

  function openCourseMenu(box) {
    menuBox?.classList.remove('is-open');
    menuBox = box;
    box.classList.add('is-open');
    const cur = box.dataset.course;
    courseMenu.innerHTML = [['general', 'General'], ...COURSES].map(([code, name]) =>
      `<button type="button" class="cm-item" role="option" data-code="${code}" aria-selected="${code === cur}">${code === 'general' ? name : `<span class="nav-code">${code}</span>_${name}`}</button>`).join('');
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

  const COMMANDS = { template: toggleTemplate };
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
  // 디스코드 저널링 포맷 인식: `fact`/`feeling`/`findings`/`Future item` 같은 백틱
  // 줄은 4F 소제목으로, **TF**·**General** 같은 단독 굵게 줄은 과목 박스로 바꾼다.
  // 그 외 굵게 줄은 그냥 굵은 문단으로, 나머지는 평문 문단으로 남는다.
  const FOUR_F_ALIASES = { fact: 'Fact', feeling: 'Feeling', feelings: 'Feeling', finding: 'Finding', findings: 'Finding', 'future item': 'Future Item', futureitem: 'Future Item' };
  function resolveCourseWord(word) {
    const w = word.trim();
    if (!w) return null;
    if (w.toLowerCase() === 'general') return 'general';
    const code = ALIASES[w.toUpperCase()] || w.toUpperCase();
    return COURSES.some(c => c[0] === code) ? code : null;
  }
  function pastedTextToHtml(text) {
    return text.split('\n').map(raw => {
      const line = raw.trim();
      if (!line) return '<p><br></p>';
      const f = line.match(/^`\s*(.+?)\s*`$/);
      if (f) {
        const label = FOUR_F_ALIASES[f[1].trim().toLowerCase()];
        if (label) return `<h3 data-guide="${guideFor(label)}">${label}</h3>`;
      }
      const b = line.match(/^\*\*\s*(.+?)\s*\*\*$/);
      if (b) {
        const code = resolveCourseWord(b[1]);
        if (code) { chosen.add(code); return `<div class="course-box" contenteditable="false" data-course="${code}">${courseBoxInner(code)}</div>`; }
        return `<p><b>${esc(b[1])}</b></p>`;
      }
      return `<p>${esc(line)}</p>`;
    }).join('');
  }
  editor.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'p'));
  editor.addEventListener('input', afterEdit);
  editor.addEventListener('paste', e => { // paste as plain text so Discord/Notion styling doesn't leak in
    e.preventDefault();
    // normalize \r\n/\r first — leaving \r in place makes execCommand('insertText')
    // treat \r and \n as separate breaks, turning one blank line into three
    const text = e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
    if (!text.includes('\n')) { document.execCommand('insertText', false, text); return; }
    ensureCaret();
    document.execCommand('insertHTML', false, pastedTextToHtml(text));
    renderCourses();
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
  // (pinned) across filter/view changes until clicked again. The ⋯ button
  // lives in the summary itself (always visible, like Future Item's row
  // menu) and stops its click from also toggling the accordion underneath.
  const archiveRowHTML = e => {
    const courseLabel = e.courses.map(c => (c === 'general' ? 'General' : c)).join(' · ');
    const dateTag = `<span class="nav-code">WK${weekOf(e.date)}</span> ${esc(monthDayDow(e.date))}`;
    const rest = esc([courseLabel, e.savedAt ? clock(e.savedAt) : ''].filter(Boolean).join(' · '));
    return `<li>
      <details class="resume-row archive-entry" data-date="${e.date}"${openArchive.has(e.date) ? ' open' : ''}>
        <summary class="resume-summary">
          <span class="ri-title">${esc(e.title)}</span><span class="ri-meta">${dateTag}${rest ? ` · ${rest}` : ''}</span>
          <button type="button" class="pill pill-icon archive-more" data-more="${e.date}" aria-haspopup="menu" aria-label="저널 메뉴: ${esc(e.title)}">⋯</button>
          <span class="caret" aria-hidden="true">▾</span>
        </summary>
        <div class="accordion-content"><div class="editor archive-preview">${e.html}</div></div>
      </details>
    </li>`;
  };
  // ---- course excerpts: for a course-filtered card, show only that
  // course's content instead of the whole day — walk the saved HTML once,
  // grouping everything after a course box (up to the next course box or
  // 4F heading) under that course, tagged with the nearest preceding 4F ----
  function courseChunks(html) {
    const frag = document.createElement('div');
    frag.innerHTML = html;
    const chunks = [];
    let f4 = '', buf = null;
    const flush = () => { if (buf && buf.html) chunks.push(buf); buf = null; };
    [...frag.children].forEach(el => {
      if (el.tagName === 'H3') { flush(); f4 = el.textContent.trim(); return; }
      if (el.classList.contains('course-box')) { flush(); buf = { label: f4, course: el.dataset.course || '', html: '' }; return; }
      if (buf) buf.html += el.outerHTML;
    });
    flush();
    return chunks;
  }
  // no matching course box (course only came from the 다룬 과목 칩) → fall
  // back to the whole entry rather than showing an empty card
  function courseExcerptHtml(html, code) {
    const chunks = courseChunks(html).filter(c => c.course === code);
    if (!chunks.length) return html;
    return chunks.map(c => (c.label ? `<h3 data-guide="${guideFor(c.label) || ''}">${esc(c.label)}</h3>` : '') + c.html).join('');
  }

  // ---- 즐겨찾기: per (date, course) card, not per journal — a card is one
  // course's slice of one day, so that's the thing worth bookmarking ----
  const FAV_KEY = 'phi-brain:journal-archive:favorites';
  const favKey = (date, course) => `${date}::${course}`;
  const favorites = {
    all() { try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY)) || []); } catch { return new Set(); } },
    toggle(date, course) {
      const s = favorites.all(), k = favKey(date, course);
      s.has(k) ? s.delete(k) : s.add(k);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...s])); } catch {}
    },
  };
  // 즐겨찾기는 Future Item 과목 박스와 같은 별표(.fi-box-fav, CSS background로
  // 옅은 회색/검정 SVG를 바꿔 끼우는 방식)를 그대로 재사용 — 카드 헤더에 두면 CSS도 공짜
  const archiveCardHTML = (e, course, favSet) => {
    const isFav = favSet.has(favKey(e.date, course));
    return `
    <div class="archive-card${isFav ? ' is-fav' : ''}" data-date="${e.date}">
      <header class="fi-box-head archive-card-head">
        <h2 class="fi-box-title">${esc(e.title)}</h2>
        <span class="resume-count">${e.savedAt ? clock(e.savedAt) : ''}</span>
        <button type="button" class="fi-box-fav${isFav ? ' is-fav' : ''}" data-fav="${e.date}" data-fav-course="${course}" aria-pressed="${isFav}" aria-label="${isFav ? '즐겨찾기 해제' : '즐겨찾기'}: ${esc(e.title)}"></button>
        <button type="button" class="pill pill-icon archive-more" data-more="${e.date}" aria-haspopup="menu" aria-label="저널 메뉴: ${esc(e.title)}">⋯</button>
      </header>
      <div class="editor archive-preview archive-card-body">${courseExcerptHtml(e.html, course)}</div>
    </div>`;
  };

  function wireArchiveMoreButtons(container) {
    // bound directly to each button (not delegated on the container) so
    // stopPropagation reaches it before an ancestor <summary>'s own click
    // handler (StyleKit.createAccordion) toggles that row open/closed
    container.querySelectorAll('.archive-more').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      archiveMenuAnchor === b ? closeArchiveMenu() : openArchiveMenu(b, b.dataset.more);
    }));
    container.querySelectorAll('.fi-box-fav').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      favorites.toggle(b.dataset.fav, b.dataset.favCourse);
      renderArchiveList(archiveEntries());
    }));
  }
  // All: 기존 목록. 특정 과목 필터: 그 과목이 들어간 날짜마다 그 과목 내용만
  // 뽑은 카드 그리드 — 둘 중 하나만 보이도록 archiveListEl/archiveCardsEl을 토글
  function renderArchiveList(entries) {
    // snapshot which rows are currently dropped open before the rebuild wipes them
    archiveListEl.querySelectorAll('.archive-entry').forEach(d => (d.open ? openArchive.add(d.dataset.date) : openArchive.delete(d.dataset.date)));
    if (archiveFilter === 'all') {
      archiveCardsEl.hidden = true;
      archiveListEl.hidden = false;
      if (!entries.length) { archiveListEl.innerHTML = '<li class="archive-empty">아직 쓴 저널이 없어요</li>'; return; }
      archiveListEl.innerHTML = entries.map(archiveRowHTML).join('');
      archiveListEl.querySelectorAll('.archive-entry').forEach(d => window.StyleKit?.createAccordion(d));
      wireArchiveMoreButtons(archiveListEl);
      return;
    }
    archiveListEl.hidden = true;
    archiveCardsEl.hidden = false;
    const matched = entries.filter(e => e.courses.includes(archiveFilter));
    if (!matched.length) { archiveCardsEl.innerHTML = '<p class="archive-empty">이 과목이 들어간 저널이 아직 없어요</p>'; return; }
    const favSet = favorites.all();
    const sorted = [...matched].sort((a, b) => {
      const fa = favSet.has(favKey(a.date, archiveFilter)), fb = favSet.has(favKey(b.date, archiveFilter));
      return fa !== fb ? (fa ? -1 : 1) : b.date.localeCompare(a.date);
    });
    archiveCardsEl.innerHTML = sorted.map(e => archiveCardHTML(e, archiveFilter, favSet)).join('');
    wireArchiveMoreButtons(archiveCardsEl);
  }

  // ---- "수정하기"는 Journaling 탭으로 이동하는 대신 작성 세션을 Journal
  // Archive 안으로 그대로 옮겨온다 ----
  let editingInArchive = false;
  function enterArchiveEdit(date) {
    save();
    load(date);
    editingInArchive = true;
    archiveBrowse.hidden = true;
    composeSlot.hidden = false;
    composeSlot.appendChild(journalSection);
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  }
  function exitArchiveEdit() {
    if (!editingInArchive) return;
    save();
    editingInArchive = false;
    viewJournal.prepend(journalSection); // 원래 자리(.resume 위)로 복귀
    composeSlot.hidden = true;
    archiveBrowse.hidden = false;
    renderArchive();
  }
  archiveBackBtn.addEventListener('click', exitArchiveEdit);
  // ---- row/card ⋯ menu: 그냥 "수정하기" 하나뿐이다(즐겨찾기는 별표 버튼으로
  // 옮겨감) — Journaling의 본문 과목 메뉴(#course-menu)와 같은 팝업 컴포넌트 ----
  const archiveMenu = $('#archive-menu');
  let archiveMenuAnchor = null;
  function openArchiveMenu(btn, date) {
    archiveMenuAnchor = btn;
    archiveMenu.dataset.date = date;
    archiveMenu.innerHTML = '<button type="button" class="cm-item" role="menuitem" data-act="edit">수정하기</button>';
    const v = $('#view-archive').getBoundingClientRect(), a = btn.getBoundingClientRect();
    archiveMenu.hidden = false; // measure
    const w = archiveMenu.offsetWidth;
    archiveMenu.style.top = `${a.bottom - v.top + 6}px`;
    archiveMenu.style.left = `${Math.max(0, Math.min(a.right - v.left - w, v.width - w))}px`;
    popIn(archiveMenu);
    archiveMenu.querySelector('.cm-item')?.focus({ preventScroll: true });
  }
  function closeArchiveMenu(refocus = true) {
    if (!archiveMenuAnchor) return;
    const a = archiveMenuAnchor;
    archiveMenuAnchor = null;
    popOut(archiveMenu);
    if (refocus && a.isConnected) a.focus();
  }
  archiveMenu.addEventListener('click', e => {
    const b = e.target.closest('.cm-item');
    if (!b || b.dataset.act !== 'edit') return;
    const date = archiveMenu.dataset.date;
    closeArchiveMenu(false);
    enterArchiveEdit(date);
  });
  archiveMenu.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeArchiveMenu(); } });
  document.addEventListener('pointerdown', e => {
    if (archiveMenuAnchor && !archiveMenu.contains(e.target) && !archiveMenuAnchor.contains(e.target)) closeArchiveMenu(false);
  });
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
  document.addEventListener('phibrain:view', e => {
    if (e.detail.name === 'journal-archive') { renderArchive(); return; }
    exitArchiveEdit(); // 다른 탭으로 나가면 .journal을 #view-journal로 먼저 되돌린다
  });
  if (window.PhiBrain.getCurrentView() === 'journal-archive') renderArchive();

  addEventListener('pagehide', save);
  load(today);
})();
