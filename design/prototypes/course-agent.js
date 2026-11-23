/*
  Course Agent (사용자 지시 2026-11-23) — 왼쪽 Course Agent 목록의 과목마다 한 페이지.

  위: "과목 기억" — 에이전트(Claude Code 스킬 course-agent)가 저널 · Findings · 과제 공지 · 과목 폴더 자료를
      읽고 정리한 것(/api/agent/courses/:id). 한눈에 · 다음 과제에 쓸 것 · 핵심 인사이트 · 방법 · 전문가 피드백 ·
      내 생각 · 내 작업에 적용한 것, 종합 페이지는 과목을 잇는 인사이트. 항목마다 출처(저널 날짜 · 공지 · 파일).
  아래: 앱이 이미 가진 것 그대로 — 회차 · 과제(그 과목 공지, 마감 · 제출 상태), Findings 강조(저널에서 굵게 ·
      하이라이트한 문단), Future Item.
  주소: #course/bi, #course/general. 로그인해야 보인다(과목 기억은 서버에만 있다).
*/
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const { ui: { toast } } = window.PhiBrain;
  const auth = window.PhiBrain.auth;
  const notice = window.PhiAssignmentNotice;
  const store = window.PhiBrain.journalStore;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const view = $('#view-course'), heading = $('#ca-heading'), meta = $('#ca-meta'), body = $('#ca-body');
  const navButtons = [...document.querySelectorAll('[data-course-agent]')];
  const NAMES = Object.fromEntries(navButtons.map(b => [b.dataset.courseAgent, b.textContent.trim()]));
  let current = null, loadRun = 0;

  const SECTIONS = [
    ['overview', '한눈에'], ['next', '다음 과제에 쓸 것'], ['synthesis', '과목을 잇는 인사이트'], ['insight', '핵심 인사이트'],
    ['method', '방법 · 도구'], ['feedback', '전문가 피드백'], ['mine', '내 생각'], ['apply', '내 작업에 적용한 것'],
  ];
  const STATUS = { confirmed_mail: '제출 확인', confirmed_manual: '직접 확인', not_applicable: '해당 없음', conflict: '확인 필요', unconfirmed: '미확인' };
  const dateLabel = iso => { const d = new Date(`${iso}T00:00:00Z`); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; };

  function sourceChip(s) {
    if (s.type === 'journal') return `<button type="button" class="ca-src" data-ca-journal="${esc(s.date)}" title="그 날 저널 열기">저널 ${esc(dateLabel(s.date))}</button>`;
    if (s.type === 'notice') return `<button type="button" class="ca-src" data-ca-week="${Number(s.week)}" title="그 주 과제 보기">${Number(s.week)}주차${s.round ? ` ${esc(s.round)}` : ''} 공지</button>`;
    if (s.type === 'course') return `<button type="button" class="ca-src" data-ca-course="${esc(s.id)}">${esc(String(s.id).toUpperCase())}</button>`;
    if (s.type === 'file') return `<span class="ca-src" title="${esc(s.path)}">${esc(String(s.path).split('/').slice(-2).join('/'))}</span>`;
    return '';
  }
  function memoryHTML(items) {
    return SECTIONS.map(([key, label]) => {
      const list = items.filter(i => i.section === key);
      if (!list.length) return '';
      if (key === 'overview') return `<section class="ca-section ca-overview">${list.map(i => `<p><b>${esc(i.title)}</b>${i.body ? ` ${esc(i.body)}` : ''}</p>`).join('')}</section>`;
      return `<section class="ca-section"><h2 class="ca-heading">${label}</h2><ul class="ca-list">${list.map(i => `
        <li class="ca-item"><p class="ca-item-title">${esc(i.title)}</p>${i.body ? `<p class="ca-item-body">${esc(i.body)}</p>` : ''}
          ${i.sources?.length ? `<p class="ca-sources">${i.sources.map(sourceChip).join('')}</p>` : ''}</li>`).join('')}</ul></section>`;
    }).join('');
  }

  // 회차 · 과제: 그 과목 공지(최근 주차부터) — 누르면 그 주 Assignment Manage로
  function notesHTML(notes) {
    if (!notes.length) return '';
    return `<section class="ca-section"><h2 class="ca-heading">회차 · 과제</h2><ul class="ca-list ca-rows">${notes.map(n => {
      const title = notice?.parseNotice(n.raw)?.title || n.raw.split('\n')[0];
      return `<li><button type="button" class="ca-row" data-ca-week="${n.weekNo}">
        <span class="am-week-tag">${n.weekNo}주차</span>${n.round ? `<span class="am-week-tag">${esc(n.round)}</span>` : ''}
        <span class="ca-row-title">${esc(title)}</span>
        ${n.dueAt ? `<span class="fi-due ca-due">마감 ${esc(notice ? notice.dueLabel(n.dueAt) : n.dueAt)}</span>` : ''}
        <span class="ca-status${n.status.startsWith('confirmed') ? ' is-done' : ''}">${STATUS[n.status] || n.status}</span></button></li>`;
    }).join('')}</ul></section>`;
  }

  // Findings 강조: 그 과목 상자 안 Finding 칸에서 굵게 · 하이라이트한 문단(종합 = 과목 상자 밖 · General 상자)
  function emphasized(code) {
    const out = [];
    for (const date of store.dates().sort().reverse()) {
      const html = store.get(date)?.html;
      if (!html) continue;
      const frag = document.createElement('div');
      frag.innerHTML = html;
      let f4 = '', course = 'general';
      const paras = [];
      for (const el of frag.children) {
        if (el.tagName === 'H3') { f4 = el.textContent.trim(); course = 'general'; continue; }
        if (el.classList.contains('course-box')) { course = (el.dataset.course || 'general').toLowerCase(); continue; }
        if (course === code && /finding/i.test(f4) && el.querySelector('b, strong, mark') && el.textContent.trim()) paras.push(el.innerHTML);
      }
      if (paras.length) out.push({ date, paras });
    }
    return out;
  }
  const safeInline = html => { // 굵게 · 하이라이트 · 줄바꿈만 남긴다
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const walk = node => [...node.childNodes].map(n => {
      if (n.nodeType === 3) return esc(n.textContent);
      if (n.nodeType !== 1) return '';
      const inner = walk(n), tag = n.tagName;
      if (tag === 'B' || tag === 'STRONG') return `<b>${inner}</b>`;
      if (tag === 'MARK') return `<mark${n.dataset.hl ? ` data-hl="${esc(n.dataset.hl)}"` : ''}>${inner}</mark>`;
      if (tag === 'BR') return '<br>';
      return inner;
    }).join('');
    return walk(tmp);
  };
  function findingsHTML(code) {
    const list = emphasized(code);
    if (!list.length) return '';
    return `<section class="ca-section"><h2 class="ca-heading">Findings 강조</h2>${list.map(d => `
      <div class="ca-findings"><button type="button" class="ca-src" data-ca-journal="${d.date}">${dateLabel(d.date)}</button>
        ${d.paras.map(p => `<p class="ca-finding">${safeInline(p)}</p>`).join('')}</div>`).join('')}</section>`;
  }

  function futureHTML(code) {
    const items = (window.PhiBrain.futureStore?.snapshot().items || [])
      .filter(i => (code === 'general' ? i.scope !== 'course' : (i.courseId || '').toLowerCase() === code));
    if (!items.length) return '';
    const open = items.filter(i => !i.done), done = items.filter(i => i.done);
    const li = i => `<li class="ca-future${i.done ? ' is-done' : ''}">${esc(i.text)}</li>`;
    return `<section class="ca-section"><h2 class="ca-heading">Future Item</h2><ul class="ca-list">${[...open, ...done].map(li).join('')}</ul>
      <p class="field-hint">남은 것 ${open.length} · 끝낸 것 ${done.length}</p></section>`;
  }

  async function load(code) {
    const run = ++loadRun;
    current = code;
    heading.textContent = code === 'general' ? '종합 · 과목을 잇는 Course Agent' : NAMES[code] || code.toUpperCase();
    navButtons.forEach(b => b.classList.toggle('active', b.dataset.courseAgent === code));
    if (!auth.session) {
      meta.textContent = '로그인하면 이 과목의 과목 기억을 볼 수 있어요';
      body.innerHTML = findingsHTML(code) + futureHTML(code);
      return;
    }
    meta.textContent = '불러오는 중…';
    let data = null;
    try {
      const res = await auth.fetch(`/api/agent/courses/${code}`);
      if (res.ok) data = await res.json();
    } catch {}
    if (run !== loadRun) return;
    if (!data) { meta.textContent = '서버에 연결하지 못했어요'; body.innerHTML = findingsHTML(code) + futureHTML(code); return; }
    meta.textContent = data.run
      ? `${new Date(data.run.ranAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 정리 · ${data.run.summary || ''}`.replace(/ · $/, '')
      : '아직 정리 전 — Claude Code에서 course-agent로 정리하면 여기에 쌓여요';
    body.innerHTML = memoryHTML(data.memory) + notesHTML(data.notes) + findingsHTML(code) + futureHTML(code)
      || '<p class="field-hint">아직 이 과목에 모인 것이 없어요.</p>';
  }

  function open(code) {
    history.replaceState(null, '', `#course/${code}`);
    if (window.PhiBrain.getCurrentView() === 'course') load(code);
    else window.PhiBrain.show('course'); // → phibrain:view가 주소의 과목을 읽어 그린다
  }
  navButtons.forEach(b => b.addEventListener('click', () => open(b.dataset.courseAgent)));

  body.addEventListener('click', e => {
    const j = e.target.closest('[data-ca-journal]');
    if (j) { window.PhiBrain.openJournal?.(j.dataset.caJournal); return; }
    const w = e.target.closest('[data-ca-week]');
    if (w) {
      const n = Number(w.dataset.caWeek);
      if (window.PhiBrain.assignmentWeek) window.PhiBrain.assignmentWeek(n);
      else try { localStorage.setItem('phi-brain:assignment-week', String(n)); } catch {}
      window.PhiBrain.show('assignment');
      return;
    }
    const c = e.target.closest('[data-ca-course]');
    if (c && NAMES[c.dataset.caCourse]) open(c.dataset.caCourse);
  });

  document.addEventListener('phibrain:view', e => {
    if (e.detail.name !== 'course') { navButtons.forEach(b => b.classList.remove('active')); return; }
    load((location.hash.match(/^#course\/([a-z]+)/) || [])[1] || current || 'general');
  });
  auth.onChange(() => { if (window.PhiBrain.getCurrentView() === 'course' && current) load(current); });
  if (window.PhiBrain.getCurrentView() === 'course') load((location.hash.match(/^#course\/([a-z]+)/) || [])[1] || 'general');
})();
