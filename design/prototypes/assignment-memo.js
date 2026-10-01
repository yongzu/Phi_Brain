/*
  Assignment Manage — 제목과 주차 사이 메모 한 칸(사용자 지시 2026-10-01).

  여러 줄 자유 메모 하나(주차와 상관없이 늘 같은 메모). 쓰는 대로 저장한다 —
  로그인하면 서버(GET/PUT /api/assignment/memo, settings 한 줄), 아니면 이 브라우저(localStorage).
  두 저장소는 따로다: 로그아웃 중에 쓴 메모는 로그인해도 서버로 옮기지 않는다(저널과 같은 방식).
*/
(() => {
  const el = document.getElementById('am-memo');
  if (!el) return;
  const auth = window.PhiBrain.auth;
  const { ui: { toast } } = window.PhiBrain;
  const LOCAL_KEY = 'phi-brain:assignment-memo';
  const MAX = 5000;
  el.maxLength = MAX;

  // 글이 늘면 칸도 늘어난다(숨겨진 화면에서는 높이를 잴 수 없어, 화면이 보일 때 다시 잰다)
  const autosize = () => { if (!el.offsetParent) return; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; };

  let dirty = false; // 아직 저장하지 않은 입력 — 그동안 불러온 값으로 덮어쓰지 않는다
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
    el.value = value;
    autosize();
  }

  let saveTimer = 0;
  async function save({ keepalive = false } = {}) {
    clearTimeout(saveTimer);
    if (!dirty) return;
    dirty = false;
    const memo = el.value;
    if (!auth.session) {
      try { memo.trim() ? localStorage.setItem(LOCAL_KEY, memo) : localStorage.removeItem(LOCAL_KEY); } catch {}
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

  el.addEventListener('input', () => {
    dirty = true;
    autosize();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 600);
  });
  el.addEventListener('blur', () => save());
  addEventListener('pagehide', () => save({ keepalive: true }));
  document.addEventListener('phibrain:view', e => { if (e.detail.name === 'assignment') autosize(); }); // 화면을 보인 뒤에 오는 신호
  addEventListener('resize', autosize);
  auth.onChange(() => { dirty = false; load(); });
  load();
})();
