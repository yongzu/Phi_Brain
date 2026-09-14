// One "제출 상태 새로고침" step on a Worker.
//
// A Worker invocation is small (free plan: 50 outgoing requests, ~10ms CPU),
// while the first sync reads every receipt since RECEIPTS_FROM. So a run is
// split into batches: each call lists the matching message ids (1 request),
// skips ids an earlier batch already judged (gmail_seen), fetches at most
// `batch` new ones, and reports `done`. The page repeats the call until done;
// the weekly cron continues with follow-up triggers (see wrangler.jsonc).
//
// Search start: fixed for the whole run (sync_since) = last successful sync − 1 day
// (the same margin as server/snapshot.js), or RECEIPTS_FROM for the first run.
import { RECEIPTS_FROM } from './constants.js';
import { getCourses, ingestEmail } from './service.js';
import { refreshAccessToken, listMessageIds, fetchEmail, GoogleError } from './google.js';
import { decryptToken } from '../secrets.js';

export class SyncError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export const DEFAULT_BATCH = 15;
const DAY_SEC = 86400;

export function searchSinceSec(conn) {
  if (conn.sync_pending && conn.sync_since) return conn.sync_since;
  if (conn.last_sync_at) return Math.floor(Date.parse(conn.last_sync_at) / 1000) - DAY_SEC;
  return Math.floor(Date.parse(`${RECEIPTS_FROM}T00:00:00+09:00`) / 1000);
}

async function unseenIds(db, ids) {
  const seen = new Set();
  for (let i = 0; i < ids.length; i += 90) { // stay under D1's bound-parameter limit
    const chunk = ids.slice(i, i + 90);
    const { results } = await db.prepare(`SELECT gmail_message_id FROM gmail_seen WHERE gmail_message_id IN (${chunk.map(() => '?').join(',')})`)
      .bind(...chunk).all();
    for (const r of results) seen.add(r.gmail_message_id);
  }
  return ids.filter(id => !seen.has(id));
}

// → { done, summary: { matched, review, duplicate, unrelated, fetched, remaining } }
export async function runSyncBatch(env, { batch = DEFAULT_BATCH, fetchImpl = fetch } = {}) {
  const db = env.DB;
  const conn = await db.prepare('SELECT * FROM gmail_connection WHERE id = 1').first();
  const fail = async code => {
    await db.prepare('UPDATE gmail_connection SET last_sync_error = ?, last_run_at = ? WHERE id = 1').bind(code, new Date().toISOString()).run();
    return new SyncError(code);
  };
  if (!conn?.connected || !conn.refresh_token_enc) throw await fail('not_connected');
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.TOKEN_KEY) throw await fail('server_not_configured');

  const since = searchSinceSec(conn);
  await db.prepare('UPDATE gmail_connection SET sync_since = ?, sync_pending = 1, last_run_at = ? WHERE id = 1')
    .bind(since, new Date().toISOString()).run();

  const summary = { matched: 0, review: 0, duplicate: 0, unrelated: 0, fetched: 0, remaining: 0 };
  try {
    const refreshToken = await decryptToken(env.TOKEN_KEY, conn.refresh_token_enc);
    const { access_token } = await refreshAccessToken({ refreshToken, clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }, fetchImpl);
    const pending = await unseenIds(db, await listMessageIds(access_token, { afterSec: since }, fetchImpl));
    const take = pending.slice(0, Math.max(1, batch));
    const courses = await getCourses(db);
    for (const id of take) {
      const email = await fetchEmail(access_token, id, fetchImpl);
      summary.fetched++;
      const r = await ingestEmail(db, email, courses);
      summary[r.outcome] = (summary[r.outcome] || 0) + 1;
      await db.prepare('INSERT INTO gmail_seen (gmail_message_id, seen_at) VALUES (?, ?) ON CONFLICT DO NOTHING')
        .bind(id, new Date().toISOString()).run();
    }
    summary.remaining = pending.length - take.length;
    const done = summary.remaining === 0;
    await (done
      ? db.prepare('UPDATE gmail_connection SET sync_pending = 0, sync_since = NULL, last_sync_at = ?, last_sync_error = NULL WHERE id = 1')
        .bind(new Date().toISOString())
      : db.prepare('UPDATE gmail_connection SET last_sync_error = NULL WHERE id = 1')).run();
    return { done, summary };
  } catch (err) {
    if (err instanceof GoogleError && err.code === 'invalid_grant') {
      // the refresh token was revoked or expired — drop it so the page offers "연결하기" again
      await db.prepare('UPDATE gmail_connection SET connected = 0, refresh_token_enc = NULL, sync_pending = 0, sync_since = NULL WHERE id = 1').run();
      throw await fail('reconnect_required');
    }
    if (err instanceof GoogleError) throw await fail(err.code);
    console.error('sync failed', err);
    throw await fail('sync_failed');
  }
}
