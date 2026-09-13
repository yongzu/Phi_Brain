// Weekly sync (M3): read Forms receipts that arrived since the last successful
// sync and record them in the public status file the deployed site reads.
// Runs in GitHub Actions every Sunday 23:59 KST (.github/workflows/assignment-sync.yml)
// and can be run locally the same way.
//
//   node server/export-snapshot.js            incremental (since lastSyncedAt − 1 day)
//   node server/export-snapshot.js --full     re-judge every receipt in the cohort window
//                                             (after changing matching rules; "manual" cells kept)
//
// Needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GMAIL_REFRESH_TOKEN. Locally,
// the first two come from server/.env and the refresh token falls back to the
// local database's Gmail connection, so it never has to be copied by hand.
//
// Nothing about individual mails is logged — Actions logs of a public repo are public.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

// values pasted into GitHub Secrets easily pick up a trailing newline or space
for (const k of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN']) {
  if (process.env[k] !== undefined) process.env[k] = process.env[k].trim();
}

// On a credential error, report only yes/no format checks — never a value, a
// length, or a fragment (the Actions log of a public repo is public).
function credentialHints() {
  const id = process.env.GOOGLE_CLIENT_ID || '', secret = process.env.GOOGLE_CLIENT_SECRET || '', rt = process.env.GMAIL_REFRESH_TOKEN || '';
  const quoted = v => /^["']|["']$/.test(v);
  return {
    clientIdSet: !!id, clientIdEndsWithGoogleusercontent: id.endsWith('.apps.googleusercontent.com'), clientIdHasNamePrefix: /^GOOGLE_CLIENT_ID\s*=/.test(id), clientIdQuoted: quoted(id),
    secretSet: !!secret, secretStartsWithGOCSPX: secret.startsWith('GOCSPX-'), secretHasNamePrefix: /^GOOGLE_CLIENT_SECRET\s*=/.test(secret), secretQuoted: quoted(secret),
    looksSwapped: secret.endsWith('.apps.googleusercontent.com') || id.startsWith('GOCSPX-'),
    refreshTokenSet: !!rt, refreshTokenStartsWith1slash: rt.startsWith('1//'),
  };
}

const { refreshAccessToken } = require('./googleOAuth');
const { searchMessageIds, fetchEmail } = require('./gmail');
const { matchEmail } = require('./matching');
const { RECEIPTS_FROM, RECEIPTS_UNTIL } = require('./db');
const { normalizeSnapshot, applyMatch, resetMailCells, searchSince, serialize, coursesForMatching } = require('./snapshot');

const OUT = path.join(__dirname, '..', 'design', 'prototypes', 'data', 'assignment-status.json');

function localRefreshToken() {
  const dbPath = path.join(__dirname, 'data', 'assignment-manage.sqlite');
  if (!fs.existsSync(dbPath)) return null;
  const { DatabaseSync } = require('node:sqlite');
  return new DatabaseSync(dbPath).prepare('SELECT refresh_token FROM gmail_connection WHERE id = 1').get()?.refresh_token || null;
}

// short, token-free reason for the page and the (public) log
function describeError(err) {
  const code = err.body?.error;
  if (code === 'invalid_grant') return 'Gmail 인증이 만료됐어요 — 로컬에서 Gmail을 다시 연결하고 GMAIL_REFRESH_TOKEN을 갱신하세요';
  if (code === 'invalid_client') return 'Google 앱 설정값이 맞지 않아요 — GitHub Secrets의 GOOGLE_CLIENT_ID·GOOGLE_CLIENT_SECRET을 확인하세요';
  if (/Missing required env var|GMAIL_REFRESH_TOKEN/.test(err.message)) return `설정 누락: ${err.message.replace(/ — see .*$/, '')}`;
  return `${err.message}${code ? ` (${code})` : ''}`.slice(0, 200);
}

async function main() {
  const full = process.argv.includes('--full');
  const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const snap = normalizeSnapshot(existing);
  const mode = full ? 'full' : snap.lastSyncedAt ? 'incremental' : 'first run (full window)';
  const startedAt = new Date().toISOString();
  const summary = { receipts: 0, matched: 0, newlyConfirmed: 0, ambiguous: 0, unrelated: 0 };

  try {
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN || localRefreshToken();
    if (!refreshToken) throw new Error('GMAIL_REFRESH_TOKEN이 없습니다');
    const { access_token: accessToken } = await refreshAccessToken(refreshToken);

    if (full) resetMailCells(snap);
    const ctx = { courses: coursesForMatching(), windowStart: RECEIPTS_FROM, windowEnd: RECEIPTS_UNTIL };
    const sinceDate = searchSince(snap, { full });
    let pageToken;
    do {
      const page = await searchMessageIds(accessToken, { sinceDate, pageToken });
      for (const id of page.ids) {
        const result = matchEmail(await fetchEmail(accessToken, id), ctx);
        summary.receipts++;
        if (result.status === 'matched') {
          summary.matched++;
          if (applyMatch(snap, result)) summary.newlyConfirmed++;
        } else summary[result.status]++;
      }
      pageToken = page.nextPageToken;
    } while (pageToken);

    // the cursor only moves on success — a failed week is simply picked up next time
    snap.lastSyncedAt = startedAt;
    snap.lastRunAt = startedAt;
    snap.lastError = null;
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, serialize(snap));
    console.log(`sync ok (${mode}) ${JSON.stringify(summary)}`);
  } catch (err) {
    snap.lastRunAt = startedAt;
    snap.lastError = describeError(err);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, serialize(snap));
    console.error(`sync failed: ${snap.lastError}`);
    if (['invalid_client', 'invalid_grant', 'unauthorized_client'].includes(err.body?.error)) {
      const hints = JSON.stringify(credentialHints());
      console.error(`credential format checks: ${hints}`);
      // also as a run annotation (shown on the run summary page) — booleans only
      if (process.env.GITHUB_ACTIONS) console.log(`::warning title=credential format checks::${hints}`);
    }
    process.exitCode = 1;
  }
}

main();
