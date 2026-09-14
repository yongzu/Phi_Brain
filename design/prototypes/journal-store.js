/*
  Journal storage (온라인 전환 3단계). journal.js reads synchronously
  (store.get/dates on every render), so this keeps the same shape:

  - Signed out → exactly the old behavior: this browser's localStorage
    (phi-brain:journal:<date>, phi-brain:journal-archive:favorites).
    Those keys are never touched in signed-in mode — they are what
    "서버로 올리기" (import) uploads, and they stay as the browser's backup.
  - Signed in → an in-memory copy of the server's journals (GET /api/journals).
    Writes land in memory at once and are pushed in the background with the
    version the device last saw; an edit made on another device in between
    comes back as a conflict for the page to ask about, never a silent
    overwrite. Unsent edits and the last copy are kept in localStorage per
    account (phi-brain:sync:v1:<email>), so a closed tab or lost connection
    doesn't lose them — they're sent on the next load/reconnect.
*/
(() => {
  const auth = window.PhiBrain.auth;
  const LOCAL_KEY = 'phi-brain:journal:';
  const LOCAL_FAV_KEY = 'phi-brain:journal-archive:favorites';
  const LOCAL_FINDINGS_FAV_KEY = 'phi-brain:findings:favorites'; // starred Findings boxes (course keys, in starred order)
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    remove(k) { try { localStorage.removeItem(k); return true; } catch { return false; } },
    keys() { try { return Object.keys(localStorage); } catch { return []; } },
  };
  const favKey = (date, course) => `${date}::${course}`;
  const clean = d => ({ title: d.title || '', courses: d.courses || [], html: d.html || '', savedAt: d.savedAt || 0 });
  const sameContent = (a, b) => (a.title || '').trim() === (b.title || '').trim() && (a.html || '') === (b.html || '')
    && JSON.stringify(a.courses || []) === JSON.stringify(b.courses || []);

  // ---- local (signed out) ----
  const local = {
    get: date => ls.get(LOCAL_KEY + date),
    set: (date, v) => ls.set(LOCAL_KEY + date, v),
    remove: date => ls.remove(LOCAL_KEY + date),
    dates: () => ls.keys().filter(k => k.startsWith(LOCAL_KEY)).map(k => k.slice(LOCAL_KEY.length)),
    favorites: () => new Set(ls.get(LOCAL_FAV_KEY) || []),
    saveFavorites: s => ls.set(LOCAL_FAV_KEY, [...s]),
    findingsFavorites: () => (Array.isArray(ls.get(LOCAL_FINDINGS_FAV_KEY)) ? ls.get(LOCAL_FINDINGS_FAV_KEY).filter(k => typeof k === 'string') : []),
    saveFindingsFavorites: list => ls.set(LOCAL_FINDINGS_FAV_KEY, list),
  };

  // ---- server (signed in) ----
  let mode = auth.session ? 'server' : 'local';
  let loaded = false;                 // the server list arrived at least once this session
  let entries = new Map();            // date → { title, courses, html, savedAt, version|null }
  let tombstones = new Map();         // date → version of a delete not yet sent
  let favs = new Set();
  let findingsFavs = [];              // starred Findings boxes, in starred order
  let pending = new Set();            // dates with unsent writes (entries or tombstones)
  const conflicts = new Map();        // date → server copy (null = deleted elsewhere)
  const inflight = new Set();
  const rev = new Map();              // date → write counter, to spot writes during a send
  let offline = false, retryTimer = 0, persistTimer = 0;

  const listeners = { change: new Set(), sync: new Set(), notice: new Set(), beforeMode: new Set() };
  const emit = (type, ...args) => listeners[type].forEach(fn => { try { fn(...args); } catch (e) { console.error(e); } });

  const cacheKey = () => auth.session ? `phi-brain:sync:v1:${auth.session.email.toLowerCase()}` : null;
  function persistNow() {
    clearTimeout(persistTimer);
    const k = cacheKey();
    if (!k || mode !== 'server') return;
    ls.set(k, { entries: [...entries], tombstones: [...tombstones], favorites: [...favs], findingsFavorites: findingsFavs, pending: [...pending] });
  }
  function persist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persistNow, 200);
  }
  addEventListener('pagehide', persistNow);
  function restore() {
    const c = ls.get(cacheKey()) || {};
    entries = new Map(c.entries || []);
    tombstones = new Map(c.tombstones || []);
    favs = new Set(c.favorites || []);
    findingsFavs = Array.isArray(c.findingsFavorites) ? c.findingsFavorites : [];
    pending = new Set(c.pending || []);
  }

  function stateOf(date) {
    if (mode === 'local') return 'local';
    if (conflicts.has(date)) return 'conflict';
    if (pending.has(date)) return offline ? 'offline' : 'pending';
    return 'saved';
  }
  const report = date => emit('sync', date, stateOf(date));

  // One request per date at a time; a write made while one is in flight is sent right after.
  async function send(date) {
    if (inflight.has(date)) return; // the running send re-checks rev when it finishes
    if (mode !== 'server' || conflicts.has(date) || !pending.has(date)) return;
    inflight.add(date);
    const startRev = rev.get(date) || 0;
    const entry = entries.get(date), tomb = tombstones.get(date);
    let res;
    try {
      if (entry) {
        res = await auth.fetch(`/api/journals/${date}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...clean(entry), baseVersion: entry.version ?? null, force: entry.force || undefined }),
          keepalive: entry.html.length < 60000, // lets a save fired on tab close still go out
        });
      } else if (tombstones.has(date)) {
        res = tomb == null ? { ok: true, status: 200, json: async () => ({ ok: true }) }
          : await auth.fetch(`/api/journals/${date}?baseVersion=${tomb}`, { method: 'DELETE', keepalive: true });
      } else {
        res = { ok: true, status: 200, json: async () => ({}) }; // written and deleted before it ever reached the server
      }
    } catch {
      res = null;
    }
    inflight.delete(date);
    if (mode !== 'server') return;

    if (!res) { // no answer — keep it, try again later
      offline = true;
      scheduleRetry();
      report(date);
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) return; // auth.js signs out → switch to local; pending stays in the account cache
    offline = false;
    const changedMeanwhile = (rev.get(date) || 0) !== startRev;
    if (res.ok) {
      if (entry) {
        // the server is now at body.version — whatever this device holds for the date builds on that
        const cur = entries.get(date);
        if (cur) { cur.version = body.version; delete cur.force; }
        else if (tombstones.has(date)) tombstones.set(date, body.version);
      } else if (!changedMeanwhile) {
        tombstones.delete(date);
      }
      if (!changedMeanwhile) pending.delete(date);
    } else if (res.status === 409 && entry && body.journal && sameContent(body.journal, entries.get(date) || entry)) {
      // the server already has exactly this text — an earlier send whose reply never arrived
      // (tab closed, connection dropped). Nothing to ask about: adopt its version.
      const cur = entries.get(date);
      if (cur) { cur.version = body.journal.version; delete cur.force; }
      if (!changedMeanwhile) pending.delete(date);
    } else if (res.status === 409) {
      conflicts.set(date, body.journal ?? null);
      emit('notice', { type: 'conflict', date });
    } else {
      // 400/413/500: not retried automatically — say so instead of pretending it's saved
      emit('notice', { type: 'error', date, error: body.error || `http_${res.status}` });
    }
    persist();
    report(date);
    if (changedMeanwhile && !conflicts.has(date)) send(date);
  }
  const flushAll = () => [...pending].forEach(send);
  function scheduleRetry() {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(flushAll, 20000);
  }
  addEventListener('online', () => { if (mode === 'server') flushAll(); });

  async function fetchServer() {
    let res;
    try { res = await auth.fetch('/api/journals'); } catch { offline = true; scheduleRetry(); emit('change', { reason: 'offline' }); return; }
    if (!res.ok || mode !== 'server') return;
    const { journals, favorites, findingsFavorites } = await res.json();
    offline = false;
    const next = new Map(journals.map(j => [j.date, { title: j.title, courses: j.courses, html: j.html, savedAt: j.savedAt, version: j.version }]));
    // unsent local edits win on this device until they're sent (and conflict-checked)
    for (const date of pending) {
      if (entries.has(date)) next.set(date, entries.get(date));
      else if (tombstones.has(date)) next.delete(date);
    }
    entries = next;
    favs = new Set(favorites);
    findingsFavs = Array.isArray(findingsFavorites) ? findingsFavorites : [];
    loaded = true;
    persist();
    emit('change', { reason: 'loaded' });
    flushAll();
  }

  function enterMode() {
    emit('beforeMode'); // journal.js flushes its unsaved keystrokes into the store they belong to
    mode = auth.session ? 'server' : 'local';
    loaded = false;
    offline = false;
    conflicts.clear();
    if (mode === 'server') { restore(); fetchServer(); }
    emit('change', { reason: 'mode' });
  }
  // sign-in/out: only a real switch (the session check on load re-announces the same state)
  auth.onChange(() => { if ((auth.session ? 'server' : 'local') !== mode || mode === 'server') enterMode(); });

  const store = {
    get mode() { return mode; },
    get loaded() { return loaded; },
    get offline() { return offline; },
    get(date) {
      if (mode === 'local') return local.get(date);
      const e = entries.get(date);
      return e ? clean(e) : null;
    },
    set(date, v) {
      if (mode === 'local') return local.set(date, v);
      const prev = entries.get(date);
      entries.set(date, { ...clean(v), version: prev ? prev.version : null }); // null = new on the server (a pending delete, if any, is superseded)
      tombstones.delete(date);
      rev.set(date, (rev.get(date) || 0) + 1);
      pending.add(date);
      persist();
      report(date);
      send(date);
      return true;
    },
    remove(date) {
      if (mode === 'local') return local.remove(date);
      const prev = entries.get(date);
      if (!prev) return false;
      entries.delete(date);
      // a first save still in flight may create the row after all — its answer fills in the version to delete
      if (prev.version != null || inflight.has(date)) tombstones.set(date, prev.version ?? null);
      [...favs].filter(k => k.startsWith(date + '::')).forEach(k => favs.delete(k)); // the server drops them with the journal
      rev.set(date, (rev.get(date) || 0) + 1);
      pending.add(date);
      conflicts.delete(date);
      persist();
      send(date);
      return true;
    },
    dates() { return mode === 'local' ? local.dates() : [...entries.keys()]; },
    syncState: stateOf,
    // the server's copy behind a conflict (null = deleted on another device; undefined = no conflict)
    conflictCopy: date => (conflicts.has(date) ? conflicts.get(date) : undefined),
    retry: flushAll,

    // conflict on a date: keep this device's text (overwrite the server) or take the server's
    resolve(date, choice) {
      if (!conflicts.has(date)) return;
      const theirs = conflicts.get(date);
      conflicts.delete(date);
      if (choice === 'mine') {
        const e = entries.get(date);
        if (e) { e.force = true; pending.add(date); }
        else if (tombstones.has(date)) tombstones.set(date, theirs?.version ?? null);
        persist(); send(date);
      } else {
        pending.delete(date);
        tombstones.delete(date);
        if (theirs) entries.set(date, { title: theirs.title, courses: theirs.courses, html: theirs.html, savedAt: theirs.savedAt, version: theirs.version });
        else entries.delete(date);
        persist();
        emit('change', { reason: 'resolved', date });
      }
      report(date);
    },

    favorites: {
      all: () => (mode === 'local' ? local.favorites() : new Set(favs)),
      toggle(date, course) {
        const k = favKey(date, course);
        if (mode === 'local') {
          const s = local.favorites();
          s.has(k) ? s.delete(k) : s.add(k);
          local.saveFavorites(s);
          return;
        }
        const on = !favs.has(k);
        on ? favs.add(k) : favs.delete(k);
        persist();
        auth.fetch(`/api/journals/${date}/favorites/${encodeURIComponent(course)}`, { method: on ? 'PUT' : 'DELETE' })
          .then(r => { if (!r.ok) throw new Error(); })
          .catch(() => {
            if (mode !== 'server') return;
            on ? favs.delete(k) : favs.add(k); // undo the star so the screen doesn't claim what the server doesn't have
            persist();
            emit('change', { reason: 'favorite' });
            emit('notice', { type: 'favorite-failed' });
          });
      },
      removeForDate(date) {
        if (mode === 'local') local.saveFavorites(new Set([...local.favorites()].filter(k => !k.startsWith(date + '::'))));
      },
    },

    // ---- Findings 박스 즐겨찾기 (2026-09-14 사용자 요구사항): same place as the journals ----
    findingsFavorites: {
      all: () => (mode === 'local' ? local.findingsFavorites() : [...findingsFavs]),
      toggle(course) {
        if (mode === 'local') {
          const list = local.findingsFavorites();
          local.saveFindingsFavorites(list.includes(course) ? list.filter(k => k !== course) : [...list, course]);
          return;
        }
        const on = !findingsFavs.includes(course);
        findingsFavs = on ? [...findingsFavs, course] : findingsFavs.filter(k => k !== course); // new stars go last; starred order never shuffles
        persist();
        auth.fetch(`/api/findings/favorites/${encodeURIComponent(course)}`, { method: on ? 'PUT' : 'DELETE' })
          .then(r => { if (!r.ok) throw new Error(); })
          .catch(() => {
            if (mode !== 'server') return;
            findingsFavs = on ? findingsFavs.filter(k => k !== course) : [...findingsFavs, course];
            persist();
            emit('change', { reason: 'favorite' });
            emit('notice', { type: 'favorite-failed' });
          });
      },
    },

    // ---- 서버로 올리기: this browser's signed-out journals ----
    // → { upload: [date…] not on the server, conflicts: [date…] same date with different content }
    importCandidates() {
      if (mode !== 'server' || !loaded) return { upload: [], conflicts: [] };
      const upload = [], conflicting = [];
      for (const date of local.dates().sort()) {
        const d = local.get(date);
        if (!d || (!d.html && !d.title)) continue;
        const onServer = entries.get(date);
        if (!onServer) upload.push(date);
        else if (!sameContent(onServer, d)) conflicting.push(date);
      }
      return { upload, conflicts: conflicting };
    },
    async importLocal() {
      const { upload } = store.importCandidates();
      const localFavs = local.favorites();
      const total = { imported: [], same: [], conflicts: [], invalid: [], failed: [] };
      for (let i = 0; i < upload.length; i += 10) {
        const chunk = upload.slice(i, i + 10);
        const journals = chunk.map(date => ({
          date, ...clean(local.get(date)),
          favorites: [...localFavs].filter(k => k.startsWith(date + '::')).map(k => k.slice(date.length + 2)),
        }));
        try {
          const res = await auth.fetch('/api/journals/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ journals }) });
          if (!res.ok) throw new Error(String(res.status));
          const r = await res.json();
          for (const k of ['imported', 'same', 'conflicts', 'invalid']) total[k].push(...r[k]);
        } catch {
          total.failed.push(...chunk);
        }
      }
      // this browser's starred Findings boxes travel along (stars only add, never remove)
      for (const course of local.findingsFavorites().filter(k => !findingsFavs.includes(k))) {
        try { await auth.fetch(`/api/findings/favorites/${encodeURIComponent(course)}`, { method: 'PUT' }); } catch {}
      }
      await fetchServer();
      return total;
    },

    onChange: fn => { listeners.change.add(fn); return () => listeners.change.delete(fn); },
    onSync: fn => { listeners.sync.add(fn); return () => listeners.sync.delete(fn); },
    onNotice: fn => { listeners.notice.add(fn); return () => listeners.notice.delete(fn); },
    onBeforeModeChange: fn => { listeners.beforeMode.add(fn); return () => listeners.beforeMode.delete(fn); },
  };

  window.PhiBrain.journalStore = store;
  if (mode === 'server') { restore(); fetchServer(); }
})();
