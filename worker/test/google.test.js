// port of server/gmail.test.js + the fetch-based parts that are new on the Worker
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBodyText, buildQuery, buildAuthUrl, GMAIL_SCOPE } from '../src/assignment/google.js';

const b64url = s => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

test('extractBodyText prefers text/plain when both parts exist', () => {
  const payload = {
    parts: [
      { mimeType: 'text/plain', body: { data: b64url('plain body') } },
      { mimeType: 'text/html', body: { data: b64url('<p>html body</p>') } },
    ],
  };
  assert.equal(extractBodyText(payload), 'plain body');
});

test('extractBodyText decodes UTF-8 (Korean receipts), not Latin-1', () => {
  assert.equal(extractBodyText({ mimeType: 'text/plain', body: { data: b64url('[AL] 과제 제출 — 2주차') } }), '[AL] 과제 제출 — 2주차');
});

test('extractBodyText falls back to stripped text/html when there is no text/plain part', () => {
  const text = extractBodyText({ parts: [{ mimeType: 'text/html', body: { data: b64url('<p>1주차</p><br>답변: ok') } }] });
  assert.match(text, /1주차/);
  assert.match(text, /답변: ok/);
  assert.equal(text.includes('<p>'), false);
});

test('extractBodyText walks nested multipart/alternative trees', () => {
  const payload = {
    mimeType: 'multipart/mixed',
    parts: [{ mimeType: 'multipart/alternative', parts: [{ mimeType: 'text/plain', body: { data: b64url('nested plain') } }] }],
  };
  assert.equal(extractBodyText(payload), 'nested plain');
});

test('buildQuery always scopes to the forms receipts sender, with an optional after: in unix seconds', () => {
  assert.equal(buildQuery({}), 'from:forms-receipts-noreply@google.com');
  assert.equal(buildQuery({ afterSec: 1757000000 }), 'from:forms-receipts-noreply@google.com after:1757000000');
});

test('the Gmail consent URL asks for gmail.readonly only, offline, and carries the state', () => {
  const u = new URL(buildAuthUrl({ clientId: 'cid', redirectUri: 'https://api.example/auth/google/callback', state: 'st', loginHint: 'me@example.com' }));
  assert.equal(u.searchParams.get('scope'), GMAIL_SCOPE);
  assert.equal(GMAIL_SCOPE, 'https://www.googleapis.com/auth/gmail.readonly');
  assert.equal(u.searchParams.get('access_type'), 'offline');
  assert.equal(u.searchParams.get('prompt'), 'consent');
  assert.equal(u.searchParams.get('state'), 'st');
  assert.equal(u.searchParams.get('login_hint'), 'me@example.com');
});
