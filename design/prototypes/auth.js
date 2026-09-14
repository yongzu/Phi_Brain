/*
  Sign-in (온라인 전환 1단계). "Google로 로그인" (Google Identity Services) →
  the Google ID token goes to the API (POST /api/session), which verifies it and
  only lets the one allowed account in → the API's session token is kept here
  and sent as a Bearer header by PhiBrain.auth.fetch().

  Staying signed in (4단계, 사용자 요청 2026-09-14):
  - a session is renewed for another 30 days when it's more than a day old
    (POST /api/session/refresh), so a browser in regular use never drops out;
  - with no session, Google's automatic sign-in (One Tap, auto_select) signs the
    account back in without a click if it already allowed this site — unless
    the user pressed 로그아웃 here (phi-brain:signed-out), which also tells
    Google not to pick the account automatically.
*/
(() => {
  const $ = s => document.querySelector(s);
  const { toast } = window.PhiBrain.ui;
  const CONFIG = window.PHI_BRAIN_CONFIG || {};
  const SESSION_KEY = 'phi-brain:session';
  const SIGNED_OUT_KEY = 'phi-brain:signed-out'; // set by 로그아웃 — no automatic sign-in until the next manual one
  const RENEW_AFTER_MS = 24 * 3600 * 1000;
  const ls = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
    remove: k => { try { localStorage.removeItem(k); } catch {} },
  };
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
  async function signIn(credential, { automatic = false } = {}) {
    let res;
    try {
      res = await fetch(`${API_BASE}/api/session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }),
      });
    } catch {
      if (!automatic) toast('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요', null, 'error');
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { toast(REASONS[body.error] || '로그인하지 못했어요', null, 'error'); return; }
    ls.remove(SIGNED_OUT_KEY);
    setSession({ token: body.token, email: body.email, expiresAt: body.expiresAt, issuedAt: Date.now() });
    toast(automatic ? `${body.email}로 자동 로그인했어요` : '로그인했어요');
  }

  function signOut() {
    ls.set(SIGNED_OUT_KEY, '1');
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
  let promptShown = false;
  function mountGoogleButton() {
    if (!CONFIG.googleClientId) return;
    if (!window.google?.accounts?.id) { setTimeout(mountGoogleButton, 200); return; }
    google.accounts.id.initialize({
      client_id: CONFIG.googleClientId,
      // a credential that arrives without a click (One Tap auto_select) is an automatic sign-in
      callback: r => signIn(r.credential, { automatic: r.select_by === 'auto' || r.select_by === 'fedcm_auto' }),
      auto_select: true,
      cancel_on_tap_outside: true,
      use_fedcm_for_button: true,
      use_fedcm_for_prompt: true,
    });
    google.accounts.id.renderButton(buttonSlot, { theme: 'outline', size: 'medium', shape: 'pill', text: 'signin_with', locale: 'ko' });
    autoSignIn();
  }
  // no session, and the user didn't sign out on purpose → let Google sign the known account back in
  function autoSignIn() {
    if (session || promptShown || ls.get(SIGNED_OUT_KEY) || !window.google?.accounts?.id) return;
    promptShown = true;
    google.accounts.id.prompt();
  }

  // sliding 30 days: swap a session older than a day for a fresh one
  async function renewSession() {
    if (!session) return;
    const issuedAt = session.issuedAt || session.expiresAt - 30 * 24 * 3600 * 1000;
    if (Date.now() - issuedAt < RENEW_AFTER_MS) return;
    try {
      const res = await apiFetch('/api/session/refresh', { method: 'POST' });
      if (!res.ok) return; // a 401 already signed out inside apiFetch
      const body = await res.json();
      session = { token: body.token, email: body.email, expiresAt: body.expiresAt, issuedAt: Date.now() };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
    } catch { /* offline — try again next load */ }
  }

  signOutBtn.addEventListener('click', signOut);
  render();
  mountGoogleButton();

  // a session that was valid at load can still be revoked server-side — renewing checks it too
  if (session) renewSession();
  // a session that ran out while the page was open → try the automatic sign-in once
  listeners.add(s => { if (!s) { promptShown = false; setTimeout(autoSignIn, 0); } });

  window.PhiBrain.auth = {
    apiBase: API_BASE,
    get session() { return session; },
    fetch: apiFetch,
    onChange: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    signOut,
  };
})();
