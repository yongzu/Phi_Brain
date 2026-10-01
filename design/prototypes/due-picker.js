/*
  마감 고르기 — Future Item 작성칸의 마감과 같은 모양·동작(사용자 지시 2026-10-02: "future item 탭에 있는 마감과 똑같이").
  ● 마감 체크 → [10월 2일 ▾] 달력 + [오후 11:59 ▾] 오전/오후·시·분 세 열. 같은 .fi-due-row · .fi-check · .date-field · .datepicker ·
  .dp-(이름) · .tp-(이름) 마크업과 CSS를 쓰고, future.js는 자기 id에 묶여 있어 여기서는 인스턴스를 여러 개 만들 수 있게 따로 짰다.
  체크를 켜면 오늘 · 오후 11:59로 시작, 날짜만 고르면 시간은 오후 11:59(Future Item과 같음).

    const p = window.PhiBrain.duePicker({ value: '2026-10-05T18:00' | null, onChange: v => … });
    container.append(p.el);  p.value() → 'YYYY-MM-DDTHH:MM' | null

  달력·시간 창은 화면 기준(position:fixed)으로 단추 옆에 띄운다 — 스크롤 상자(팝업) 안에서도 잘리지 않게.
*/
(() => {
  window.PhiBrain = window.PhiBrain || {};
  const pad2 = n => String(n).padStart(2, '0');
  const isoDate = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayIso = () => isoDate(new Date());
  const dateFromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const dateLabel = iso => { const [, m, d] = iso.split('-').map(Number); return `${m}월 ${d}일`; };
  const DEFAULT_TIME = '23:59';
  const timeParts = v => { if (!v) return null; const [h, m] = v.split(':').map(Number); return { meridiem: h < 12 ? 'am' : 'pm', hour12: h % 12 || 12, minute: m }; };
  const to24h = (meridiem, hour12, minute) => `${pad2((hour12 % 12) + (meridiem === 'pm' ? 12 : 0))}:${pad2(minute)}`;
  const timeLabel = v => { const p = timeParts(v); return p ? `${p.meridiem === 'am' ? '오전' : '오후'} ${p.hour12}:${pad2(p.minute)}` : '시간 선택'; };
  const ui = () => window.PhiBrain.ui || { popIn: el => { el.hidden = false; el.dataset.open = '1'; }, popOut: el => { el.hidden = true; delete el.dataset.open; } };

  const html = `
    <label class="fi-due-toggle"><input type="checkbox" class="fi-check" data-due-enable aria-label="마감 설정"> 마감</label>
    <span class="date-field" data-due-part="date" hidden>
      <button type="button" class="pill pill-end" data-due-btn="date" aria-haspopup="dialog" aria-expanded="false">
        <span data-due-label="date"></span><span class="caret" aria-hidden="true">▾</span>
      </button>
      <div class="datepicker due-picker-panel" data-due-panel="date" role="dialog" aria-label="마감 날짜 선택" hidden>
        <div class="dp-head">
          <span class="dp-title" data-due-title></span>
          <span class="dp-steps">
            <button type="button" class="pill pill-icon" data-due-step="-1" aria-label="이전 달">‹</button>
            <button type="button" class="pill pill-icon" data-due-step="1" aria-label="다음 달">›</button>
          </span>
        </div>
        <div class="dp-week" aria-hidden="true"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
        <div class="dp-grid" data-due-grid></div>
        <div class="dp-foot"><button type="button" class="pill pill-end" data-due-today>오늘</button></div>
      </div>
    </span>
    <span class="date-field" data-due-part="time" hidden>
      <button type="button" class="pill pill-end" data-due-btn="time" aria-haspopup="dialog" aria-expanded="false">
        <span data-due-label="time"></span><span class="caret" aria-hidden="true">▾</span>
      </button>
      <div class="datepicker tp-panel due-picker-panel" data-due-panel="time" role="dialog" aria-label="마감 시간 선택" hidden>
        <div class="dp-head"><span class="dp-title">시간 선택</span></div>
        <div class="tp-cols">
          <div class="tp-col" data-due-col="meridiem" role="listbox" aria-label="오전/오후"></div>
          <div class="tp-col" data-due-col="hour" role="listbox" aria-label="시"></div>
          <div class="tp-col" data-due-col="minute" role="listbox" aria-label="분"></div>
        </div>
        <div class="dp-foot">
          <button type="button" class="pill pill-inline" data-due-clear>지우기</button>
          <button type="button" class="pill pill-end" data-due-now>지금</button>
        </div>
      </div>
    </span>`;

  // 열린 창을 단추 아래(모자라면 위)에, 단추 오른쪽 끝에 맞춰 띄운다(.datepicker의 right:-12px과 같은 맞춤)
  function place(btn, panel) {
    const r = btn.getBoundingClientRect(), edge = 16;
    Object.assign(panel.style, { position: 'fixed', right: 'auto' });
    const w = panel.offsetWidth, h = panel.offsetHeight;
    let top = r.bottom + 8;
    if (top + h > innerHeight - edge && r.top - 8 - h >= edge) top = r.top - 8 - h;
    panel.style.top = `${Math.max(edge, Math.min(top, innerHeight - edge - h))}px`;
    panel.style.left = `${Math.max(edge, Math.min(r.right + 12 - w, innerWidth - edge - w))}px`;
  }

  // 모든 인스턴스 공통: 바깥을 누르거나 바깥이 스크롤되면 열린 창을 닫는다
  const openPanels = new Set(); // { field, close }
  document.addEventListener('pointerdown', e => {
    openPanels.forEach(p => { if (!p.field.contains(e.target)) p.close(false); });
  });
  addEventListener('scroll', e => {
    openPanels.forEach(p => { if (!(e.target instanceof Node) || !p.panel.contains(e.target)) p.close(false); });
  }, { passive: true, capture: true });
  addEventListener('resize', () => openPanels.forEach(p => p.close(false)));

  window.PhiBrain.duePicker = function duePicker({ value = null, onChange = () => {} } = {}) {
    const el = document.createElement('span');
    el.className = 'fi-due-row due-picker';
    el.innerHTML = html;
    const q = s => el.querySelector(s);
    const enable = q('[data-due-enable]');
    const dateField = q('[data-due-part="date"]'), timeField = q('[data-due-part="time"]');
    const dateBtn = q('[data-due-btn="date"]'), timeBtn = q('[data-due-btn="time"]');
    const datePanel = q('[data-due-panel="date"]'), timePanel = q('[data-due-panel="time"]');
    const grid = q('[data-due-grid]'), title = q('[data-due-title]');
    const cols = { meridiem: q('[data-due-col="meridiem"]'), hour: q('[data-due-col="hour"]'), minute: q('[data-due-col="minute"]') };

    let on = !!value;
    let date = value ? value.slice(0, 10) : todayIso();
    let time = value ? value.slice(11, 16) : '';
    let viewY = 0, viewM = 0;
    const current = () => (on ? `${date}T${time || DEFAULT_TIME}` : null);
    const emit = () => onChange(current());

    function renderLabels() {
      enable.checked = on;
      dateField.hidden = timeField.hidden = !on;
      q('[data-due-label="date"]').textContent = dateLabel(date);
      q('[data-due-label="time"]').textContent = timeLabel(time);
    }

    // ---- 날짜 ----
    function renderGrid(focusDate) {
      title.textContent = `${viewY}년 ${viewM + 1}월`;
      const lead = new Date(viewY, viewM, 1).getDay(), days = new Date(viewY, viewM + 1, 0).getDate();
      const focusable = focusDate || (date.startsWith(`${viewY}-${pad2(viewM + 1)}`) ? date : isoDate(new Date(viewY, viewM, 1)));
      const t = todayIso();
      let h = '<span></span>'.repeat(lead);
      for (let d = 1; d <= days; d++) {
        const iso = `${viewY}-${pad2(viewM + 1)}-${pad2(d)}`;
        h += `<button type="button" class="dp-day" data-date="${iso}" tabindex="${iso === focusable ? 0 : -1}"`
          + `${iso === date ? ' aria-selected="true"' : ''}${iso === t ? ' data-today' : ''}`
          + ` aria-label="${viewM + 1}월 ${d}일${iso === t ? ', 오늘' : ''}">${d}</button>`;
      }
      grid.innerHTML = h;
    }
    const dateCtl = { field: dateField, panel: datePanel, close: closeDate };
    function openDate() {
      closeTime(false);
      const d = dateFromIso(date);
      viewY = d.getFullYear(); viewM = d.getMonth();
      renderGrid();
      ui().popIn(datePanel);
      place(dateBtn, datePanel);
      dateBtn.setAttribute('aria-expanded', 'true');
      openPanels.add(dateCtl);
      grid.querySelector('[tabindex="0"]')?.focus();
    }
    function closeDate(refocus = true) {
      openPanels.delete(dateCtl);
      if (datePanel.hidden || dateBtn.getAttribute('aria-expanded') === 'false') return;
      dateBtn.setAttribute('aria-expanded', 'false');
      if (refocus) dateBtn.focus();
      ui().popOut(datePanel);
    }
    function pickDate(iso) {
      closeDate();
      date = iso;
      if (!time) time = DEFAULT_TIME;
      renderLabels(); emit();
    }
    const stepMonth = n => { const d = new Date(viewY, viewM + n, 1); viewY = d.getFullYear(); viewM = d.getMonth(); renderGrid(); };
    dateBtn.addEventListener('click', () => (datePanel.hidden ? openDate() : closeDate()));
    datePanel.addEventListener('click', e => {
      const step = e.target.closest('[data-due-step]');
      if (step) { stepMonth(Number(step.dataset.dueStep)); return; }
      if (e.target.closest('[data-due-today]')) { pickDate(todayIso()); return; }
      const b = e.target.closest('.dp-day');
      if (b) pickDate(b.dataset.date);
    });
    grid.addEventListener('keydown', e => { // 화살표: 하루 / 한 주, 달을 넘어가면 그 달로
      const b = e.target.closest('.dp-day');
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!b || !step) return;
      e.preventDefault();
      const d = dateFromIso(b.dataset.date);
      d.setDate(d.getDate() + step);
      const next = isoDate(d);
      if (d.getMonth() !== viewM || d.getFullYear() !== viewY) { viewY = d.getFullYear(); viewM = d.getMonth(); }
      renderGrid(next);
      grid.querySelector(`[data-date="${next}"]`)?.focus();
    });

    // ---- 시간 ----
    function renderCols() {
      const p = timeParts(time), cur = p || { meridiem: 'am', hour12: 12, minute: 0 };
      cols.meridiem.innerHTML = [['am', '오전'], ['pm', '오후']]
        .map(([k, l]) => `<button type="button" class="cm-item" role="option" data-meridiem="${k}" aria-selected="${!!p && cur.meridiem === k}">${l}</button>`).join('');
      cols.hour.innerHTML = Array.from({ length: 12 }, (_, i) => i + 1)
        .map(h => `<button type="button" class="cm-item" role="option" data-hour="${h}" aria-selected="${!!p && cur.hour12 === h}">${h}</button>`).join('');
      cols.minute.innerHTML = Array.from({ length: 60 }, (_, i) => i)
        .map(m => `<button type="button" class="cm-item" role="option" data-minute="${m}" aria-selected="${!!p && cur.minute === m}">${pad2(m)}</button>`).join('');
    }
    const timeCtl = { field: timeField, panel: timePanel, close: closeTime };
    function openTime() {
      closeDate(false);
      renderCols();
      ui().popIn(timePanel);
      place(timeBtn, timePanel);
      timeBtn.setAttribute('aria-expanded', 'true');
      openPanels.add(timeCtl);
      Object.values(cols).forEach(c => { const s = c.querySelector('[aria-selected="true"]'); if (s) c.scrollTop = s.offsetTop - c.clientHeight / 2 + s.offsetHeight / 2; });
    }
    function closeTime(refocus = true) {
      openPanels.delete(timeCtl);
      if (timePanel.hidden || timeBtn.getAttribute('aria-expanded') === 'false') return;
      timeBtn.setAttribute('aria-expanded', 'false');
      if (refocus) timeBtn.focus();
      ui().popOut(timePanel);
    }
    // 한 열을 고르면 나머지 두 열은 지금 값(없으면 낮 12:00)으로 채우고 창은 열어 둔다 — Future Item과 같음
    function setPart(kind, v) {
      const p = timeParts(time) || { meridiem: 'am', hour12: 12, minute: 0 };
      p[kind] = v;
      time = to24h(p.meridiem, p.hour12, p.minute);
      renderLabels(); renderCols(); emit();
    }
    timeBtn.addEventListener('click', () => (timePanel.hidden ? openTime() : closeTime()));
    timePanel.addEventListener('click', e => {
      if (e.target.closest('[data-due-clear]')) { time = ''; renderLabels(); closeTime(); emit(); return; }
      if (e.target.closest('[data-due-now]')) { const n = new Date(); time = `${pad2(n.getHours())}:${pad2(n.getMinutes())}`; renderLabels(); closeTime(); emit(); return; }
      const b = e.target.closest('[role="option"]');
      if (!b) return;
      if (b.dataset.meridiem) setPart('meridiem', b.dataset.meridiem);
      else if (b.dataset.hour) setPart('hour12', Number(b.dataset.hour));
      else if (b.dataset.minute !== undefined) setPart('minute', Number(b.dataset.minute));
    });

    // Esc는 열린 창만 닫는다(바깥 팝업까지 닫히지 않게)
    datePanel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeDate(); } });
    timePanel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeTime(); } });

    // ---- 켜기/끄기: 켜면 그 순간 보이는 날짜(기본 오늘) + 오후 11:59 ----
    enable.addEventListener('change', () => {
      on = enable.checked;
      if (on && !time) time = DEFAULT_TIME;
      if (!on) { closeDate(false); closeTime(false); }
      renderLabels(); emit();
    });

    renderLabels();
    return {
      el,
      value: current,
      close() { closeDate(false); closeTime(false); },
    };
  };
})();
