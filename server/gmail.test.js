'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { extractBodyText, buildQuery } = require('./gmail');

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

test('extractBodyText falls back to stripped text/html when there is no text/plain part', () => {
  const payload = { parts: [{ mimeType: 'text/html', body: { data: b64url('<p>1주차</p><br>답변: ok') } }] };
  const text = extractBodyText(payload);
  assert.match(text, /1주차/);
  assert.match(text, /답변: ok/);
  assert.equal(text.includes('<p>'), false);
});

test('extractBodyText walks nested multipart/alternative trees', () => {
  const payload = {
    mimeType: 'multipart/mixed',
    parts: [{
      mimeType: 'multipart/alternative',
      parts: [{ mimeType: 'text/plain', body: { data: b64url('nested plain') } }],
    }],
  };
  assert.equal(extractBodyText(payload), 'nested plain');
});

test('buildQuery always scopes to the forms receipts sender', () => {
  assert.match(buildQuery({}), /^from:forms-receipts-noreply@google\.com$/);
});

test('buildQuery adds an after: clause when a sync watermark is given', () => {
  assert.equal(buildQuery({ sinceDate: '2026/09/06' }), 'from:forms-receipts-noreply@google.com after:2026/09/06');
});
