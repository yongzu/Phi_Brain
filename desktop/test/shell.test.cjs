const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createDesktopShell, loginOptions, JOURNAL_SHORTCUT } = require('../shell');

function fixture({ hidden = false, trayFails = false, shortcutTaken = false } = {}) {
  const app = new EventEmitter();
  const writes = [], errors = [], sent = [];
  let startup = false, tray, menu, shortcut, released = 0;
  app.getAppPath = () => 'C:\\Phi Brain\\desktop';
  app.getLoginItemSettings = () => ({ openAtLogin: startup, launchItems: [{ name: 'Phi Brain', enabled: startup }] });
  app.setLoginItemSettings = opts => { writes.push(opts); startup = opts.openAtLogin; };
  app.quit = () => { app.emit('before-quit'); app.emit('will-quit'); };
  const win = new EventEmitter();
  win.visible = false; win.minimized = false;
  win.isDestroyed = () => false;
  win.isMinimized = () => win.minimized;
  win.restore = () => { win.minimized = false; };
  win.show = () => { win.visible = true; };
  win.hide = () => { win.visible = false; };
  win.focus = () => { win.focused = true; };
  win.setIcon = () => {};
  win.webContents = new EventEmitter();
  win.webContents.loading = false;
  win.webContents.isLoadingMainFrame = () => win.webContents.loading;
  win.webContents.send = name => sent.push(name);
  win.webContents.reload = () => { win.reloads = (win.reloads || 0) + 1; };
  win.webContents.reloadIgnoringCache = () => { win.hardReloads = (win.hardReloads || 0) + 1; };
  const nativeImage = {
    createFromPath: () => ({ isEmpty: () => false, resize: () => ({ toBitmap: () => Buffer.alloc(24 * 24 * 4) }) }),
    createFromBitmap: () => ({}),
  };
  class MockTray extends EventEmitter {
    constructor() { super(); if (trayFails) throw Error('unavailable'); tray = this; }
    setToolTip() {}
    setContextMenu(value) { this.menu = value; }
    isDestroyed() { return !!this.destroyed; }
    destroy() { this.destroyed = true; }
  }
  const controls = createDesktopShell({
    app, Tray: MockTray, nativeImage, dialog: { showErrorBox: (...args) => errors.push(args) },
    Menu: { buildFromTemplate: x => x, setApplicationMenu: x => { menu = x; } },
    globalShortcut: { register: (key, fn) => { assert.equal(key, JOURNAL_SHORTCUT); shortcut = fn; return !shortcutTaken; }, unregister: () => { released++; } },
  }, { getWindow: () => win, createWindow: () => win, runtime: { platform: 'win32', execPath: 'C:\\Electron\\electron.exe', defaultApp: true, argv: hidden ? ['--hidden'] : [] } });
  controls.start(); controls.attachWindow(win);
  const close = () => { let prevented = false; win.emit('close', { preventDefault() { prevented = true; } }); return prevented; };
  return { app, win, controls, close, writes, errors, sent, get tray() { return tray; }, get menu() { return menu; }, runShortcut: () => shortcut(), released: () => released };
}

test('closing hides the window; tray click restores it; Quit really exits and releases shortcut', () => {
  const f = fixture();
  f.win.emit('ready-to-show'); assert.equal(f.win.visible, true);
  assert.equal(f.close(), true); assert.equal(f.win.visible, false);
  f.win.minimized = true; f.tray.emit('click');
  assert.equal(f.win.visible, true); assert.equal(f.win.minimized, false);
  f.tray.menu.find(x => x.label === '종료').click();
  assert.equal(f.close(), false); assert.equal(f.tray.destroyed, true); assert.equal(f.released(), 1);
});
test('startup stays hidden with a tray and never enables autorun on its own', () => {
  const f = fixture({ hidden: true }); f.win.emit('ready-to-show');
  assert.equal(f.win.visible, false); assert.equal(f.writes.length, 0);
  f.controls.showWindow(); assert.equal(f.win.visible, true);
});
test('tray failure keeps hidden startup visible and lets closing exit', () => {
  const f = fixture({ hidden: true, trayFails: true }); f.win.emit('ready-to-show');
  assert.equal(f.win.visible, true); assert.equal(f.close(), false); assert.equal(f.errors.length, 1);
});
test('global journal shortcut restores window and waits for page loading, without reloading a draft', () => {
  const f = fixture(); f.win.webContents.loading = true;
  f.runShortcut(); f.runShortcut(); assert.equal(f.win.visible, true); assert.deepEqual(f.sent, []);
  f.win.webContents.loading = false; f.win.webContents.emit('did-finish-load');
  assert.deepEqual(f.sent, ['phi:open-journal']); assert.equal(f.win.reloads, undefined);
});
test('occupied global shortcut is indicated and still works inside the app', () => {
  const f = fixture({ shortcutTaken: true });
  assert.ok(f.tray.menu.some(x => x.label?.includes('다른 앱에서 사용 중')));
  let prevented = false;
  f.win.webContents.emit('before-input-event', { preventDefault() { prevented = true; } }, { type: 'keyDown', key: 'j', control: true, alt: true });
  assert.equal(prevented, true); assert.deepEqual(f.sent, ['phi:open-journal']);
  f.app.quit(); assert.equal(f.released(), 0);
});
test('autorun toggle uses matching executable and quoted development path, and can be disabled', () => {
  const f = fixture();
  const toggle = () => f.tray.menu.find(x => x.type === 'checkbox');
  assert.equal(toggle().checked, false);
  toggle().click({ checked: true }); assert.equal(toggle().checked, true);
  assert.deepEqual(f.writes[0].args, ['"C:\\Phi Brain\\desktop"', '--hidden']);
  toggle().click({ checked: false }); assert.equal(toggle().checked, false);
  assert.equal(f.writes[1].openAtLogin, false); assert.equal(f.writes[1].enabled, false);
  assert.deepEqual(loginOptions(f.app, { execPath: 'C:\\Phi Brain.exe', defaultApp: false }).args, ['--hidden']);
});
test('F5 reloads and Ctrl+F5 bypasses cache; Windows session end does not hide instead of closing', () => {
  const f = fixture(); let prevented = 0;
  for (const control of [false, true]) f.win.webContents.emit('before-input-event', { preventDefault() { prevented++; } }, { type: 'keyDown', key: 'F5', control });
  assert.equal(prevented, 2); assert.equal(f.win.reloads, 1); assert.equal(f.win.hardReloads, 1);
  f.win.emit('session-end'); assert.equal(f.close(), false);
});
