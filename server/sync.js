// Orchestrates one "제출 상태 새로고침": refresh the access token if needed,
// search recent Forms receipts, fetch and ingest each one.
'use strict';
const { refreshAccessToken } = require('./googleOAuth');
const { searchMessageIds, fetchEmail } = require('./gmail');
const { ingestEmail } = require('./service');
const { SEMESTER_START } = require('./db');

function nowIso() { return new Date().toISOString(); }

async function ensureAccessToken(db) {
  const conn = db.prepare('SELECT * FROM gmail_connection WHERE id = 1').get();
  if (!conn?.connected || !conn.refresh_token) {
    const err = new Error('Gmail이 연결되어 있지 않습니다.');
    err.code = 'NOT_CONNECTED';
    throw err;
  }
  const expiry = conn.token_expiry ? new Date(conn.token_expiry).getTime() : 0;
  if (conn.access_token && expiry - Date.now() > 60_000) return conn.access_token;
  const tokens = await refreshAccessToken(conn.refresh_token);
  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  db.prepare('UPDATE gmail_connection SET access_token = ?, token_expiry = ? WHERE id = 1')
    .run(tokens.access_token, tokenExpiry);
  return tokens.access_token;
}

async function runSync(db) {
  let accessToken;
  try {
    accessToken = await ensureAccessToken(db);
  } catch (err) {
    db.prepare('UPDATE gmail_connection SET last_sync_error = ? WHERE id = 1').run(err.message);
    throw err;
  }

  const sinceDate = SEMESTER_START.replace(/-/g, '/'); // Gmail after: wants YYYY/MM/DD
  const summary = { matched: 0, review: 0, duplicate: 0, unrelated: 0, fetched: 0 };
  try {
    let pageToken;
    do {
      const { ids, nextPageToken } = await searchMessageIds(accessToken, { sinceDate, pageToken });
      for (const id of ids) {
        const email = await fetchEmail(accessToken, id);
        summary.fetched++;
        const result = ingestEmail(db, email);
        summary[result.outcome] = (summary[result.outcome] || 0) + 1;
      }
      pageToken = nextPageToken;
    } while (pageToken);

    db.prepare('UPDATE gmail_connection SET last_sync_at = ?, last_sync_error = NULL WHERE id = 1').run(nowIso());
    return summary;
  } catch (err) {
    db.prepare('UPDATE gmail_connection SET last_sync_error = ? WHERE id = 1').run(err.message);
    throw err;
  }
}

module.exports = { runSync, ensureAccessToken };
