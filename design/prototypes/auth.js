/*
  Sign-in (온라인 전환 1단계). "Google로 로그인" (Google Identity Services) →
  the Google ID token goes to the API (POST /api/session), which verifies it and
  only lets the one allowed account in → the API's session token is kept here
  and sent as a Bearer header by PhiBrain.auth.fetch().

  Step 1 only adds signing in — data still lives in this browser. Later steps
  move each store onto PhiBrain.auth.fetch().
*/
(() => {
  const $ = s => document.querySelector(s);
  const { toast } = window.PhiBrain.ui;
  const CONFIG = window.PHI_BRAIN_CONFIG || {};
  const SESSION_KEY = 'phi-brain:session';
  // dev override: localStorage['phi-brain:api-base'] = 'http://localhost:8787' (wrangler dev)
  const API_BASE = (() => { try { return localStorage.getItem('phi-brain:api-base') || CONFIG.apiBase; } catch { return CONFIG.apiBase; } })();

  const signedOutEl = $('#auth-signed-out'), signedInEl = $('#auth-signed-in');
  const emailEl = $('#auth-email'), buttonSlot = $('#auth-google-btn'), signOutBtn = $('#auth-signout');
  const trigger = $('#drawer-trigger');

  const listeners = new Set();
  let session = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY));
      return s && s.token && s.expiresAt > Date.now() ? s : null;
    } catch { return null; }
  })();

  function setSession(next) {
    session = next;
    try { next ? localStorage.setItem(SESSION_KEY, JSON.stringify(next)) : localStorage.removeItem(SESSION_KEY); } catch {}
    render();
    listeners.forEach(fn => { try { fn(session); } catch (e) { console.error(e); } });
  }

  const REASONS = {
    not_allowed: '이 Google 계정은 사용할 수 없어요 — 등록된 계정으로 로그인해 주세요',
    expired: '로그인 정보가 만료됐어요. 다시 시도해 주세요',
  };
  async function signIn(credential) {
    let res;
    try {
      res = await fetch(`${API_BASE}/api/session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }),
      });
    } catch {
      toast('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요', null, 'error');
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { toast(REASONS[body.error] || '로그인하지 못했어요', null, 'error'); return; }
    setSession({ token: body.token, email: body.email, expiresAt: body.expiresAt });
    toast('로그인했어요');
  }

  function signOut() {
    setSession(null);
    window.google?.accounts.id.disableAutoSelect(); // don't silently pick the same account next time
    toast('로그아웃했어요');
  }

  // every data call in later steps goes through here; a 401 means the session
  // is gone (expired, or the server rotated its secret) → show signed-out state
  async function apiFetch(path, opts = {}) {
    const headers = new Headers(opts.headers || {});
    if (session) headers.set('Authorization', `Bearer ${session.token}`);
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    if (res.status === 401 && session) setSession(null);
    return res;
  }

  function render() {
    const inNow = !!session;
    signedOutEl.hidden = inNow;
    signedInEl.hidden = !inNow;
    emailEl.textContent = session?.email || '';
    trigger.textContent = inNow ? '프로필' : '로그인';
  }

  // GIS loads async from accounts.google.com — render the button once it's there
  function mountGoogleButton() {
    if (!CONFIG.googleClientId) return;
    if (!window.google?.accounts?.id) { setTimeout(mountGoogleButton, 200); return; }
    google.accounts.id.initialize({ client_id: CONFIG.googleClientId, callback: r => signIn(r.credential), use_fedcm_for_button: true });
    google.accounts.id.renderButton(buttonSlot, { theme: 'outline', size: 'medium', shape: 'pill', text: 'signin_with', locale: 'ko' });
  }

  signOutBtn.addEventListener('click', signOut);
  render();
  mountGoogleButton();

  // a session that was valid at load can still be revoked server-side — check quietly
  if (session) apiFetch('/api/me').catch(() => {});

  window.PhiBrain.auth = {
    apiBase: API_BASE,
    get session() { return session; },
    fetch: apiFetch,
    onChange: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    signOut,
  };
})();
