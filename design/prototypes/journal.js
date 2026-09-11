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
  const coursesEl = $('#courses'), chipsEl = $('#course-chips'), chosenEl = $('#courses-chosen'), coursesToggle = $('#courses-toggle');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE = 'cubic-bezier(.22,1,.36,1)';

  const COURSES = [
    ['AL', 'Aesthetic Literacy'], ['AOR', 'Art of Reading'], ['BI', 'Beautiful Interface'],
    ['EAI', 'Engaging with AI'], ['IAE', 'Interviewing as Exploration'], ['IPS', 'Iterative Problem Solving'],
    ['PC', 'Peer Coaching'], ['RW', 'Readable Writing'], ['SI', 'Self Introduction'],
    ['TF', 'Typography as Foundation'], ['VT', 'Visual Translation'], ['WI', 'What If'],
  ];
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
  const guideFor = text => FOUR_F.find(([f]) => f.toLowerCase() === text.trim().toLowerCase())?.[1];
  const section = (f, body) => `<h3 data-guide="${guideFor(f)}">${f}</h3>` + (body ?? '<p><br></p>');
  const EXAMPLES = {
    [today]: {
      courses: ['AOR', 'BI'],
      html: section('Fact', '<ul><li>BI — 영준님의 BI 수업을 들었다. 과제를 어떤 프로세스로 했는지 도식화해서 보여주셨고, 그 과정을 따라가며 내가 적용할 지점을 메모했다.</li><li>AOR — 사전과제에서 했던 내용을 각자 디벨롭하며 공유하는 시간을 가졌다.</li></ul>')
        + section('Feeling') + section('Finding') + section('Future Item'),
    },
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
  const TODO = [ // open Future Items from past journals (examples)
    ['BI', '과제 프로세스를 도식화하고 적용할 지점을 표시하기'],
    ['AOR', '사전과제 디벨롭 내용을 한 장으로 정리해 공유하기'],
    ['SI', '자기소개 초안을 세 문장으로 줄여보기'],
  ];

  // ---- state ----
  let current = today, chosen = new Set(), saveTimer = 0, dirty = false;

  const isEmpty = () => editor.textContent.trim() === '' && !editor.querySelector('h3, li');
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
    current = date;
    const saved = store.get(date);
    const example = !saved && EXAMPLES[date];
    const data = saved || example || { title: '', courses: [], html: '' };
    titleInput.value = data.title || '';
    editor.innerHTML = data.html || '';
    chosen = new Set(data.courses || []);
    dirty = false;
    renderDate(); renderCourses(); syncGuides(); refreshEmpty(); resetOrganize();
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
    picker.hidden = false;
    dateBtn.setAttribute('aria-expanded', 'true');
    dpGrid.querySelector('[tabindex="0"]')?.focus();
    if (!reduce.matches) picker.animate(
      [{ opacity: 0, filter: 'blur(6px)', transform: 'translateY(-4px)' }, { opacity: 1, filter: 'blur(0px)', transform: 'none' }],
      { duration: 280, easing: EASE });
  }
  function closePicker(refocus = true) {
    if (picker.hidden) return;
    dateBtn.setAttribute('aria-expanded', 'false');
    if (refocus) dateBtn.focus();
    if (reduce.matches) { picker.hidden = true; return; }
    picker.animate([{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(6px)' }], { duration: 180, easing: EASE })
      .onfinish = () => { picker.hidden = true; };
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

  // ---- courses (optional hint for the AI) ----
  chipsEl.innerHTML = COURSES.map(([code, name]) =>
    `<button type="button" class="pill" data-code="${code}" aria-pressed="false" title="${code}_${name}">${code}</button>`).join('');
  function renderCourses() {
    chipsEl.querySelectorAll('[data-code]').forEach(b => b.setAttribute('aria-pressed', String(chosen.has(b.dataset.code))));
    chosenEl.textContent = COURSES.map(c => c[0]).filter(c => chosen.has(c)).join(' · ');
    coursesToggle.textContent = coursesEl.open ? '완료' : chosen.size ? '변경' : '+ 선택';
  }
  chipsEl.addEventListener('click', e => {
    const b = e.target.closest('[data-code]');
    if (!b) return;
    chosen.has(b.dataset.code) ? chosen.delete(b.dataset.code) : chosen.add(b.dataset.code);
    renderCourses();
    scheduleSave();
  });
  coursesEl.addEventListener('toggle', renderCourses);
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

  function insertTemplate() {
    // only the 4F headings the document doesn't have yet
    const have = new Set([...editor.querySelectorAll('h3')].map(h => h.textContent.trim().toLowerCase()));
    const missing = FOUR_F.filter(([f]) => !have.has(f.toLowerCase()));
    if (isEmpty()) editor.innerHTML = '';
    editor.insertAdjacentHTML('beforeend', missing.map(([f]) => section(f)).join(''));
    editor.focus();
    // caret into the first 4F section that has nothing written under it yet
    const open = [...editor.querySelectorAll('h3[data-guide]')]
      .map(h => h.nextElementSibling)
      .find(el => el && el.tagName === 'P' && el.textContent.trim() === '');
    if (open) caretIn(open);
    afterEdit();
  }

  function format(cmd) {
    ensureCaret();
    document.execCommand('defaultParagraphSeparator', false, 'p');
    const block = blockOf(getSelection().anchorNode);
    if (cmd === 'heading') {
      document.execCommand('formatBlock', false, block && block.tagName === 'H3' ? 'p' : 'h3');
    } else {
      const wantCheck = cmd === 'check';
      const ul = block && block.closest('ul');
      if (ul && ul.classList.contains('checklist') === wantCheck) document.execCommand('insertUnorderedList'); // toggle off
      else if (ul) ul.classList.toggle('checklist', wantCheck);
      else {
        document.execCommand('insertUnorderedList');
        if (wantCheck) blockOf(getSelection().anchorNode)?.closest('ul')?.classList.add('checklist');
      }
    }
    afterEdit();
  }

  document.querySelectorAll('[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault()); // keep the editor's selection
    btn.addEventListener('click', () => btn.dataset.cmd === 'template' ? insertTemplate() : format(btn.dataset.cmd));
  });

  function afterEdit() { syncGuides(); refreshEmpty(); scheduleSave(); }
  editor.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'p'));
  editor.addEventListener('input', afterEdit);
  editor.addEventListener('paste', e => { // paste as plain text so Discord/Notion styling doesn't leak in
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  });
  editor.addEventListener('click', e => { // the circle sits left of the <li> box
    const li = e.target.closest('ul.checklist > li');
    if (li && e.clientX < li.getBoundingClientRect().left) { li.toggleAttribute('data-done'); scheduleSave(); }
  });

  // ---- 정리하기: the AI step isn't connected, so it shows the failure path ----
  function resetOrganize() { organize.disabled = false; organize.textContent = '정리하기'; }
  organize.addEventListener('click', () => {
    if (isEmpty()) { setStatus('정리할 내용을 먼저 적어주세요', 'error'); editor.focus(); return; }
    save();
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
  }
  $('#list-drafts').addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    save();
    load(b.dataset.open);
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });
  $('#list-todo').innerHTML = TODO.map(([code, text]) => `<li><span class="nav-code">${code}</span>${text}</li>`).join('');
  $('#count-todo').textContent = TODO.length;

  addEventListener('pagehide', save);
  load(today);
})();
