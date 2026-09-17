const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const root = require('node:path').resolve(__dirname, '../..') + '/';
function page(bridge) {
  const nodes = new Map();
  const element = () => ({ classList: { toggle() {} }, setAttribute() {}, addEventListener(k, fn) { this[k] = fn; }, replaceChildren(child) { this.child = child; } });
  let gis = 0;
  const messages = [];
  const google = { accounts: { id: { initialize() { gis++; }, renderButton() { gis++; }, prompt() { gis++; }, disableAutoSelect() {} } } };
  const window = { phiDesktop: bridge, PHI_BRAIN_CONFIG: { googleClientId: 'test' }, PhiBrain: { ui: { toast: msg => messages.push(msg) } }, google };
  const storage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  vm.runInNewContext(fs.readFileSync(root + 'design/prototypes/auth.js', 'utf8'), {
    window, google, document: { querySelector(key) { if (!nodes.has(key)) nodes.set(key, element()); return nodes.get(key); }, createElement: element },
    localStorage: storage, sessionStorage: storage, location: { search: '' }, URLSearchParams, setTimeout() {}, console,
  });
  return { nodes, messages, gis: () => gis, window };
}
test('desktop click starts browser login without loading GIS', async () => {
  let calls = 0;
  const p = page({ startLogin: async () => { calls++; } });
  const button = p.nodes.get('#auth-google-btn').child;
  assert.ok(button);
  await button.click();
  assert.equal(calls, 1);
  assert.equal(p.gis(), 0);
  assert.equal(button.disabled, false);
});
test('browser launch failure is shown and button can retry', async () => {
  const p = page({ startLogin: async () => { throw Error('failed'); } });
  const button = p.nodes.get('#auth-google-btn').child;
  await button.click();
  assert.ok(p.messages.some(x => x.includes('열지 못했어요')));
  assert.equal(button.disabled, false);
});
test('normal browser still initializes GIS and One Tap', () => {
  const p = page();
  assert.equal(p.gis(), 3);
});
test('desktop logout immediately clears native session', () => {
  let clears = 0;
  const p = page({ signOut() { clears++; } });
  p.window.PhiBrain.auth.signOut();
  assert.equal(clears, 1);
});
test('preload restores newly exchanged session despite previous logout flag', () => {
  const values = new Map([['phi-brain:signed-out', '1']]);
  const window = {}; window.top = window;
  let bridge;
  const session = { token: 'test-only', expiresAt: Date.now() + 10000 };
  vm.runInNewContext(fs.readFileSync(root + 'desktop/preload.js', 'utf8'), {
    window, location: new URL('https://yongzu.github.io/Phi_Brain/prototypes/home.html'),
    localStorage: { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) },
    require: () => ({ ipcRenderer: { on() {}, sendSync: () => session }, contextBridge: { exposeInMainWorld: (key, value) => { bridge = value; } } }),
  });
  assert.ok(bridge.startLogin);
  assert.equal(values.has('phi-brain:signed-out'), false);
  assert.deepEqual(JSON.parse(values.get('phi-brain:session')), session);
});
