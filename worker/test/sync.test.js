import test from 'node:test';
import assert from 'node:assert/strict';
import { testD1 } from './d1.js';
import { receipt } from './fixtures.js';
import { runSyncBatch, searchSinceSec, SyncError } from '../src/assignment/sync.js';
import { encryptToken, decryptToken } from '../src/secrets.js';
import { getWeekMatrix } from '../src/assignment/service.js';

const TOKEN_KEY = Buffer.alloc(32, 7).toString('base64');
const b64url = s => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// a fake Google: token endpoint + Gmail list/get over a set of receipts
function fakeGoogle(mails, { tokenError } = {}) {
  const calls = { token: 0, list: [], get: [] };
  const byId = new Map(mails.map(m => [m.messageId, m]));
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url);
    const ok = body => new Response(JSON.stringify(body), { status: 200 });
    if (u.hostname === 'oauth2.googleapis.com') {
      calls.token++;
      const body = new URLSearchParams(init.body);
      if (tokenError) return new Response(JSON.stringify({ error: tokenError }), { status: 400 });
      assert.equal(body.get('refresh_token'), 'rt-secret');
      return ok({ access_token: 'at', expires_in: 3600 });
    }
    assert.equal(init.headers.Authorization, 'Bearer at');
    const get = u.pathname.match(/\/messages\/([^/]+)$/);
    if (get) {
      calls.get.push(get[1]);
      const m = byId.get(decodeURIComponent(get[1]));
      return ok({
        id: m.messageId, threadId: m.threadId, internalDate: String(Date.parse(m.receivedAt)),
        payload: { headers: [{ name: 'From', value: m.from }, { name: 'Subject', value: m.subject }], mimeType: 'text/plain', body: { data: b64url(m.bodyText) } },
      });
    }
    calls.list.push(u.searchParams.get('q'));
    return ok({ messages: mails.map(m => ({ id: m.messageId })) });
  };
  return { fetchImpl, calls };
}

async function connectedEnv() {
  const db = testD1();
  await db.prepare('UPDATE gmail_connection SET connected = 1, refresh_token_enc = ? WHERE id = 1').bind(await encryptToken(TOKEN_KEY, 'rt-secret')).run();
  return { DB: db, TOKEN_KEY, GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'secret' };
}
const conn = env => env.DB.prepare('SELECT * FROM gmail_connection WHERE id = 1').first();

const mails = Array.from({ length: 5 }, (_, i) =>
  receipt({ tag: ['AL', 'BI', 'EWA', 'IPS', 'VT'][i], week: '2주차' }, { messageId: `m${i}`, threadId: `t${i}`, receivedAt: '2026-09-12T03:00:00.000Z' }));

test('the refresh token is stored encrypted and round-trips; a wrong key cannot read it', async () => {
  const stored = await encryptToken(TOKEN_KEY, 'rt-secret');
  assert.equal(stored.includes('rt-secret'), false);
  assert.equal(await decryptToken(TOKEN_KEY, stored), 'rt-secret');
  await assert.rejects(decryptToken(Buffer.alloc(32, 8).toString('base64'), stored));
});

test('a run is split into batches: no message fetched twice, the watermark advances only when done', async () => {
  const env = await connectedEnv();
  const g = fakeGoogle([...mails, receipt({}, { messageId: 'phi', subject: '[Phi] 환급 계좌 정보 요청 양식을 작성해 주셔서 감사합니다', bodyText: '[Phi]\n' })]);

  const first = await runSyncBatch(env, { batch: 4, fetchImpl: g.fetchImpl });
  assert.deepEqual([first.done, first.summary.fetched, first.summary.remaining], [false, 4, 2]);
  let c = await conn(env);
  assert.equal(c.sync_pending, 1);
  assert.equal(c.last_sync_at, null);
  const since = c.sync_since;
  // first run searches from RECEIPTS_FROM (2026-08-17 KST)
  assert.equal(since, Date.parse('2026-08-17T00:00:00+09:00') / 1000);

  const second = await runSyncBatch(env, { batch: 4, fetchImpl: g.fetchImpl });
  assert.deepEqual([second.done, second.summary.fetched, second.summary.remaining], [true, 2, 0]);
  assert.equal(second.summary.unrelated, 1);
  assert.deepEqual(new Set(g.calls.get).size, 6);
  assert.equal(g.calls.get.length, 6);
  assert.deepEqual(g.calls.list, [`from:forms-receipts-noreply@google.com after:${since}`, `from:forms-receipts-noreply@google.com after:${since}`]);

  c = await conn(env);
  assert.equal(c.sync_pending, 0);
  assert.equal(c.sync_since, null);
  assert.ok(c.last_sync_at);
  assert.equal((await getWeekMatrix(env.DB, 2)).progress.done, 5);

  // next run: incremental from last sync − 1 day, nothing new to fetch
  assert.equal(searchSinceSec(c), Math.floor(Date.parse(c.last_sync_at) / 1000) - 86400);
  const third = await runSyncBatch(env, { batch: 4, fetchImpl: g.fetchImpl });
  assert.deepEqual([third.done, third.summary.fetched], [true, 0]);
  assert.equal(g.calls.get.length, 6);
});

test('not connected → not_connected, recorded on the connection row', async () => {
  const env = { DB: testD1(), TOKEN_KEY, GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'secret' };
  await assert.rejects(runSyncBatch(env, { fetchImpl: () => assert.fail('no request expected') }), e => e instanceof SyncError && e.code === 'not_connected');
  assert.equal((await conn(env)).last_sync_error, 'not_connected');
});

test('a revoked grant (invalid_grant) drops the stored token and asks to reconnect', async () => {
  const env = await connectedEnv();
  const g = fakeGoogle(mails, { tokenError: 'invalid_grant' });
  await assert.rejects(runSyncBatch(env, { fetchImpl: g.fetchImpl }), e => e.code === 'reconnect_required');
  const c = await conn(env);
  assert.deepEqual([c.connected, c.refresh_token_enc, c.last_sync_error], [0, null, 'reconnect_required']);
});

test('missing server secrets fail clearly instead of calling Google', async () => {
  const env = await connectedEnv();
  delete env.GOOGLE_CLIENT_SECRET;
  await assert.rejects(runSyncBatch(env, { fetchImpl: () => assert.fail('no request expected') }), e => e.code === 'server_not_configured');
});
