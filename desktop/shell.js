const path = require('node:path');

const JOURNAL_SHORTCUT = 'Control+Alt+J';
const STARTUP_NAME = 'Phi Brain';

function loginOptions(app, runtime = process) {
  return {
    path: runtime.execPath,
    args: runtime.defaultApp ? [`"${app.getAppPath()}"`, '--hidden'] : ['--hidden'],
  };
}

function createIcon(nativeImage) {
  const mark = nativeImage.createFromPath(path.join(__dirname, 'assets', 'logo.png'));
  if (mark.isEmpty()) throw new Error('Phi Brain icon is missing');
  // Keep the existing black logo readable in both light and dark Windows trays.
  const pixels = mark.resize({ width: 24, height: 24 }).toBitmap();
  const bitmap = Buffer.alloc(32 * 32 * 4, 255);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const src = (y * 24 + x) * 4, dst = ((y + 4) * 32 + x + 4) * 4;
    for (let c = 0; c < 3; c++) bitmap[dst + c] = Math.min(255, pixels[src + c] + 255 - pixels[src + 3]);
  }
  return nativeImage.createFromBitmap(bitmap, { width: 32, height: 32 });
}

function createDesktopShell({ app, Menu, Tray, nativeImage, globalShortcut, dialog },
  { getWindow, createWindow, runtime = process }) {
  let tray = null, quitting = false, pendingJournal = false, globalRegistered = false;
  let showRequested = !runtime.argv.includes('--hidden');
  let icon;
  const startup = loginOptions(app, runtime);

  const report = message => dialog.showErrorBox('Phi Brain', message);
  const hasTray = () => !!tray && !tray.isDestroyed();
  function showWindow() {
    showRequested = true;
    let win = getWindow();
    if (!win || win.isDestroyed()) win = createWindow();
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    return win;
  }
  function sendJournal(win) {
    if (!pendingJournal || win.isDestroyed() || win.webContents.isLoadingMainFrame()) return;
    pendingJournal = false;
    win.webContents.send('phi:open-journal');
  }
  function openJournal() {
    pendingJournal = true;
    sendJournal(showWindow());
  }
  function startupEnabled() {
    if (runtime.platform !== 'win32') return false;
    const settings = app.getLoginItemSettings(startup);
    const item = settings.launchItems?.find(x => x.name === STARTUP_NAME);
    return settings.openAtLogin && (item ? item.enabled : settings.executableWillLaunchAtLogin !== false);
  }
  function toggleStartup(item) {
    try {
      app.setLoginItemSettings({ ...startup, name: STARTUP_NAME, openAtLogin: item.checked, enabled: item.checked });
      if (startupEnabled() !== item.checked) report('자동 실행 설정을 적용하지 못했어요. Windows 시작 앱 설정을 확인해 주세요.');
    } catch { report('자동 실행 설정을 바꾸지 못했어요. 다시 시도해 주세요.'); }
    rebuildMenus();
  }
  function hideWindow() {
    const win = getWindow();
    if (hasTray() && win && !win.isDestroyed()) win.hide();
  }
  function zoom(delta) {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.setZoomLevel(delta === 0 ? 0 : win.webContents.getZoomLevel() + delta);
    }
  }
  function commonMenu() {
    return [
      { label: 'Phi Brain 열기', click: showWindow },
      { label: '트레이로 숨기기', accelerator: 'Control+Backspace', registerAccelerator: false, enabled: hasTray(), click: hideWindow },
      { label: '저널 바로 쓰기', accelerator: JOURNAL_SHORTCUT, registerAccelerator: false, click: openJournal },
      ...(!globalRegistered ? [{ label: 'Ctrl+Alt+J: 다른 앱에서 사용 중 · 앱 안에서 사용 가능', enabled: false }] : []),
      { type: 'separator' },
      { label: 'Windows 시작 시 실행', type: 'checkbox', checked: startupEnabled(), enabled: runtime.platform === 'win32', click: toggleStartup },
      { type: 'separator' },
      { label: '종료', accelerator: 'Control+Q', click: () => app.quit() },
    ];
  }
  function rebuildMenus() {
    if (hasTray()) tray.setContextMenu(Menu.buildFromTemplate(commonMenu()));
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Phi Brain', submenu: commonMenu() },
      { label: '편집', submenu: [
        { role: 'undo', label: '실행 취소' }, { role: 'redo', label: '다시 실행' }, { type: 'separator' },
        { role: 'cut', label: '잘라내기' }, { role: 'copy', label: '복사' }, { role: 'paste', label: '붙여넣기' },
        { role: 'selectAll', label: '전체 선택' },
      ] },
      { label: '보기', submenu: [
        { role: 'reload', label: '새로고침', accelerator: 'Control+R' },
        { role: 'forceReload', label: '캐시 없이 새로고침', accelerator: 'Control+Shift+R' },
        { role: 'toggleDevTools', label: '개발자 도구', accelerator: 'Control+Shift+I' },
        { type: 'separator' },
        { label: '기본 크기', accelerator: 'Control+0', registerAccelerator: false, click: () => zoom(0) },
        { label: '확대', accelerator: 'Control+=', registerAccelerator: false, click: () => zoom(0.5) },
        { label: '축소', accelerator: 'Control+-', registerAccelerator: false, click: () => zoom(-0.5) },
        { role: 'togglefullscreen', label: '전체 화면' },
      ] },
    ]));
  }
  function attachWindow(win) {
    if (icon) win.setIcon(icon);
    win.once('ready-to-show', () => { if (showRequested || !hasTray()) win.show(); });
    win.on('close', e => {
      if (!quitting && hasTray()) { e.preventDefault(); win.hide(); }
    });
    win.on('session-end', () => { quitting = true; });
    win.webContents.on('did-finish-load', () => sendJournal(win));
    win.webContents.on('before-input-event', (e, input) => {
      if (input.type !== 'keyDown' || input.isAutoRepeat) return;
      if (input.control && !input.alt && !input.meta) {
        const key = input.key.toLowerCase();
        // 트레이로 숨기기: Ctrl+Backspace (사용자 지시 2026-09-17 — Ctrl+X는 잘라내기로 되돌렸다)
        if (key === 'backspace' && !input.shift && hasTray()) {
          e.preventDefault(); hideWindow(); return;
        }
        // Windows layouts report the plus key as '=' or '+', depending on Shift.
        const delta = key === '=' || key === '+' || input.code === 'NumpadAdd' ? 0.5
          : key === '-' || input.code === 'NumpadSubtract' ? -0.5
          : key === '0' ? 0 : null;
        if (delta !== null) { e.preventDefault(); zoom(delta); return; }
      }
      if (input.key === 'F5' && !input.alt && !input.meta && !input.shift) {
        e.preventDefault();
        input.control ? win.webContents.reloadIgnoringCache() : win.webContents.reload();
      } else if (!globalRegistered && input.control && input.alt && !input.shift && !input.meta && input.key.toLowerCase() === 'j') {
        e.preventDefault(); openJournal();
      }
    });
  }
  function start() {
    try {
      icon = createIcon(nativeImage);
      tray = new Tray(icon);
      tray.setToolTip('Phi Brain · Ctrl+Alt+J 저널 쓰기');
      tray.on('click', showWindow);
      tray.on('double-click', showWindow);
      tray.on('right-click', rebuildMenus);
    } catch {
      if (hasTray()) tray.destroy();
      tray = null;
      report('트레이 아이콘을 만들지 못했어요. 창을 닫으면 앱이 종료됩니다.');
    }
    try { globalRegistered = globalShortcut.register(JOURNAL_SHORTCUT, openJournal); } catch { globalRegistered = false; }
    rebuildMenus();
    app.on('before-quit', () => { quitting = true; });
    app.on('will-quit', () => {
      if (globalRegistered) globalShortcut.unregister(JOURNAL_SHORTCUT);
      if (hasTray()) tray.destroy();
    });
  }
  return { start, attachWindow, showWindow, openJournal, hasTray };
}

module.exports = { createDesktopShell, loginOptions, JOURNAL_SHORTCUT, createIcon };
