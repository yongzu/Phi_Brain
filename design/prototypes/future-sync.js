/*
  Future Item on the server (온라인 전환 4단계, "단순한 방식" — 사용자 확정 2026-09-14).

  - Signed out: nothing changes — future.js saves to this browser (phi-brain:future:v2).
  - Signed in: the whole board is one document on the server (GET/PUT /api/future).
    Every commit() in future.js lands on screen at once and is sent in the
    background with the version this device last saw. If another device saved
    in between, nothing is merged or overwritten: the hint under the heading
    asks which one to keep. Unsent changes and the last copy are kept per
    account (phi-brain:future-sync:v1:<email>) and sent on reconnect/next load.
  - This browser's own signed-out board is never touched and never uploaded —
    signed-out and signed-in boards stay separate (사용자 지시 2026-09-14: 서버로 올리기 삭제).
*/
(() => {
  const { futureStore: board, auth, ui: { toast } } = window.PhiBrain;
  const hint = document.querySelector('#fi-sync-hint');
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  const EMPTY = () => ({ items: [], favorites: [], customBoxes: [], boxOrder: [] });
  // same field order on both sides, so a server copy and this device's board compare as text
  const canon = b => JSON.stringify({ items: b?.items || [], favorites: b?.favorites || [], customBoxes: b?.customBoxes || [], boxOrder: b?.boxOrder || [] });

  let mode = 'local', loaded = false, offline = false;
  let version = 0, pending = false, force = false;
  let conflict = null;          // { data, version } — the server's copy when another device saved first
  let inflight = false, rev = 0, retryTimer = 0;

  const cacheKey = () => (auth.session ? `phi-brain:future-sync:v1:${auth.session.email.toLowerCase()}` : null);
  function persist() {
    const k = cacheKey();
    if (k && mode === 'server') ls.set(k, { data: board.snapshot(), version, pending });
  }

  // ---- hint under the heading: where things are saved, and anything that needs a decision ----
  function renderHint() {
    if (mode === 'local') {
      hint.hidden = false;
      hint.textContent = '이 브라우저에만 저장돼요 — 로그인하면 어느 기기에서든 같은 Future Item을 볼 수 있어요.';
      return;
    }
    if (conflict) {
      hint.hidden = false;
      hint.innerHTML = '다른 기기에서 먼저 수정됐어요.'
        + '<button type="button" class="pill" data-fi-sync="mine">이 기기 내용으로 저장</button>'
        + '<button type="button" class="pill" data-fi-sync="theirs">다른 기기 내용 불러오기</button>';
      return;
    }
    if (offline && pending) {
      hint.hidden = false;
      hint.textContent = '서버에 연결되지 않아 이 기기에 보관 중이에요 — 연결되면 올려요.';
      return;
    }
    hint.hidden = true;
    hint.textContent = '';
  }
  hint.addEventListener('click', e => {
    const act = e.target.closest('[data-fi-sync]')?.dataset.fiSync;
    if (act === 'mine' && conflict) { version = conflict.version; conflict = null; force = true; pending = true; persist(); send(); renderHint(); }
    else if (act === 'theirs' && conflict) {
      const c = conflict;
      conflict = null; pending = false; force = false; version = c.version;
      board.replace(c.data || EMPTY());
      persist(); renderHint();
    }
  });

  // ---- sending: one request at a time, always the latest board ----
  async function send() {
    if (mode !== 'server' || inflight || conflict || !pending || !loaded) return;
    inflight = true;
    const startRev = rev, data = board.snapshot();
    let res = null, body = {};
    try {
      res = await auth.fetch('/api/future', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, baseVersion: version, force: force || undefined }), keepalive: JSON.stringify(data).length < 60000,
      });
      body = await res.json().catch(() => ({}));
    } catch { res = null; }
    inflight = false;
    if (mode !== 'server') return;
    if (!res) { offline = true; clearTimeout(retryTimer); retryTimer = setTimeout(send, 20000); renderHint(); return; }
    if (res.status === 401) return; // auth.js signs out → back to this browser's board
    offline = false;
    if (res.ok) {
      version = body.version; force = false;
      if (rev === startRev) pending = false;
    } else if (res.status === 409 && canon(body.data) === canon(data)) {
      version = body.version; // the server already has exactly this — an earlier send whose reply was lost
      if (rev === startRev) pending = false;
    } else if (res.status === 409) {
      conflict = { data: body.data, version: body.version };
    } else {
      toast(body.error === 'board_too_large' ? 'Future Item이 너무 많아 서버에 저장하지 못했어요' : 'Future Item을 서버에 저장하지 못했어요', null, 'error');
    }
    persist();
    renderHint();
    if (pending && !conflict && rev !== startRev) send();
  }
  addEventListener('online', () => { if (mode === 'server') send(); });

  function save() {
    rev++;
    pending = true;
    persist();
    send();
    return true; // on screen already; the server copy follows (or the hint says why not)
  }

  async function fetchServer() {
    let res;
    try { res = await auth.fetch('/api/future'); } catch { offline = true; renderHint(); return; }
    if (!res.ok || mode !== 'server') return;
    const server = await res.json();
    offline = false;
    loaded = true;
    if (pending) {
      // unsent changes from last time: send them on the version they were made on (conflict-checked by the server)
      send();
    } else {
      version = server.version;
      board.replace(server.data || EMPTY());
      persist();
    }
    renderHint();
    document.dispatchEvent(new CustomEvent('phibrain:future-changed')); // the upload popup waits for this
  }

  function enterMode() {
    clearTimeout(retryTimer);
    conflict = null; offline = false; loaded = false; inflight = false; force = false;
    if (!auth.session) {
      mode = 'local';
      board.useBackend(null);
      board.replace(board.localBoard());
      renderHint();
      return;
    }
    mode = 'server';
    const cache = ls.get(cacheKey());
    version = cache?.version || 0;
    pending = !!cache?.pending;
    // last copy right away (or an empty board — this browser's own items are not the server's)
    board.replace(cache?.data || EMPTY());
    board.useBackend({ save });
    renderHint();
    fetchServer();
  }
  auth.onChange(enterMode);
  addEventListener('pagehide', persist);
  if (auth.session) enterMode(); else renderHint();

  window.PhiBrain.futureSync = {
    get mode() { return mode; }, get pending() { return pending; }, get version() { return version; }, get loaded() { return loaded; },
  };
})();
