// 온라인 전환 3단계: Journaling API on D1. All routes sit behind the session.
//
//   GET    /api/journals                       every journal + archive favorites
//   PUT    /api/journals/:date                 save { title, courses, html, savedAt, baseVersion, force? }
//   DELETE /api/journals/:date?baseVersion=n   delete (and its favorites)
//   PUT    /api/journals/:date/favorites/:course   star a card
//   DELETE /api/journals/:date/favorites/:course   unstar
//   POST   /api/journals/import                { journals: [...] } — a browser's localStorage journals, never overwriting
//
// Concurrency: each row has a version. A save/delete carries the version the
// device last saw (baseVersion; null = "I think it doesn't exist yet"). If the
// row has moved on — edited on another device — the answer is 409 with the
// server's copy, and the page asks before overwriting (force).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COURSE_RE = /^(general|[A-Z]{2,4})$/;
const LIMITS = { title: 500, html: 500_000, courses: 13, import: 20 };

export class BadRequest extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

const toJournal = r => ({ date: r.date, title: r.title, courses: JSON.parse(r.courses), html: r.html, savedAt: r.saved_at, version: r.version });

export function validDate(date) {
  if (!DATE_RE.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

// → normalized { title, courses, html, savedAt } or throws BadRequest
export function cleanJournal(body) {
  if (!body || typeof body !== 'object') throw new BadRequest('bad_body');
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const html = typeof body.html === 'string' ? body.html : '';
  const courses = Array.isArray(body.courses) ? [...new Set(body.courses.filter(c => typeof c === 'string' && COURSE_RE.test(c)))] : [];
  const savedAt = Number.isFinite(body.savedAt) && body.savedAt > 0 ? Math.floor(body.savedAt) : Date.now();
  if (title.length > LIMITS.title) throw new BadRequest('title_too_long', 413);
  if (html.length > LIMITS.html) throw new BadRequest('journal_too_large', 413);
  if (courses.length > LIMITS.courses) throw new BadRequest('bad_courses');
  return { title, courses, html, savedAt };
}

export async function listJournals(db) {
  const [journals, favorites] = await db.batch([
    db.prepare('SELECT * FROM journals ORDER BY date DESC'),
    db.prepare('SELECT date, course FROM journal_favorites ORDER BY created_at'),
  ]);
  return { journals: journals.results.map(toJournal), favorites: favorites.results.map(f => `${f.date}::${f.course}`) };
}

const getRow = (db, date) => db.prepare('SELECT * FROM journals WHERE date = ?').bind(date).first();

// → { ok: true, version } | { ok: false, conflict: true, journal: server copy or null }
export async function saveJournal(db, date, body) {
  const j = cleanJournal(body);
  const base = body.baseVersion ?? null;
  const now = new Date().toISOString();
  const row = await getRow(db, date);
  if (row && !body.force && base !== row.version) return { ok: false, conflict: true, journal: toJournal(row) };
  if (!row) {
    // a device that saw this journal (base set) but finds it gone: deleted elsewhere — ask too
    if (base !== null && !body.force) return { ok: false, conflict: true, journal: null };
    const r = await db.prepare(`
      INSERT INTO journals (date, title, courses, html, saved_at, version, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(date) DO NOTHING
    `).bind(date, j.title, JSON.stringify(j.courses), j.html, j.savedAt, now).run();
    if (!r.meta.changes) return { ok: false, conflict: true, journal: toJournal(await getRow(db, date)) }; // raced with another insert
    return { ok: true, version: 1 };
  }
  // compare-and-set on the version we just read, so two saves can't both win
  const r = await db.prepare(`
    UPDATE journals SET title = ?, courses = ?, html = ?, saved_at = ?, version = version + 1, updated_at = ?
    WHERE date = ? AND version = ?
  `).bind(j.title, JSON.stringify(j.courses), j.html, j.savedAt, now, date, row.version).run();
  if (!r.meta.changes) return { ok: false, conflict: true, journal: toJournal(await getRow(db, date)) };
  return { ok: true, version: row.version + 1 };
}

export async function deleteJournal(db, date, { baseVersion, force = false } = {}) {
  const row = await getRow(db, date);
  if (!row) return { ok: true, deleted: false };
  if (!force && baseVersion !== row.version) return { ok: false, conflict: true, journal: toJournal(row) };
  await db.batch([
    db.prepare('DELETE FROM journals WHERE date = ? AND version = ?').bind(date, row.version),
    db.prepare('DELETE FROM journal_favorites WHERE date = ? AND NOT EXISTS (SELECT 1 FROM journals WHERE date = ?)').bind(date, date),
  ]);
  return { ok: true, deleted: true };
}

export async function setFavorite(db, date, course, on) {
  if (!COURSE_RE.test(course)) throw new BadRequest('bad_course');
  if (on) {
    await db.prepare('INSERT INTO journal_favorites (date, course, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING')
      .bind(date, course, new Date().toISOString()).run();
  } else {
    await db.prepare('DELETE FROM journal_favorites WHERE date = ? AND course = ?').bind(date, course).run();
  }
  return { ok: true };
}

// A browser's own journals, uploaded once per device. Never overwrites:
// a date the server doesn't have is added; the same content is "already there";
// different content under the same date is reported back as a conflict.
// One read + one batch per call (the free plan caps D1 queries per invocation),
// so the page sends small chunks.
export async function importJournals(db, body) {
  const list = Array.isArray(body?.journals) ? body.journals : null;
  if (!list) throw new BadRequest('bad_body');
  if (list.length > LIMITS.import) throw new BadRequest('too_many', 413);
  const result = { imported: [], same: [], conflicts: [], invalid: [] };
  const items = [];
  for (const item of list) {
    const date = item?.date;
    if (typeof date !== 'string' || !validDate(date) || items.some(i => i.date === date)) { result.invalid.push(String(date)); continue; }
    try { items.push({ date, ...cleanJournal(item), favorites: Array.isArray(item.favorites) ? item.favorites.filter(c => typeof c === 'string' && COURSE_RE.test(c)) : [] }); }
    catch { result.invalid.push(date); }
  }
  if (!items.length) return result;

  const { results: rows } = await db.prepare(`SELECT * FROM journals WHERE date IN (${items.map(() => '?').join(',')})`)
    .bind(...items.map(i => i.date)).all();
  const existing = new Map(rows.map(r => [r.date, r]));
  const now = new Date().toISOString();
  const stmts = [];
  for (const i of items) {
    const row = existing.get(i.date);
    const courses = JSON.stringify(i.courses);
    if (row) {
      const same = row.title === i.title && row.html === i.html && row.courses === courses;
      result[same ? 'same' : 'conflicts'].push(i.date);
      if (!same) continue;
    } else {
      result.imported.push(i.date);
      stmts.push(db.prepare('INSERT INTO journals (date, title, courses, html, saved_at, version, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
        .bind(i.date, i.title, courses, i.html, i.savedAt, now));
    }
    // stars travel with a journal that is (now) on the server with this content
    for (const course of i.favorites) {
      stmts.push(db.prepare('INSERT INTO journal_favorites (date, course, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').bind(i.date, course, now));
    }
  }
  if (stmts.length) await db.batch(stmts); // atomic: a date inserted meanwhile fails the whole chunk → the page retries it
  return result;
}

// → Response or null (not a journal route)
export async function journalsApi(request, env, url, json) {
  const db = env.DB;
  const method = request.method;
  const path = url.pathname;
  if (path === '/api/journals' && method === 'GET') return json(200, await listJournals(db));
  if (path === '/api/journals/import' && method === 'POST') {
    return json(200, await importJournals(db, await request.json().catch(() => null)));
  }
  let m = path.match(/^\/api\/journals\/([^/]+)$/);
  if (m) {
    const date = decodeURIComponent(m[1]);
    if (!validDate(date)) return json(400, { error: 'bad_date' });
    if (method === 'PUT') {
      const r = await saveJournal(db, date, await request.json().catch(() => null));
      return json(r.ok ? 200 : 409, r);
    }
    if (method === 'DELETE') {
      const base = url.searchParams.get('baseVersion');
      const r = await deleteJournal(db, date, { baseVersion: base === null ? null : Number(base), force: url.searchParams.get('force') === '1' });
      return json(r.ok ? 200 : 409, r);
    }
  }
  m = path.match(/^\/api\/journals\/([^/]+)\/favorites\/([^/]+)$/);
  if (m && (method === 'PUT' || method === 'DELETE')) {
    const date = decodeURIComponent(m[1]);
    if (!validDate(date)) return json(400, { error: 'bad_date' });
    return json(200, await setFavorite(db, date, decodeURIComponent(m[2]), method === 'PUT'));
  }
  return null;
}
