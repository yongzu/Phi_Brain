const { test } = require('node:test');
const assert = require('node:assert/strict');
const { consentUrl, returnPage } = require('../gmail');
const APP = 'https://yongzu.github.io/Phi_Brain/prototypes/home.html';
const consent = () => new URL('https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  redirect_uri: 'https://api.phibrain.workers.dev/auth/google/callback',
  scope: 'https://www.googleapis.com/auth/gmail.readonly', response_type: 'code', state: 'signed-state',
}));
test('Gmail consent opens only Google with our callback and readonly scope', () => {
  assert.equal(consentUrl(consent().href), consent().href);
  for (const [key, value] of [['redirect_uri', 'https://evil.example'], ['scope', 'https://mail.google.com/'], ['state', ''], ['response_type', 'token']]) {
    const u = consent(); u.searchParams.set(key, value);
    assert.throws(() => consentUrl(u.href));
  }
  for (const url of ['file:///test', 'phibrain://gmail', consent().href.replace('accounts.google.com', 'evil.example'), consent().href.replace('https:', 'http:')]) {
    assert.throws(() => consentUrl(url));
  }
});
test('Gmail results return to Assignment Manage, never establish an app session', () => {
  for (const result of ['connected', 'denied', 'scope_missing', 'no_refresh_token', 'error']) {
    assert.equal(returnPage('phibrain://gmail?gmail=' + result, APP), APP + '?gmail=' + result + '#assignment');
  }
  for (const raw of ['phibrain://auth?code=x&state=x', 'phibrain://gmail.evil?gmail=connected', 'phibrain://user@gmail?gmail=connected', 'phibrain://gmail/path?gmail=connected', 'phibrain://gmail?gmail=connected&token=secret', 'phibrain://gmail?gmail=connected&gmail=error', 'phibrain://gmail?gmail=unknown', 'junk']) {
    assert.equal(returnPage(raw, APP), null, raw);
  }
});
