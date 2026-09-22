// Findings box stars and account settings (2026-09-14 사용자 요구사항). Behind the session.
//
//   PUT    /api/findings/favorites/:key      star one Findings box
//   DELETE /api/findings/favorites/:key      unstar
// key = '날짜::과목::그 날 그 과목의 몇 번째' (2026-09-16 사용자 지시 — 별표가 과목이 아니라 박스 하나 단위).
// 예전 과목 단위 키('general'·'BI')도 계속 받는다: 이미 별표해 둔 것을 지울 수 있어야 해서.
// (테이블 컬럼 이름은 findings_favorites.course 그대로 — 담기는 값만 박스 키로 넓어졌다.)
//   PUT    /api/findings/hidden/:key         hide one Findings box (Findings에서만 삭제, 2026-09-22 — 원본 저널은 그대로)
//   DELETE /api/findings/hidden/:key         show it again (되돌리기)
// hidden key = '날짜::과목::내용지문' — 순번 대신 박스 글자의 해시라 저널을 고쳐도 다른 박스로 옮겨 가지 않는다.
//   GET    /api/settings                     → { nickname }
//   PUT    /api/settings                     { nickname } — trimmed, up to 20 characters, '' clears it
// The starred Findings boxes also come with GET /api/journals (findingsFavorites), since Findings are built from journals.
import { BadRequest } from './journals.js';

const COURSE_RE = /^(general|[A-Z]{2,4})$/; // 예전(과목 단위) 키
const FINDING_KEY_RE = /^\d{4}-\d{2}-\d{2}::(general|[A-Z]{2,4})::\d{1,3}$/;
const HIDDEN_KEY_RE = /^\d{4}-\d{2}-\d{2}::(general|[A-Z]{2,4})::[a-z0-9]{1,16}$/;
export const NICKNAME_MAX = 20;

// 별표한 순서가 곧 화면 순서다. created_at은 밀리초라 연달아 누르면 같은 값이 나오는데,
// 그때 course 이름순으로 깨지던 것을 넣은 순서(rowid)로 바로잡았다(2026-09-17, 간헐 실패 재현 후 수정).
export async function listFindingsFavorites(db) {
  const { results } = await db.prepare('SELECT course FROM findings_favorites ORDER BY created_at, rowid').all();
  return results.map(r => r.course);
}

export async function setFindingsFavorite(db, course, on) {
  if (!COURSE_RE.test(course) && !FINDING_KEY_RE.test(course)) throw new BadRequest('bad_course');
  if (on) await db.prepare('INSERT INTO findings_favorites (course, created_at) VALUES (?, ?) ON CONFLICT DO NOTHING').bind(course, new Date().toISOString()).run();
  else await db.prepare('DELETE FROM findings_favorites WHERE course = ?').bind(course).run();
  return { ok: true };
}

export async function listFindingsHidden(db) {
  const { results } = await db.prepare('SELECT key FROM findings_hidden ORDER BY created_at, rowid').all();
  return results.map(r => r.key);
}

export async function setFindingsHidden(db, key, on) {
  if (!HIDDEN_KEY_RE.test(key)) throw new BadRequest('bad_key');
  if (on) await db.prepare('INSERT INTO findings_hidden (key, created_at) VALUES (?, ?) ON CONFLICT DO NOTHING').bind(key, new Date().toISOString()).run();
  else await db.prepare('DELETE FROM findings_hidden WHERE key = ?').bind(key).run();
  return { ok: true };
}

export async function getSettings(db) {
  const row = await db.prepare(`SELECT value FROM settings WHERE key = 'nickname'`).first();
  return { nickname: row ? row.value : '' };
}

export async function saveSettings(db, body) {
  if (!body || typeof body.nickname !== 'string') throw new BadRequest('bad_body');
  // spaces/newlines collapse, so a pasted name can't break the header
  const nickname = body.nickname.replace(/\s+/g, ' ').trim();
  if ([...nickname].length > NICKNAME_MAX) throw new BadRequest('nickname_too_long');
  if (nickname) {
    await db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES ('nickname', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(nickname, new Date().toISOString()).run();
  } else {
    await db.prepare(`DELETE FROM settings WHERE key = 'nickname'`).run();
  }
  return { ok: true, nickname };
}

export async function settingsApi(request, env, url, json) {
  const db = env.DB, method = request.method;
  if (url.pathname === '/api/settings') {
    if (method === 'GET') return json(200, await getSettings(db));
    if (method === 'PUT') return json(200, await saveSettings(db, await request.json().catch(() => null)));
    return null;
  }
  const h = url.pathname.match(/^\/api\/findings\/hidden\/([^/]+)$/);
  if (h && (method === 'PUT' || method === 'DELETE')) return json(200, await setFindingsHidden(db, decodeURIComponent(h[1]), method === 'PUT'));
  const m = url.pathname.match(/^\/api\/findings\/favorites\/([^/]+)$/);
  if (m && (method === 'PUT' || method === 'DELETE')) return json(200, await setFindingsFavorite(db, decodeURIComponent(m[1]), method === 'PUT'));
  return null;
}
