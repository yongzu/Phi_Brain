// Google OAuth2 "web server" flow (authorization code), implemented with
// plain https — no googleapis dependency. Follows:
// https://developers.google.com/workspace/gmail/api/auth/web-server
'use strict';
const https = require('node:https');
const { URLSearchParams } = require('node:url');

// Read-only, gmail.readonly only — never a scope that can send, delete or
// modify mail (spec §4). This scope is not limited to any one sender; that's
// explained to the user in the connect-screen copy, not encoded here.
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name} — see server/.env.example`);
  return v;
}

function buildAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function postForm(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams(body).toString();
    const req = https.request({
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let chunks = '';
      res.on('data', c => { chunks += c; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(chunks); } catch { json = { raw: chunks }; }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
        else reject(Object.assign(new Error(`${hostname}${path} ${res.statusCode}`), { body: json }));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function exchangeCodeForTokens(code) {
  return postForm('oauth2.googleapis.com', '/token', {
    code,
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
    redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
    grant_type: 'authorization_code',
  });
  // -> { access_token, expires_in, refresh_token, scope, token_type, id_token }
}

async function refreshAccessToken(refreshToken) {
  return postForm('oauth2.googleapis.com', '/token', {
    refresh_token: refreshToken,
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
    grant_type: 'refresh_token',
  });
  // -> { access_token, expires_in, scope, token_type } (no new refresh_token)
}

module.exports = { SCOPE, buildAuthUrl, exchangeCodeForTokens, refreshAccessToken };
