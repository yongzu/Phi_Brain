// Assignment Manage backend. Plain Node http — no Express, no npm deps.
// Run: node server/index.js  (reads server/.env if present, see .env.example)
'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

// tiny .env loader (KEY=VALUE per line, # comments) — no dependency needed
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const { getDb } = require('./db');
const svc = require('./service');
const { buildAuthUrl, exchangeCodeForTokens } = require('./googleOAuth');
const { runSync } = require('./sync');

const PORT = Number(process.env.PORT || 5600);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5500';
const db = getDb();

// short-lived OAuth state, in-memory only — this process is meant to run
// on one machine for one user, not survive as a multi-instance service.
const pendingStates = new Map();
function newState() {
  const s = crypto.randomBytes(16).toString('hex');
  pendingStates.set(s, Date.now());
  for (const [k, t] of pendingStates) if (Date.now() - t > 10 * 60_000) pendingStates.delete(k);
  return s;
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers,
  });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') return send(res, 204, '');

  try {
    if (url.pathname === '/api/health') return send(res, 200, { ok: true });

    if (url.pathname === '/api/weeks' && req.method === 'GET') {
      const weeks = svc.getWeeks(db);
      return send(res, 200, { weeks, currentWeekNo: svc.getCurrentWeekNo(db) });
    }

    let m;
    if ((m = url.pathname.match(/^\/api\/weeks\/(\d+)\/matrix$/)) && req.method === 'GET') {
      const matrix = svc.getWeekMatrix(db, Number(m[1]));
      if (!matrix) return send(res, 404, { error: 'week_not_found' });
      return send(res, 200, matrix);
    }

    if ((m = url.pathname.match(/^\/api\/targets\/(\d+)$/)) && req.method === 'GET') {
      const detail = svc.getTargetDetail(db, Number(m[1]));
      if (!detail) return send(res, 404, { error: 'target_not_found' });
      return send(res, 200, detail);
    }

    if ((m = url.pathname.match(/^\/api\/targets\/(\d+)\/manual$/)) && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = svc.setManualStatus(db, Number(m[1]), body.action, { force: !!body.force });
      return send(res, result.ok ? 200 : 409, result);
    }

    if (url.pathname === '/api/connection' && req.method === 'GET') {
      const c = db.prepare('SELECT connected, email, last_sync_at, last_sync_error FROM gmail_connection WHERE id = 1').get();
      return send(res, 200, c);
    }

    if (url.pathname === '/api/connection/disconnect' && req.method === 'POST') {
      db.prepare(`
        UPDATE gmail_connection SET connected = 0, email = NULL, refresh_token = NULL,
          access_token = NULL, token_expiry = NULL WHERE id = 1
      `).run();
      return send(res, 200, { ok: true });
    }

    if (url.pathname === '/api/sync' && req.method === 'POST') {
      try {
        const summary = await runSync(db);
        return send(res, 200, { ok: true, summary });
      } catch (err) {
        return send(res, 502, { ok: false, error: err.code || 'sync_failed', message: err.message });
      }
    }

    if (url.pathname === '/auth/google/start' && req.method === 'GET') {
      let authUrl;
      try {
        authUrl = buildAuthUrl(newState());
      } catch (err) {
        return send(res, 400, `Google 연결에 필요한 서버 설정이 없어요: ${err.message}`);
      }
      res.writeHead(302, { Location: authUrl });
      return res.end();
    }

    if (url.pathname === '/auth/google/callback' && req.method === 'GET') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!state || !pendingStates.has(state)) return send(res, 400, 'Invalid or expired OAuth state.');
      pendingStates.delete(state);
      if (!code) return send(res, 400, `Google이 code를 보내지 않았어요: ${url.searchParams.get('error') || 'unknown'}`);
      const tokens = await exchangeCodeForTokens(code);
      const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      db.prepare(`
        UPDATE gmail_connection SET connected = 1, refresh_token = COALESCE(?, refresh_token),
          access_token = ?, token_expiry = ?, last_sync_error = NULL WHERE id = 1
      `).run(tokens.refresh_token || null, tokens.access_token, tokenExpiry);
      res.writeHead(302, { Location: `${FRONTEND_ORIGIN}/prototypes/home.html#assignment` });
      return res.end();
    }

    return send(res, 404, { error: 'not_found' });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'internal_error', message: err.message });
  }
});

server.listen(PORT, () => console.log(`Assignment Manage backend: http://localhost:${PORT}`));
