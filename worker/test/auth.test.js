import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyGoogleIdToken, signSession, verifySession, b64url, AuthError } from '../src/auth.js';

const enc = new TextEncoder();
const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const ALLOWED = 'owner@example.com';
const NOW = 1_800_000_000;

// a fake "Google": our own RSA key published as a JWKS
const { privateKey, publicKey } = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1', use: 'sig' };
const getKeys = async () => [jwk];

async function idToken(claims = {}, { kid = 'k1', alg = 'RS256', key = privateKey } = {}) {
  const header = b64url(enc.encode(JSON.stringify({ alg, kid, typ: 'JWT' })));
  const payload = b64url(enc.encode(JSON.stringify({
    iss: 'https://accounts.google.com', aud: CLIENT_ID, exp: NOW + 3600, email: ALLOWED, email_verified: true, ...claims,
  })));
  const sig = b64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${header}.${payload}`)));
  return `${header}.${payload}.${sig}`;
}
const opts = { clientId: CLIENT_ID, allowedEmail: ALLOWED, getKeys, now: NOW };
const rejects = async (token, reason, o = opts) =>
  assert.rejects(verifyGoogleIdToken(token, o), e => e instanceof AuthError && e.reason === reason);

test('a valid Google ID token for the allowed account passes', async () => {
  assert.deepEqual(await verifyGoogleIdToken(await idToken(), opts), { email: ALLOWED });
});

test('email comparison ignores case', async () => {
  assert.equal((await verifyGoogleIdToken(await idToken({ email: 'Owner@Example.com' }), opts)).email, 'Owner@Example.com');
});

test('any other Google account is refused', async () => rejects(await idToken({ email: 'someone@example.com' }), 'not_allowed'));

test('a token signed by anyone but Google is refused', async () => {
  const other = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign']);
  await rejects(await idToken({}, { key: other.privateKey }), 'bad_signature');
});

test('a token whose payload was edited after signing is refused', async () => {
  const [h, , s] = (await idToken({ email: 'someone@example.com' })).split('.');
  const forged = b64url(enc.encode(JSON.stringify({ iss: 'https://accounts.google.com', aud: CLIENT_ID, exp: NOW + 3600, email: ALLOWED, email_verified: true })));
  await rejects(`${h}.${forged}.${s}`, 'bad_signature');
});

test('wrong audience, issuer, expiry, unverified email, unknown key, alg=none are each refused', async () => {
  await rejects(await idToken({ aud: 'another-app' }), 'bad_audience');
  await rejects(await idToken({ iss: 'https://evil.example' }), 'bad_issuer');
  await rejects(await idToken({ exp: NOW - 3600 }), 'expired');
  await rejects(await idToken({ email_verified: false }), 'email_not_verified');
  await rejects(await idToken({}, { kid: 'nope' }), 'unknown_key');
  await rejects(await idToken({}, { alg: 'none' }), 'bad_algorithm');
  await rejects('not-a-jwt', 'malformed_token');
});

test('session tokens round-trip and carry the email', async () => {
  const { token } = await signSession('s3cret', { email: ALLOWED }, { now: NOW });
  assert.equal((await verifySession('s3cret', token, { allowedEmail: ALLOWED, now: NOW + 10 })).email, ALLOWED);
});

test('a session token is rejected when tampered, expired, signed with another secret, or for another account', async () => {
  const { token } = await signSession('s3cret', { email: ALLOWED }, { now: NOW, ttl: 100 });
  const [body, sig] = token.split('.');
  const other = b64url(enc.encode(JSON.stringify({ v: 1, email: ALLOWED, iat: NOW, exp: NOW + 10 ** 9 })));
  assert.equal(await verifySession('s3cret', `${other}.${sig}`, { now: NOW }), null);
  assert.equal(await verifySession('s3cret', token, { now: NOW + 101 }), null);
  assert.equal(await verifySession('rotated', token, { now: NOW }), null);
  assert.equal(await verifySession('s3cret', token, { allowedEmail: 'new@example.com', now: NOW }), null);
  assert.equal(await verifySession('s3cret', `${body}.${sig}.x`, { now: NOW }), null);
  assert.equal(await verifySession('s3cret', undefined, { now: NOW }), null);
});
