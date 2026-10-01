/*
  Assignment Manage — 제목과 주차 사이 메모 한 칸(사용자 지시 2026-10-01).

  여러 줄 자유 메모 하나(주차와 상관없이 늘 같은 메모). 쓰는 대로 저장한다 —
  로그인하면 서버(GET/PUT /api/assignment/memo, settings 한 줄), 아니면 이 브라우저(localStorage).
  두 저장소는 따로다: 로그아웃 중에 쓴 메모는 로그인해도 서버로 옮기지 않는다(저널과 같은 방식).

  같은 날 서식 툴바를 붙였다(사용자 지시) — 칸은 contenteditable이고 서식(굵게·하이라이트 등)은 journal.js가
  저널링·Future Item 작성칸과 같은 코드로 건다. 저장 값은 Future Item과 같은 규칙으로 정리한 HTML.
  툴바 전에 저장한 글자만의 메모도 그대로 읽는다(줄마다 문단으로).
*/
(() => {
  const el = document.getElementById('am-memo');
  if (!el) return;
  const auth = window.PhiBrain.auth;
  const { ui: { toast }, rich: { cleanRich, richToText } } = window.PhiBrain;
  const LOCAL_KEY = 'phi-brain:assignment-memo';
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isHtml = v => /<(p|div|br|b|i|u|s|mark|code|blockquote|strong|em)\b/i.test(v);
  const toHtml = v => (!v ? '' : isHtml(v) ? cleanRich(v) : v.split('\n').map(l => (l ? `<p>${esc(l)}</p>` : '<p><br></p>')).join(''));
  const refreshEmpty = () => el.classList.toggle('is-empty', el.textContent.trim() === '' && !el.querySelector('blockquote, mark, code'));

  let dirty = false; // 아직 저장하지 않은 입력 — 그동안 불러온 값으로 덮어쓰지 않는다
  let saveTimer = 0;
  // 글자 입력뿐 아니라 툴바 서식·실행 취소(DOM을 직접 고친다)도 바뀜으로 잡는다
  const observer = new MutationObserver(() => {
    refreshEmpty();
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 600);
  });
  const watch = () => observer.observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['data-hl'] }); // 칸 자신의 is-empty 클래스는 빼고

  function show(value) {
    observer.disconnect();
    el.innerHTML = toHtml(value);
    refreshEmpty();
    watch();
    el.dispatchEvent(new CustomEvent('phibrain:memo-loaded')); // journal.js가 실행 취소 기록을 새로 시작한다
  }

  let loadRun = 0;
  async function load() {
    const run = ++loadRun;
    if (dirty) return;
    let value = '';
    if (auth.session) {
      try {
        const res = await auth.fetch('/api/assignment/memo');
        if (!res.ok) return;
        value = (await res.json()).memo || '';
      } catch { return; } // 오프라인 — 지금 보이는 글을 그대로 둔다
    } else {
      try { value = localStorage.getItem(LOCAL_KEY) || ''; } catch {}
    }
    if (run !== loadRun || dirty) return;
    show(value);
  }

  async function save({ keepalive = false } = {}) {
    clearTimeout(saveTimer);
    if (!dirty) return;
    dirty = false;
    const html = cleanRich(el.innerHTML);
    const memo = (richToText(html) || el.querySelector('mark, code')) ? html : '';
    if (!auth.session) {
      try { memo ? localStorage.setItem(LOCAL_KEY, memo) : localStorage.removeItem(LOCAL_KEY); } catch {}
      return;
    }
    let ok = false;
    try {
      const res = await auth.fetch('/api/assignment/memo', { method: 'PUT', keepalive, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memo }) });
      ok = res.ok;
    } catch {}
    if (!ok) {
      dirty = true;
      toast('메모를 저장하지 못했어요', { label: '다시 시도', run: () => save() }, 'error');
    }
  }

  // 붙여넣기는 글자만 — 다른 앱의 글꼴·색이 따라 들어오지 않게(Future Item 작성칸과 같음)
  el.addEventListener('paste', e => {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n'));
  });
  el.addEventListener('blur', () => save());
  addEventListener('pagehide', () => save({ keepalive: true }));
  auth.onChange(() => { dirty = false; load(); });
  watch();
  load();
})();
