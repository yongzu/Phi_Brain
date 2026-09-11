/*
  Future Item — TEMPORARY. The real Future Item tab isn't designed yet;
  this only proves the flow: a journal's Future Item section is registered
  (journal.js → PhiBrain.future.register) and lands here grouped by course.

  - Items live in localStorage. Registering a journal date replaces that
    date's earlier items, so pressing the button again never duplicates;
    an item that was already checked off stays checked.
  - Also owns the tiny view switch (Journaling ↔ Future Item) and the
    course list both scripts share.
*/
(() => {
  const $ = s => document.querySelector(s);
  const COURSES = [
    ['AL', 'Aesthetic Literacy'], ['AOR', 'Art of Reading'], ['BI', 'Beautiful Interface'],
    ['EAI', 'Engaging with AI'], ['IAE', 'Interviewing as Exploration'], ['IPS', 'Iterative Problem Solving'],
    ['PC', 'Peer Coaching'], ['RW', 'Readable Writing'], ['SI', 'Self Introduction'],
    ['TF', 'Typography as Foundation'], ['VT', 'Visual Translation'], ['WI', 'What If'],
  ];
  const KEY = 'phi-brain:future-items';
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const monthDay = s => { const [, m, d] = s.split('-').map(Number); return `${m}월 ${d}일`; };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // ---- store ----
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const write = items => { try { localStorage.setItem(KEY, JSON.stringify(items)); return true; } catch { return false; } };
  const future = {
    all: read,
    /** entries: [{course, text}] from one journal date; returns how many were stored, or -1 */
    register(date, entries) {
      const items = read();
      const wasDone = new Set(items.filter(i => i.date === date && i.done).map(i => `${i.course}|${i.text}`));
      const stamp = Date.now();
      const next = items.filter(i => i.date !== date).concat(entries.map((e, n) => ({
        id: `${date}-${stamp}-${n}`, date, course: e.course, text: e.text, done: wasDone.has(`${e.course}|${e.text}`),
      })));
      if (!write(next)) return -1;
      render();
      return entries.length;
    },
    toggle(id) {
      const items = read();
      const item = items.find(i => i.id === id);
      if (!item) return;
      item.done = !item.done;
      write(items);
      render();
    },
  };

  // ---- temporary view: one group per course, unassigned last ----
  const groupsEl = $('#fi-groups');
  function render() {
    const items = read();
    const groups = [...COURSES, ['', '']]
      .map(([code, name]) => ({ code, name, items: items.filter(i => (i.course || '') === code) }))
      .filter(g => g.items.length);
    if (!groups.length) {
      groupsEl.innerHTML = '<p class="fi-empty">아직 등록된 항목이 없어요. 저널에서 Future Item 박스 오른쪽의 ‘Future Item에 등록하기’를 눌러보세요.</p>';
      return;
    }
    groupsEl.innerHTML = groups.map(g => `
      <section class="fi-group">
        <h2 class="fi-course"><span class="course-tag"><span>${g.code ? `<span class="nav-code">${g.code}</span>_${g.name}` : '과목 미지정'}</span></span><span class="resume-count" title="남은 항목">${g.items.filter(i => !i.done).length}</span></h2>
        <ul class="fi-list">${g.items.sort((a, b) => b.date.localeCompare(a.date)).map(i => `
          <li class="fi-item${i.done ? ' is-done' : ''}">
            <button type="button" class="fi-check" data-id="${i.id}" aria-pressed="${i.done}" aria-label="${i.done ? '완료 취소' : '완료로 표시'}"></button>
            <span class="fi-text">${esc(i.text)}</span>
            <span class="fi-meta">${monthDay(i.date)}</span>
          </li>`).join('')}
        </ul>
      </section>`).join('');
  }
  groupsEl.addEventListener('click', e => { const b = e.target.closest('.fi-check'); if (b) future.toggle(b.dataset.id); });

  // ---- view switch (only the built views; other nav tabs stay inert) ----
  const views = { journal: $('#view-journal'), future: $('#view-future') };
  const navTabs = [...document.querySelectorAll('.side-nav [data-view]')];
  function show(name) {
    if (!views[name]) name = 'journal';
    Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
    navTabs.forEach(t => {
      const on = t.dataset.view === name;
      t.classList.toggle('active', on);
      on ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current');
    });
    if (name === 'future') render();
    history.replaceState(null, '', name === 'future' ? '#future-item' : location.pathname + location.search);
    if (!reduce.matches) views[name].animate(
      [{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)' }],
      { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  navTabs.forEach(t => t.addEventListener('click', () => show(t.dataset.view)));

  window.PhiBrain = { COURSES, future, show };
  show(location.hash === '#future-item' ? 'future' : 'journal');
})();
