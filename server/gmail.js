// Minimal Gmail API v1 client: search + fetch + decode. Plain https, no SDK.
// Query syntax: https://developers.google.com/workspace/gmail/api/guides/filtering
'use strict';
const https = require('node:https');
const { FORMS_SENDER } = require('./matching');

function apiGet(accessToken, path) {
  return new Promise((resolve, reject) => {
    https.request({
      hostname: 'gmail.googleapis.com', path, method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }, res => {
      let chunks = '';
      res.on('data', c => { chunks += c; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(chunks); } catch { json = { raw: chunks }; }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
        else reject(Object.assign(new Error(`Gmail API ${path} ${res.statusCode}`), { body: json, status: res.statusCode }));
      });
    }).on('error', reject).end();
  });
}

// `after:` takes a date or unix seconds; combined with the sender filter this
// keeps each sync small (spec's "관련 메일 조회" — related mail only, not the
// whole mailbox).
function buildQuery({ sinceDate }) {
  const clauses = [`from:${FORMS_SENDER}`];
  if (sinceDate) clauses.push(`after:${sinceDate}`);
  return clauses.join(' ');
}

async function searchMessageIds(accessToken, { sinceDate, pageToken } = {}) {
  const q = encodeURIComponent(buildQuery({ sinceDate }));
  const pt = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
  const res = await apiGet(accessToken, `/gmail/v1/users/me/messages?q=${q}${pt}`);
  return { ids: (res.messages || []).map(m => m.id), nextPageToken: res.nextPageToken || null };
}

function base64UrlDecode(s) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+\n/g, '\n');
}

// Walks the MIME tree for the first text/plain part, falling back to
// text/html stripped to text — Forms receipts can arrive as either.
function extractBodyText(payload) {
  const parts = payload.parts || [payload];
  let plain = null, html = null;
  const walk = p => {
    if (!p) return;
    if (p.mimeType === 'text/plain' && p.body?.data) plain = plain || base64UrlDecode(p.body.data);
    if (p.mimeType === 'text/html' && p.body?.data) html = html || base64UrlDecode(p.body.data);
    (p.parts || []).forEach(walk);
  };
  walk(payload);
  if (plain) return plain;
  if (html) return stripHtml(html);
  return '';
}

function header(payload, name) {
  const h = (payload.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

async function fetchEmail(accessToken, messageId) {
  const msg = await apiGet(accessToken, `/gmail/v1/users/me/messages/${messageId}?format=full`);
  return {
    messageId: msg.id,
    threadId: msg.threadId,
    from: header(msg.payload, 'From'),
    subject: header(msg.payload, 'Subject'),
    receivedAt: new Date(Number(msg.internalDate)).toISOString(),
    bodyText: extractBodyText(msg.payload),
  };
}

module.exports = { buildQuery, searchMessageIds, fetchEmail, extractBodyText, stripHtml };
