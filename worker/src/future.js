// 온라인 전환 4단계: Future Item API. The whole board is one versioned document.
//
//   GET /api/future   → { data: {items, favorites, customBoxes, boxOrder} | null, version }   (version 0 = nothing saved yet)
//   PUT /api/future   { data, baseVersion, force? } → { ok, version } | 409 { conflict, data, version }
//
// The page validates and normalizes the board itself (future.js); the server
// only checks the shape and size, and that the save builds on what's stored.
import { BadRequest } from './journals.js';

const MAX_BYTES = 1_000_000;

export function cleanBoard(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.items)) throw new BadRequest('bad_board');
  const board = {
    items: data.items.filter(i => i && typeof i === 'object' && typeof i.id === 'string' && typeof i.text === 'string'),
    favorites: Array.isArray(data.favorites) ? data.favorites.filter(k => typeof k === 'string') : [],
    customBoxes: Array.isArray(data.customBoxes) ? data.customBoxes.filter(b => b && typeof b.id === 'string' && typeof b.name === 'string') : [],
    boxOrder: Array.isArray(data.boxOrder) ? data.boxOrder.filter(k => typeof k === 'string') : [],
  };
  const json = JSON.stringify(board);
  if (new TextEncoder().encode(json).length > MAX_BYTES) throw new BadRequest('board_too_large', 413);
  return json;
}

export async function getBoard(db) {
  const row = await db.prepare('SELECT data, version FROM future_state WHERE id = 1').first();
  return row ? { data: JSON.parse(row.data), version: row.version } : { data: null, version: 0 };
}

export async function saveBoard(db, body) {
  const json = cleanBoard(body?.data);
  const base = Number.isInteger(body?.baseVersion) ? body.baseVersion : 0;
  const now = new Date().toISOString();
  const current = await getBoard(db);
  if (!body.force && base !== current.version) return { ok: false, conflict: true, ...current };
  const r = current.version === 0
    ? await db.prepare('INSERT INTO future_state (id, data, version, updated_at) VALUES (1, ?, 1, ?) ON CONFLICT(id) DO NOTHING').bind(json, now).run()
    // compare-and-set on the version just read, so two saves can't both win
    : await db.prepare('UPDATE future_state SET data = ?, version = version + 1, updated_at = ? WHERE id = 1 AND version = ?').bind(json, now, current.version).run();
  if (!r.meta.changes) return { ok: false, conflict: true, ...(await getBoard(db)) };
  return { ok: true, version: current.version + 1 };
}

export async function futureApi(request, env, url, json) {
  if (url.pathname !== '/api/future') return null;
  if (request.method === 'GET') return json(200, await getBoard(env.DB));
  if (request.method === 'PUT') {
    const r = await saveBoard(env.DB, await request.json().catch(() => null) || {});
    return json(r.ok ? 200 : 409, r);
  }
  return null;
}
