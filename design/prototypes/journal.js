/*
  Journaling — prototype behavior.

  - Drafts autosave per date — to the server when signed in, to this browser's
    localStorage when not (journal-store.js, 온라인 전환 3단계). A saved draft is only a
    draft: nothing is filed into a course until 정리하기 → review →
    confirm, which needs the AI step that isn't connected yet. So
    정리하기 shows its real states (정리 중 → 실패 → 다시 정리하기) honestly; signed out it
    says where the draft went ("이 브라우저에 저장했어요") instead of the failure.
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
  const archiveFavsEl = $('#archive-favs'), archiveFavCardsEl = $('#archive-fav-cards');
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

  // ---- storage: server when signed in, this browser when not (journal-store.js) ----
  const store = window.PhiBrain.journalStore;

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
  // Journal Archive 안에서 수정 중인지 — 그때는 아래 버튼이 "저장하기"다(사용자 지시 2026-09-16)
  let editingInArchive = false;

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
  // what the status line says about the open date's saved copy
  function showSaveState(savedAt) {
    const st = store.syncState(current);
    if (st === 'conflict') { showConflict(); return; }
    if (!savedAt) { setStatus(''); return; }
    if (st === 'local') setStatus(`이 브라우저에만 저장됨 · ${clock(savedAt)}`);
    else if (st === 'pending') setStatus('저장 중…', 'busy');
    else if (st === 'offline') setStatus('서버에 연결되지 않아 이 기기에 보관 중 · 연결되면 올려요', 'error');
    else setStatus(`초안 저장됨 · ${clock(savedAt)}`);
  }
  // an edit made on another device got to the server first — ask, never pick silently
  function showConflict() {
    const deletedElsewhere = store.conflictCopy(current) === null;
    status.className = 'save-status is-error';
    status.innerHTML = (deletedElsewhere ? '다른 기기에서 삭제된 저널이에요' : '다른 기기에서 먼저 수정된 저널이에요')
      + `<button type="button" class="pill" data-resolve="mine">${deletedElsewhere ? '다시 저장' : '이 내용으로 저장'}</button>`
      + `<button type="button" class="pill" data-resolve="theirs">${deletedElsewhere ? '삭제 따르기' : '다른 기기 내용 불러오기'}</button>`;
  }
  status.addEventListener('click', e => {
    const b = e.target.closest('[data-resolve]');
    if (!b) return;
    const choice = b.dataset.resolve;
    if (choice === 'mine') { dirty = true; save(); } // what's on screen right now is what gets kept
    store.resolve(current, choice);
  });

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
    renderDate(); syncGuides(); refreshEmpty(); refreshTemplateState(); resetOrganize();
    if (saved || store.syncState(date) === 'conflict') showSaveState(saved?.savedAt);
    else setStatus(example ? '예시 초안 · 입력하면 자동 저장돼요' : '');
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
  // 제목도 쓴 글자도 없으면 빈 저널이다(사용자 지시 2026-09-14) — 4F 템플릿 소제목이나 과목 박스만
  // 남은 것도 빈 것으로 본다. 직접 쓴 소제목·이미지·구분선은 내용으로 친다.
  function hasContent(d) {
    if ((d?.title || '').trim()) return true;
    const frag = document.createElement('div');
    frag.innerHTML = d?.html || '';
    frag.querySelectorAll('.course-box').forEach(el => el.remove());
    frag.querySelectorAll('h3').forEach(h => { if (guideFor(h.textContent)) h.remove(); });
    return frag.textContent.trim() !== '' || !!frag.querySelector('img, hr');
  }
  function save() {
    clearTimeout(saveTimer);
    if (!dirty) return;
    dirty = false;
    const data = { title: titleInput.value.trim(), courses: [...chosen], html: editor.innerHTML, savedAt: Date.now() };
    // 썼다가 다 지웠으면 저장하지 않고, 이미 저장돼 있던 그 날짜 저널도 지운다 — Archive에 빈 저널이 남지 않게
    if (!hasContent(data)) {
      if (store.get(current)) store.remove(current);
      setStatus('');
      renderResume();
      return;
    }
    if (store.set(current, data)) showSaveState(data.savedAt);
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
    `<button type="button" class="pill" data-code="${code}" title="${code}_${name}">${code === 'general' ? 'General' : code}</button>`).join('');
  // 과목 타이포는 토글도, 선택 고정 표시도 없다 — 호버하면 다른 pill과 똑같이
  // 박스가 나타나고(공용 .pill:hover), 누르면 그 과목의 과목 박스를 작성 중인
  // 위치에 바로 넣는다. chosen에는 계속 기록해 저널 아카이브 과목 필터에 걸리게
  // 하지만, 화면에는 그 기록을 반영하지 않는다.
  // mousedown에서 기본 동작을 막아야(포맷/삽입 버튼과 동일한 방식) 클릭이
  // 에디터의 포커스·캐럿 위치를 빼앗지 않는다 — 그러지 않으면 ensureCaret()이
  // "선택이 에디터 밖"으로 보고 editor.focus()로 되돌리면서, 포커스가 옮겨갈 때
  // 브라우저가 문서 맨 위로 스크롤을 되돌리는 버그가 있었다.
  chipsEl.addEventListener('mousedown', e => e.preventDefault());
  chipsEl.addEventListener('click', e => {
    const b = e.target.closest('[data-code]');
    if (!b) return;
    const code = b.dataset.code;
    chosen.add(code);
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
    + `<span>${code === 'general' ? '<span class="nav-code">General</span>' : code ? `<span class="nav-code">${code}</span>_${courseName(code)}` : '과목 선택'}</span>`
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
      `<button type="button" class="cm-item" role="option" data-code="${code}" aria-selected="${code === cur}">${code === 'general' ? `<span class="nav-code">${name}</span>` : `<span class="nav-code">${code}</span>_${name}`}</button>`).join('');
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
  // 같은 서식 버튼이 저널 에디터와 Findings 수정 에디터(.findings-edit) 양쪽에서 돈다
  // (사용자 지시 2026-09-22 — "저널링의 툴바와 작성 매커니즘을 그대로"). fmtRoot는
  // 지금 누른 툴바가 붙은 에디터다. 저널 툴바면 #editor, Findings 박스의 툴바면 그 박스의 에디터.
  let fmtRoot = editor;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const closestIn = (node, sel) => {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    const hit = el?.closest(sel);
    return hit && fmtRoot.contains(hit) ? hit : null;
  };
  const unwrap = el => { const root = fmtRoot; el.replaceWith(...el.childNodes); root.normalize(); };
  // 툴바 버튼 → 그 툴바가 서식을 거는 에디터
  const rootForButton = btn => btn.closest('.findings-card')?.querySelector('.findings-edit') || editor;
  // 선택(캐럿)이 들어있는 에디터 — 둘 다 아니면 null
  const rootOfSelection = () => {
    const s = getSelection();
    if (!s.rangeCount) return null;
    const el = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement);
    if (editor.contains(el)) return editor;
    return el?.closest('.findings-edit') || null;
  };

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
  // 하이라이터(사용자 지시 2026-09-22 — Findings가 줄글이라 중요한 지점이 안 보여서).
  // 저장 형태는 <mark>. 드래그한 곳에 하이라이트가 하나라도 걸려 있으면(캐럿만 올려도) 걸린
  // 하이라이트를 통째로 걷어내고, 없으면 드래그한 글자에 새로 칠한다. 한 줄 안이면
  // insertHTML이라 Ctrl+Z로 되돌릴 수 있고, 여러 줄에 걸치면 브라우저 배경색 명령으로
  // 칠한 뒤 그 표시를 <mark>로 바꾼다(굵게·기울임 같은 안쪽 서식은 그대로 남는다).
  const MARK_PROBE = 'rgb(255, 238, 0)';
  function toggleHighlight() {
    const s = getSelection();
    if (!s.rangeCount) return;
    const r = s.getRangeAt(0);
    const hit = [...fmtRoot.querySelectorAll('mark')].filter(m => r.intersectsNode(m));
    if (hit.length) {
      const root = fmtRoot;
      hit.forEach(m => m.replaceWith(...m.childNodes));
      root.normalize();
      return;
    }
    if (s.isCollapsed) return;
    const startBlock = closestIn(r.startContainer, 'p, li, h3, blockquote, div');
    const endBlock = closestIn(r.endContainer, 'p, li, h3, blockquote, div');
    if (startBlock && startBlock === endBlock && startBlock !== fmtRoot) {
      const box = document.createElement('div');
      box.append(r.cloneContents());
      box.querySelectorAll('mark').forEach(m => m.replaceWith(...m.childNodes));
      document.execCommand('insertHTML', false, `<mark>${box.innerHTML}</mark>`);
      return;
    }
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('hiliteColor', false, MARK_PROBE);
    document.execCommand('styleWithCSS', false, false);
    const made = [];
    fmtRoot.querySelectorAll('[style]').forEach(el => {
      if (el.style.backgroundColor !== MARK_PROBE) return;
      el.style.removeProperty('background-color');
      const mark = document.createElement('mark');
      if (el.tagName === 'SPAN' && !el.getAttribute('style')) { el.replaceWith(mark); mark.append(...el.childNodes); }
      else { mark.append(...el.childNodes); el.append(mark); if (!el.getAttribute('style')) el.removeAttribute('style'); }
      made.push(mark);
    });
    if (made.length) {
      const nr = document.createRange();
      nr.setStartBefore(made[0]);
      nr.setEndAfter(made[made.length - 1]);
      s.removeAllRanges();
      s.addRange(nr);
    }
  }
  function applyFormat(f) {
    if (fmtRoot === editor) ensureCaret();
    else if (rootOfSelection() !== fmtRoot) { fmtRoot.focus(); return; }
    if (f === 'quote') toggleQuote();
    else if (f === 'code') toggleCode();
    else if (f === 'highlight') toggleHighlight();
    else document.execCommand(f);
    if (fmtRoot === editor) afterEdit();
    refreshFormatState();
  }
  function refreshFormatState() {
    const s = getSelection();
    const selRoot = rootOfSelection();
    document.querySelectorAll('[data-fmt]').forEach(b => {
      const f = b.dataset.fmt;
      let on = false;
      const root = rootForButton(b);
      if (selRoot && root === selRoot) {
        const prev = fmtRoot;
        fmtRoot = root;
        if (f === 'quote') on = !!closestIn(s.anchorNode, 'blockquote');
        else if (f === 'code') on = !!closestIn(s.anchorNode, 'code');
        else if (f === 'highlight') on = !!closestIn(s.anchorNode, 'mark');
        else try { on = document.queryCommandState(f); } catch { on = false; }
        fmtRoot = prev;
      }
      b.setAttribute('aria-pressed', String(on));
    });
  }
  document.addEventListener('selectionchange', refreshFormatState);

  const COMMANDS = { template: toggleTemplate };
  // 위임 — Findings 박스의 툴바는 수정하기를 누를 때 새로 그려지므로 버튼마다 달 수 없다
  document.addEventListener('mousedown', e => { if (e.target.closest('[data-cmd], [data-fmt]')) e.preventDefault(); }); // keep the editor's selection
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-cmd], [data-fmt]');
    if (!btn) return;
    if (btn.dataset.cmd) { COMMANDS[btn.dataset.cmd]?.(); return; }
    fmtRoot = rootForButton(btn);
    applyFormat(btn.dataset.fmt);
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
  // 그 외 `**내용**`은 줄 전체든 문장 중간이든 굵게(<b>)로 바꾼다 — 과목 박스는
  // 블록이라 줄 전체가 과목명일 때만 만들고, 문장 중간의 **BI**는 그냥 굵은 글자다.
  // 짝이 안 맞는 **는 원문 그대로 둔다. `**굵게 **다음` 처럼 ** 바로 안쪽에 공백이 있어도
  // 굵게로 바꾼다(디스코드에서 흔한 형태 — 사용자 지시 2026-09-16). 그 공백은 <b> 밖에 그대로 남긴다.
  const inlineBold = s => esc(s).replace(/\*\*(\s*)(\S(?:(?:(?!\*\*)[\s\S])*?\S)?)(\s*)\*\*/g, '$1<b>$2</b>$3');
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
      }
      return `<p>${inlineBold(line)}</p>`;
    }).join('');
  }
  editor.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'p'));
  editor.addEventListener('input', afterEdit);
  // paste as plain text so Discord/Notion styling doesn't leak in. Findings 수정 에디터는
  // 한 과목의 Finding 조각이라 4F 소제목·과목 박스를 새로 만들지 않고 줄과 **굵게**만 살린다
  // (거기서 과목 박스가 생기면 그 조각이 다른 과목으로 쪼개진다).
  function pastePlain(e, structured) {
    e.preventDefault();
    // normalize \r\n/\r first — leaving \r in place makes execCommand('insertText')
    // treat \r and \n as separate breaks, turning one blank line into three
    const text = e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
    if (!text.includes('\n')) { document.execCommand('insertText', false, text); return; }
    if (structured) ensureCaret();
    document.execCommand('insertHTML', false, structured ? pastedTextToHtml(text)
      : text.split('\n').map(l => (l.trim() ? `<p>${inlineBold(l.trim())}</p>` : '<p><br></p>')).join(''));
  }
  editor.addEventListener('paste', e => pastePlain(e, true));
  editor.addEventListener('click', e => {
    const box = e.target.closest('.course-box');
    if (box) { menuBox === box ? closeCourseMenu() : openCourseMenu(box); return; }
    const li = e.target.closest('ul.checklist > li'); // the circle sits left of the <li> box
    if (li && e.clientX < li.getBoundingClientRect().left) { li.toggleAttribute('data-done'); scheduleSave(); }
  });

  // ---- 정리하기: the AI step isn't connected, so it shows the failure path.
  // Journal Archive 안에서 수정할 때만은 AI 정리가 아니라 저장이라, 버튼도 "저장하기"고
  // 끝나면 저장됐다고만 알린다(사용자 지시 2026-09-16) ----
  function resetOrganize() { organize.disabled = false; organize.textContent = editingInArchive ? '저장하기' : '정리하기'; }
  organize.addEventListener('click', () => {
    if (isEmpty()) { setStatus(editingInArchive ? '저장할 내용을 먼저 적어주세요' : '정리할 내용을 먼저 적어주세요', 'error'); editor.focus(); return; }
    save();
    if (fiBtn.checked && !registerFutureItems()) return;
    if (editingInArchive) { setStatus('변경 사항이 저장되었어요.'); return; }
    organize.disabled = true;
    setStatus('정리 중…', 'busy');
    setTimeout(() => {
      organize.disabled = false;
      organize.textContent = '다시 정리하기';
      // 로그아웃(브라우저 저장) 상태에서는 실패 문구 대신 저장된 곳을 알려준다(사용자 지시 2026-09-14)
      if (store.mode === 'local' && store.get(current)) { setStatus('이 브라우저에 저장했어요'); return; }
      setStatus('정리하지 못했어요 · AI가 아직 연결되지 않았어요', 'error');
    }, 1600);
  });

  // ---- resume lists ----
  const item = (title, meta, attrs = '') =>
    `<li><button type="button" class="nav-tab" ${attrs}><span class="ri-title">${title}</span><span class="ri-meta">${meta}</span></button></li>`;
  function renderResume() {
    const draftDates = new Set([...Object.keys(EXAMPLES), ...store.dates().filter(date => hasContent(store.get(date)))]);
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
  // 복수 선택(사용자 확정, Future Item·Findings와 같은 켜고 끄기) — 빈 배열 = All.
  // 늘 General → 과목 순서로 정규화해 둔다. 해시는 쉼표로: #journal-archive/BI,EWA
  let archiveFilters = [];
  const ARCHIVE_KEYS = ['general', ...COURSES.map(c => c[0])];
  const orderArchiveFilters = fs => ARCHIVE_KEYS.filter(k => fs.includes(k));
  const openArchive = new Set(); // dates currently dropped open — stays pinned across filter/view changes
  const archiveHashFor = fs => (fs.length ? `#journal-archive/${fs.join(',')}` : '#journal-archive');
  const archiveFilterFromHash = h => {
    if (!h.startsWith('#journal-archive')) return [];
    return orderArchiveFilters((h.split('/')[1] || '').split(',').map(p => {
      const raw = p.trim().toUpperCase();
      if (raw === 'GENERAL') return 'general';
      return ALIASES[raw] || raw;
    }));
  };
  function archiveEntries() {
    return store.dates().map(date => {
      const d = store.get(date);
      if (!d || !hasContent(d)) return null; // 예전에 저장된 빈 저널은 보여주지 않는다
      return { date, title: (d.title || '').trim() || `${monthDay(date)} 저널`, courses: d.courses || [], savedAt: d.savedAt || 0, html: d.html || '' };
    }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
  }
  function renderArchiveFilters(entries) {
    const count = k => entries.filter(e => k === 'all' || e.courses.includes(k)).length;
    const pressed = k => (k === 'all' ? !archiveFilters.length : archiveFilters.includes(k));
    const pill = (k, label) => `<button type="button" class="pill fi-filter" data-archive-filter="${k}" aria-pressed="${pressed(k)}">`
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
  // stored with the journals (journal-store.js): server when signed in, this browser when not
  const favKey = (date, course) => `${date}::${course}`;
  const favorites = store.favorites;
  // 즐겨찾기는 Future Item 과목 박스와 같은 별표(.fi-box-fav, CSS background로
  // 옅은 회색/검정 SVG를 바꿔 끼우는 방식)를 그대로 재사용 — 카드 헤더에 두면 CSS도 공짜
  // showCourse: 과목을 여럿 골랐을 때만 카드 메타에 과목을 붙인다 — 같은 날짜 카드가
  // 과목별로 나란히 생기므로 어느 과목 몫인지 구분이 필요하다(하나만 고르면 자명해서 생략)
  const archiveCardHTML = (e, course, favSet, showCourse = false) => {
    const isFav = favSet.has(favKey(e.date, course));
    const meta = [showCourse ? (course === 'general' ? 'General' : course) : '', e.savedAt ? clock(e.savedAt) : ''].filter(Boolean).join(' · ');
    return `
    <div class="archive-card${isFav ? ' is-fav' : ''}" data-date="${e.date}">
      <header class="fi-box-head archive-card-head">
        <h2 class="fi-box-title">${esc(e.title)}</h2>
        <span class="resume-count">${esc(meta)}</span>
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
  // All 목록 아래 즐겨찾기 묶음(사용자 지시 2026-09-14): 별표한 (날짜, 과목) 카드를 최신 날짜 → 과목 순으로,
  // 과목이 여럿 섞이므로 카드 메타에 과목을 붙인다. 별표를 끄면 여기서 바로 빠진다. 없으면 묶음째 숨김.
  function renderArchiveFavorites(entries) {
    const favSet = favorites.all();
    const byDate = new Map(entries.map(e => [e.date, e]));
    const cards = [...favSet].map(k => {
      const [date, course] = k.split('::');
      const e = byDate.get(date);
      return e && e.courses.includes(course) ? { e, course } : null;
    }).filter(Boolean).sort((a, b) => b.e.date.localeCompare(a.e.date) || ARCHIVE_KEYS.indexOf(a.course) - ARCHIVE_KEYS.indexOf(b.course));
    archiveFavsEl.hidden = !cards.length;
    archiveFavCardsEl.innerHTML = cards.map(({ e, course }) => archiveCardHTML(e, course, favSet, true)).join('');
    wireArchiveMoreButtons(archiveFavCardsEl);
  }
  // All: 기존 목록. 과목 필터(하나 이상): 고른 과목이 들어간 (날짜, 과목)마다 그 과목
  // 내용만 뽑은 카드 그리드 — 둘 중 하나만 보이도록 archiveListEl/archiveCardsEl을 토글
  function renderArchiveList(entries) {
    // snapshot which rows are currently dropped open before the rebuild wipes them
    archiveListEl.querySelectorAll('.archive-entry').forEach(d => (d.open ? openArchive.add(d.dataset.date) : openArchive.delete(d.dataset.date)));
    if (!archiveFilters.length) {
      archiveCardsEl.hidden = true;
      archiveListEl.hidden = false;
      renderArchiveFavorites(entries);
      if (!entries.length) { archiveListEl.innerHTML = '<li class="archive-empty">아직 쓴 저널이 없어요</li>'; return; }
      archiveListEl.innerHTML = entries.map(archiveRowHTML).join('');
      archiveListEl.querySelectorAll('.archive-entry').forEach(d => window.StyleKit?.createAccordion(d));
      wireArchiveMoreButtons(archiveListEl);
      return;
    }
    archiveFavsEl.hidden = true;
    archiveListEl.hidden = true;
    archiveCardsEl.hidden = false;
    // 카드 한 장 = (날짜, 과목). 정렬: 즐겨찾기 먼저 → 최신 날짜 → 같은 날은 과목 순서
    const cards = entries.flatMap(e => archiveFilters.filter(c => e.courses.includes(c)).map(course => ({ e, course })));
    if (!cards.length) {
      archiveCardsEl.innerHTML = `<p class="archive-empty">${archiveFilters.length > 1 ? '고른 과목이 들어간 저널이 아직 없어요' : '이 과목이 들어간 저널이 아직 없어요'}</p>`;
      return;
    }
    const favSet = favorites.all();
    const multi = archiveFilters.length > 1;
    cards.sort((a, b) => {
      const fa = favSet.has(favKey(a.e.date, a.course)), fb = favSet.has(favKey(b.e.date, b.course));
      if (fa !== fb) return fa ? -1 : 1;
      return b.e.date.localeCompare(a.e.date) || ARCHIVE_KEYS.indexOf(a.course) - ARCHIVE_KEYS.indexOf(b.course);
    });
    archiveCardsEl.innerHTML = cards.map(({ e, course }) => archiveCardHTML(e, course, favSet, multi)).join('');
    wireArchiveMoreButtons(archiveCardsEl);
  }

  // ---- "수정하기"는 Journaling 탭으로 이동하는 대신 작성 세션을 Journal
  // Archive 안으로 그대로 옮겨온다 ----
  function enterArchiveEdit(date) {
    save();
    editingInArchive = true; // load() 안의 resetOrganize()가 "저장하기"로 쓰도록 먼저 켠다
    load(date);
    archiveBrowse.hidden = true;
    composeSlot.hidden = false;
    composeSlot.appendChild(journalSection);
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  }
  function exitArchiveEdit() {
    if (!editingInArchive) return;
    save();
    editingInArchive = false;
    resetOrganize();
    viewJournal.prepend(journalSection); // 원래 자리(.resume 위)로 복귀
    composeSlot.hidden = true;
    archiveBrowse.hidden = false;
    renderArchive();
  }
  archiveBackBtn.addEventListener('click', exitArchiveEdit);

  // ---- 삭제하기: ⋯ 메뉴의 확인 단계(showDeleteConfirm)를 거친 뒤 지우고, 되돌리기
  // 토스트도 그대로 남긴다(Future Item 삭제와 같은 패턴). 지우는 날짜를 지금 편집 중이었다면(Archive 안 편집이든 Journaling
  // 탭 자체든) 그 화면부터 정리해서 방금 지운 초안이 되살아나 보이지 않게 한다 ----
  function deleteJournal(date) {
    const data = store.get(date);
    if (!data) return;
    store.remove(date);
    favorites.removeForDate(date);
    if (editingInArchive && current === date) {
      editingInArchive = false;
      resetOrganize();
      viewJournal.prepend(journalSection);
      composeSlot.hidden = true;
      archiveBrowse.hidden = false;
    } else if (current === date) {
      load(date); // store.get(date)이 이제 없으니 예시/빈 문서로 되돌아간다
    }
    renderArchive();
    window.PhiBrain.ui.toast('삭제했어요', {
      label: '되돌리기',
      run: () => { store.set(date, data); renderArchive(); if (current === date) load(date); },
    });
  }

  // ---- row/card ⋯ menu: "수정하기"·"삭제하기"(즐겨찾기는 별표 버튼으로
  // 옮겨감) — Journaling의 본문 과목 메뉴(#course-menu)와 같은 팝업 컴포넌트 ----
  const archiveMenu = $('#archive-menu');
  let archiveMenuAnchor = null;
  function openArchiveMenu(btn, date) {
    archiveMenuAnchor = btn;
    archiveMenu.dataset.date = date;
    archiveMenu.innerHTML = '<button type="button" class="cm-item" role="menuitem" data-act="edit">수정하기</button>'
      + '<button type="button" class="cm-item" role="menuitem" data-act="delete">삭제하기</button>';
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
  // "삭제하기"는 바로 지우지 않고 같은 팝업을 확인 단계로 바꾼다(사용자 확정) —
  // 브라우저 기본 confirm() 대화상자 대신 메뉴 자리에서 묻는다. 기본 포커스는
  // "취소"에 둬서 Enter 연타로 지워지지 않게 한다.
  function showDeleteConfirm(date) {
    const title = store.get(date)?.title || monthDay(date);
    archiveMenu.innerHTML = `<p class="cm-confirm">"${esc(title)}" 저널을 삭제할까요?</p>`
      + '<button type="button" class="cm-item cm-danger" role="menuitem" data-act="confirm-delete">삭제</button>'
      + '<button type="button" class="cm-item" role="menuitem" data-act="cancel">취소</button>';
    archiveMenu.querySelector('[data-act="cancel"]').focus({ preventScroll: true });
  }
  archiveMenu.addEventListener('click', e => {
    const b = e.target.closest('.cm-item');
    if (!b) return;
    const date = archiveMenu.dataset.date;
    if (b.dataset.act === 'delete') { showDeleteConfirm(date); return; } // 메뉴는 열어 둔 채 확인 단계로
    closeArchiveMenu(b.dataset.act === 'cancel');
    if (b.dataset.act === 'edit') enterArchiveEdit(date);
    else if (b.dataset.act === 'confirm-delete') deleteJournal(date);
  });
  archiveMenu.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeArchiveMenu(); return; }
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const items = [...archiveMenu.querySelectorAll('.cm-item')], i = items.indexOf(document.activeElement);
    items[(i + step + items.length) % items.length].focus();
  });
  document.addEventListener('pointerdown', e => {
    if (archiveMenuAnchor && !archiveMenu.contains(e.target) && !archiveMenuAnchor.contains(e.target)) closeArchiveMenu(false);
  });
  // where the list comes from
  const archiveHint = $('#archive-hint');
  function renderArchiveHint() {
    if (store.mode === 'local') {
      archiveHint.textContent = '이 브라우저에 저장된 저널만 보여요 — 로그인하면 어느 기기에서든 같은 저널을 볼 수 있어요.';
      return;
    }
    if (!store.loaded) { archiveHint.textContent = store.offline ? '서버에 연결하지 못해 이 기기에 보관된 저널을 보여줘요.' : '서버에서 저널을 불러오는 중…'; return; }
    archiveHint.textContent = '로그인한 모든 기기에서 같은 저널이 보여요.';
  }

  function renderArchive() {
    renderArchiveHint();
    archiveFilters = archiveFilterFromHash(location.hash);
    const entries = archiveEntries();
    renderArchiveFilters(entries);
    renderArchiveList(entries);
    if (window.PhiBrain.getCurrentView() === 'journal-archive') history.replaceState(null, '', archiveHashFor(archiveFilters));
  }
  // pill 클릭: All은 선택 해제, 과목은 켜고 끄기(마지막 하나를 끄면 All)
  archiveFiltersEl.addEventListener('click', e => {
    const b = e.target.closest('[data-archive-filter]');
    if (!b) return;
    const k = b.dataset.archiveFilter;
    archiveFilters = k === 'all' ? [] : orderArchiveFilters(archiveFilters.includes(k) ? archiveFilters.filter(x => x !== k) : [...archiveFilters, k]);
    history.replaceState(null, '', archiveHashFor(archiveFilters));
    const entries = archiveEntries();
    renderArchiveFilters(entries);
    renderArchiveList(entries);
    archiveFiltersEl.querySelector(`[data-archive-filter="${k}"]`)?.focus();
  });
  document.addEventListener('phibrain:view', e => {
    if (e.detail.name === 'journal-archive') { renderArchive(); return; }
    exitArchiveEdit(); // 다른 탭으로 나가면 .journal을 #view-journal로 먼저 되돌린다
  });
  if (window.PhiBrain.getCurrentView() === 'journal-archive') renderArchive();

  // ---- Findings: insight excerpts pulled from saved journals' "Finding" 4F
  // section, grouped by the day's 다룬 과목(courses[]) — read-only, no separate
  // store (same principle as Journal Archive). A Finding written on a day with
  // no course checked falls into General rather than being dropped. ----
  const findingsFiltersEl = $('#findings-filters'), findingsListEl = $('#findings-list');
  // 복수 선택(사용자 확정) — 빈 배열 = All. 해시는 쉼표로: #findings/BI,EWA
  // 별표만 모아 보기(사용자 지시 2026-09-17)는 과목이 아니라 보기 방식이라 따로 둔다 — #findings/fav.
  // 과목 필터와는 배타적: 한쪽을 켜면 다른 쪽이 풀린다(둘을 겹치면 "BI 중 별표"인지 "BI 또는 별표"인지 모호해진다).
  const FAV_FILTER = 'fav';
  let findingsFilters = [];
  let findingsFavOnly = false;
  const findingsHashFor = () => (findingsFavOnly ? `#findings/${FAV_FILTER}`
    : findingsFilters.length ? `#findings/${findingsFilters.join(',')}` : '#findings');
  const findingsFilterFromHash = h => {
    if (!h.startsWith('#findings')) return [];
    const parts = (h.split('/')[1] || '').split(',').map(p => p.trim());
    if (parts.some(p => p.toLowerCase() === FAV_FILTER)) return [FAV_FILTER];
    return parts.map(p => {
      const raw = p.toUpperCase();
      if (raw === 'GENERAL') return 'general';
      const code = ALIASES[raw] || raw;
      return COURSES.some(c => c[0] === code) ? code : null;
    }).filter(Boolean);
  };
  // Findings에는 과목 태그를 단 Finding만 들어간다(사용자 확정) — Finding 섹션
  // 안에서 과목 박스 뒤 ~ 다음 과목 박스 전까지가 그 과목의 몫이고, 그 박스에만
  // 들어간다. 태그 앞에 쓴 내용이나 태그가 아예 없는 Finding은 보여주지 않는다
  // (칩·General로 떨어뜨리던 예전 폴백은 빈 줄만 있는 앞머리까지 "General 1"로
  // 잡는 등 사용자가 고르지 않은 배정을 만들었다). General도 태그로 고른 경우만.
  // 과목 박스 자체는 빼고 담는다 — 어느 박스에 들어있는지가 이미 과목을 말해 준다.
  const isBlankBlock = el => el.textContent.trim() === '' && !el.querySelector('img, hr');
  // 조각마다 원문의 요소 목록(els)까지 돌려준다 — Findings에서 고친 내용을 저널의 그 자리에 되돌려 쓰려고
  function findingSliceNodes(frag) {
    const slices = [];
    let capturing = false, cur = null;
    const flush = () => {
      if (!cur) return;
      // 태그 바로 뒤·다음 태그 직전의 빈 줄(<p><br></p>)은 잘라 박스 위아래 공백을 없앤다
      while (cur.els.length && isBlankBlock(cur.els[0])) cur.els.shift();
      while (cur.els.length && isBlankBlock(cur.els[cur.els.length - 1])) cur.els.pop();
      if (cur.els.length) slices.push({ course: cur.course, els: cur.els });
      cur = null;
    };
    [...frag.children].forEach(el => {
      if (el.tagName === 'H3') { flush(); capturing = el.textContent.trim().toLowerCase() === 'finding'; return; }
      if (!capturing) return;
      if (el.classList.contains('course-box')) { flush(); cur = { course: ALIASES[el.dataset.course] || el.dataset.course || '', els: [] }; return; }
      if (cur) cur.els.push(el); // cur가 없으면 = 첫 태그 앞 내용 → 버린다
    });
    flush();
    return slices.filter(s => JOURNAL_SCOPES.some(c => c[0] === s.course));
  }
  function findingSlices(html) {
    const frag = document.createElement('div');
    frag.innerHTML = html;
    return findingSliceNodes(frag).map(s => ({ course: s.course, html: s.els.map(el => el.outerHTML).join('') }));
  }
  // 키(날짜::과목::n)가 가리키는 조각을 newHtml로 바꾼 저널 본문. 못 찾으면 null.
  // n은 findingsEntries와 같은 규칙(그 날 그 과목의 몇 번째 조각)으로 센다.
  function replaceFindingSlice(html, course, n, newHtml) {
    const frag = document.createElement('div');
    frag.innerHTML = html;
    const target = findingSliceNodes(frag).filter(s => s.course === course)[n];
    if (!target) return null;
    const tmp = document.createElement('div');
    tmp.innerHTML = newHtml;
    target.els[0].before(...tmp.childNodes);
    target.els.forEach(el => el.remove());
    return frag.innerHTML;
  }
  // 별표 하나가 박스 하나 — 같은 과목 안에서도 중요한 Finding만 앞에 세우려고(사용자 지시 2026-09-16).
  // 박스 키는 "날짜::과목::그 날 그 과목의 몇 번째". 저널을 고쳐 Finding 순서가 바뀌면 별표도 그 자리를 따라간다.
  function findingsEntries() {
    const out = [];
    store.dates().sort((a, b) => b.localeCompare(a)).forEach(date => {
      const d = store.get(date);
      if (!d || !d.html) return;
      const seen = new Map();
      findingSlices(d.html).forEach(s => {
        const n = seen.get(s.course) || 0;
        seen.set(s.course, n + 1);
        out.push({ date, html: s.html, courses: [s.course], key: `${date}::${s.course}::${n}` });
      });
    });
    return out;
  }
  function findingsByBox() {
    const map = new Map();
    findingsEntries().forEach(e => e.courses.forEach(c => {
      if (!map.has(c)) map.set(c, []);
      map.get(c).push(e);
    }));
    return map;
  }
  // 과목별 큰 박스는 없앴다(사용자 지시 2026-09-16) — Finding 하나가 곧 박스 하나고,
  // 과목 이름·날짜·별표는 그 박스의 머리줄에 들어간다. 별표도 박스 하나씩 따로 켠다.
  // 수정하기(사용자 지시 2026-09-22): 박스 안에서 그 과목의 Finding 조각만 고친다. 툴바는 저널링과
  // 같은 서식 버튼(4F 템플릿·과목 박스는 조각을 쪼개므로 뺀다). 저장하면 원래 저널의 그 자리가 바뀐다.
  // 한 번에 박스 하나만 — 편집 중인 내용은 findingsDraft에 들고 있어 별표·필터로 다시 그려져도 남는다.
  const FINDINGS_TOOLS = [
    ['bold', '굵게', '<b>B</b>'], ['italic', '기울임', '<i>I</i>'], ['underline', '밑줄', '<u>U</u>'],
    ['strikeThrough', '취소선', '<s>S</s>'], ['highlight', '하이라이트', '<span class="ico-mark" aria-hidden="true">H</span>'], null,
    ['quote', '인용', '<span class="ico-quote" aria-hidden="true"></span>'], ['code', '코드', '<span class="ico-code" aria-hidden="true">&lt;/&gt;</span>'],
  ].map(t => (t ? `<button type="button" class="pill pill-icon" data-fmt="${t[0]}" aria-pressed="false" aria-label="${t[1]}" title="${t[1]}">${t[2]}</button>`
    : '<span class="tool-sep" aria-hidden="true"></span>')).join('');
  let findingsEditKey = null, findingsDraft = '';
  function findingsCardHTML(key, e) {
    const label = key === 'general' ? 'General' : `<span class="nav-code">${esc(key)}</span>_${esc(courseName(key))}`;
    const isFav = store.findingsFavorites.all().includes(e.key);
    const plain = `${key === 'general' ? 'General' : key} ${monthDay(e.date)}`;
    const editing = findingsEditKey === e.key;
    return `<section class="fi-box findings-card${editing ? ' is-editing' : ''}" data-box="${key}" data-key="${esc(e.key)}">
      <header class="fi-box-head">
        <h2 class="fi-box-title">${label}</h2>
        <span class="findings-date">${esc(monthDay(e.date))}</span>
        ${editing ? '' : `<button type="button" class="findings-edit-btn" data-findings-edit="${esc(e.key)}" aria-label="수정하기: ${esc(plain)}">수정하기</button>`}
        <button type="button" class="fi-box-fav${isFav ? ' is-fav' : ''}" data-findings-fav="${esc(e.key)}" aria-pressed="${isFav}" aria-label="${isFav ? '즐겨찾기 해제' : '즐겨찾기'}: ${esc(plain)}"></button>
      </header>
      ${editing
        ? `<div class="editor-tools findings-tools" role="toolbar" aria-label="서식">${FINDINGS_TOOLS}</div>
      <div class="editor findings-edit" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Finding 수정">${findingsDraft}</div>
      <div class="findings-edit-foot">
        <button type="button" class="pill" data-findings-cancel>취소</button>
        <button type="button" class="btn-primary" data-findings-save>저장하기</button>
      </div>`
        : `<div class="editor archive-preview findings-body">${e.html}</div>`}
    </section>`;
  }
  // 내용이 있는 과목만 — 필터 pill도 박스도 빈 과목은 아예 그리지 않는다(사용자 확정)
  const findingsKeys = box => ['general', ...COURSES.map(c => c[0])].filter(k => box.has(k));
  // 별표한 박스만 — 별표한 순서 그대로. 저널을 고쳐 사라진 Finding의 별표는 셈에서 빠진다
  function starredCards(box) {
    const all = findingsKeys(box).flatMap(k => (box.get(k) || []).map(e => [k, e]));
    return store.findingsFavorites.all()
      .map(key => all.find(([, e]) => e.key === key))
      .filter(Boolean);
  }
  function renderFindingsFilters(box) {
    const total = [...box.values()].reduce((n, list) => n + list.length, 0);
    const pressed = k => (k === 'all' ? !findingsFilters.length && !findingsFavOnly
      : k === FAV_FILTER ? findingsFavOnly : findingsFilters.includes(k));
    const pill = (k, label, n) => `<button type="button" class="pill fi-filter" data-findings-filter="${k}" aria-pressed="${pressed(k)}">`
      + `${label}<span class="f-count" aria-hidden="true">${n}</span></button>`;
    const favCount = starredCards(box).length;
    findingsFiltersEl.innerHTML = pill('all', 'All', total)
      // 별표가 하나도 없으면 아예 그리지 않는다 — 빈 과목 pill을 안 그리는 것과 같은 규칙
      + (favCount ? pill(FAV_FILTER, '즐겨찾기', favCount) : '')
      + findingsKeys(box).map(k => pill(k, k === 'general' ? 'General' : k, box.get(k).length)).join('');
  }
  // 즐겨찾기(사용자 요구사항 2026-09-14, 박스 단위로 2026-09-16): Future Item 박스와 같은 별표.
  // 별표한 박스가 별표한 순서대로 앞에 서고("즐겨찾기 / 과목" 구분 줄은 없앴다), 나머지는
  // 과목 순서 → 최신 날짜 순. 과목 필터를 고른 상태에서도 그 안에서 별표가 앞이다.
  function renderFindingsList(box) {
    const keys = findingsKeys(box);
    if (!keys.length) {
      findingsListEl.innerHTML = '<p class="fi-box-empty">아직 없어요. 저널의 Finding 아래에 과목 태그를 달면 여기에 모여요.</p>';
      return;
    }
    if (findingsFavOnly) {
      const fav = starredCards(box);
      findingsListEl.innerHTML = fav.length
        ? fav.map(([k, e]) => findingsCardHTML(k, e)).join('')
        : '<p class="fi-box-empty">별표한 Finding이 없어요. 박스의 별표를 누르면 여기에 모여요.</p>';
      return;
    }
    const cards = (findingsFilters.length ? findingsFilters : keys)
      .flatMap(k => (box.get(k) || []).map(e => [k, e]));
    const starred = store.findingsFavorites.all(); // 별표한 순서 그대로
    const rank = c => { const i = starred.indexOf(c[1].key); return i === -1 ? Infinity : i; };
    cards.sort((a, b) => rank(a) - rank(b)); // 안정 정렬 — 별표 없는 박스끼리는 원래 순서 유지
    findingsListEl.innerHTML = cards.map(([k, e]) => findingsCardHTML(k, e)).join('');
  }
  const findingsEditEl = () => findingsListEl.querySelector('.findings-edit');
  function startFindingEdit(key) {
    if (findingsEditKey && findingsEditKey !== key && !confirm('수정 중인 Finding이 있어요. 저장하지 않고 다른 박스를 수정할까요?')) return;
    const entry = findingsEntries().find(x => x.key === key);
    if (!entry) return;
    if (current === entry.date) save(); // 저널링 탭에 같은 날짜가 열려 있으면 자동 저장 대기분부터 올린다
    findingsEditKey = key;
    findingsDraft = entry.html;
    renderFindings();
    const ed = findingsEditEl();
    if (!ed) return;
    ed.focus();
    const r = document.createRange();
    r.selectNodeContents(ed);
    r.collapse(false);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
  }
  function endFindingEdit() {
    findingsEditKey = null;
    findingsDraft = '';
    renderFindings();
  }
  function saveFindingEdit() {
    const ed = findingsEditEl();
    if (!ed || !findingsEditKey) return;
    const [date, course, nStr] = findingsEditKey.split('::');
    const d = store.get(date);
    const html = d && replaceFindingSlice(d.html, course, Number(nStr), ed.innerHTML);
    if (html == null) { window.PhiBrain.ui.toast('원래 저널에서 이 Finding을 찾지 못했어요'); return; }
    if (!store.set(date, { ...d, html, savedAt: Date.now() })) { window.PhiBrain.ui.toast('저장하지 못했어요'); return; }
    const key = findingsEditKey;
    if (current === date) load(date); // 저널링 탭에도 고친 내용이 바로 보이게
    endFindingEdit();
    window.PhiBrain.ui.toast('변경 사항이 저장되었어요.');
    findingsListEl.querySelector(`[data-findings-edit="${key}"]`)?.focus({ preventScroll: true });
  }
  findingsListEl.addEventListener('input', e => { const ed = e.target.closest('.findings-edit'); if (ed) findingsDraft = ed.innerHTML; });
  findingsListEl.addEventListener('focusin', e => { if (e.target.closest('.findings-edit')) document.execCommand('defaultParagraphSeparator', false, 'p'); });
  findingsListEl.addEventListener('paste', e => { if (e.target.closest('.findings-edit')) pastePlain(e, false); });
  findingsListEl.addEventListener('keydown', e => {
    if (!e.target.closest('.findings-edit')) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveFindingEdit(); }
  });
  findingsListEl.addEventListener('click', e => {
    if (e.target.closest('[data-findings-edit]')) { startFindingEdit(e.target.closest('[data-findings-edit]').dataset.findingsEdit); return; }
    if (e.target.closest('[data-findings-save]')) { saveFindingEdit(); return; }
    if (e.target.closest('[data-findings-cancel]')) { endFindingEdit(); return; }
    const b = e.target.closest('[data-findings-fav]');
    if (!b) return;
    const key = b.dataset.findingsFav;
    store.findingsFavorites.toggle(key);
    // 별표를 켜고 끄면 "즐겨찾기" pill의 개수도 달라진다. 즐겨찾기 보기에서 마지막 별표를 끄면 All로 돌아간다
    applyFindingsFilters(findingsFavOnly ? [FAV_FILTER] : findingsFilters, findingsByBox());
    findingsListEl.querySelector(`[data-findings-fav="${key}"]`)?.focus();
  });
  // 화면 순서로 정렬 + 내용 없는 과목(딥링크로 들어온 빈 과목 포함)은 뺀다
  function applyFindingsFilters(fs, box) {
    findingsFavOnly = fs.includes(FAV_FILTER) && starredCards(box).length > 0; // 별표가 없으면 All로 돌아간다
    findingsFilters = findingsFavOnly ? [] : findingsKeys(box).filter(k => fs.includes(k));
    renderFindingsFilters(box);
    renderFindingsList(box);
    if (window.PhiBrain.getCurrentView() === 'findings') history.replaceState(null, '', findingsHashFor());
  }
  function renderFindings() {
    applyFindingsFilters(findingsFilterFromHash(location.hash), findingsByBox());
  }
  // pill 클릭: All은 선택 해제, 과목은 켜고 끄기(마지막 하나를 끄면 All). 박스는 .findings-list
  // 2열 그리드 그대로라 몇 개를 골라도 한 줄 최대 2개
  findingsFiltersEl.addEventListener('click', e => {
    const b = e.target.closest('[data-findings-filter]');
    if (!b) return;
    const k = b.dataset.findingsFilter;
    const next = k === 'all' ? []
      : k === FAV_FILTER ? (findingsFavOnly ? [] : [FAV_FILTER])            // 다시 누르면 All로
      : findingsFavOnly ? [k]                                              // 즐겨찾기 보기에서 과목을 고르면 그 과목만
      : findingsFilters.includes(k) ? findingsFilters.filter(x => x !== k)
      : [...findingsFilters, k];
    applyFindingsFilters(next, findingsByBox());
    findingsFiltersEl.querySelector(`[data-findings-filter="${k}"]`)?.focus();
  });
  document.addEventListener('phibrain:view', e => { if (e.detail.name === 'findings') renderFindings(); });
  if (window.PhiBrain.getCurrentView() === 'findings') renderFindings();

  // ---- server data arriving / sign-in / sign-out (journal-store.js) ----
  store.onBeforeModeChange(() => save()); // the last keystrokes go to the store they were typed for
  store.onChange(({ reason, date } = {}) => {
    if (reason === 'mode' || (reason === 'resolved' && date === current)) { dirty = false; load(current); }
    else if (!dirty) {
      // a fresher copy from the server — reload only if it differs, so the caret isn't thrown away for nothing
      const d = store.get(current);
      if (d && (d.html !== editor.innerHTML || (d.title || '') !== titleInput.value.trim())) load(current);
      else if (d) showSaveState(d.savedAt);
    }
    renderResume();
    const view = window.PhiBrain.getCurrentView();
    if (view === 'journal-archive' && !editingInArchive) renderArchive();
    if (view === 'findings') renderFindings();
  });
  store.onSync(date => {
    if (date === current && !dirty) showSaveState(store.get(date)?.savedAt);
  });
  store.onNotice(n => {
    const { toast } = window.PhiBrain.ui;
    if (n.type === 'conflict' && n.date !== current) {
      toast(`${monthDay(n.date)} 저널이 다른 기기에서 먼저 수정돼 저장을 멈췄어요`, { label: '열기', run: () => window.PhiBrain.openJournal(n.date) }, 'error');
    } else if (n.type === 'error') {
      toast(n.error === 'journal_too_large' ? '저널이 너무 커서 서버에 저장하지 못했어요' : `${monthDay(n.date)} 저널을 서버에 저장하지 못했어요`, null, 'error');
    } else if (n.type === 'favorite-failed') {
      toast('즐겨찾기를 저장하지 못했어요', null, 'error');
    }
  });

  // 지난 할 일 = Future Item — redraw when that board arrives from the server or switches with sign-in/out
  document.addEventListener('phibrain:future-changed', renderResume);

  addEventListener('pagehide', () => save());
  load(today);
})();
