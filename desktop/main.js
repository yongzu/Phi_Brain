// Phi Brain 데스크톱 앱 — 1단계: 배포된 화면을 여는 창 (계획: docs/DESKTOP.md).
//
// 화면 파일을 앱에 복사하지 않고 배포 주소를 그대로 연다(사용자 확정 2026-09-17):
// 원점(origin)이 그대로여야 서버 CORS·Google 로그인 등록·Gmail 복귀 주소를 하나도 건드리지 않고,
// 화면을 고칠 때마다 앱을 다시 배포할 필요도 없다. 온라인 전용 — 오프라인 모드는 범위 밖.
//
// 1단계에서는 로그인이 안 되는 게 정상이다. Google이 앱 안 브라우저에서의 로그인을 막기 때문이고,
// 2단계(시스템 브라우저 + phibrain:// 복귀)가 그것을 푼다.
const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const auth = require('./auth');
const gmail = require('./gmail');

const APP_URL = 'https://yongzu.github.io/Phi_Brain/prototypes/home.html';
const APP_ORIGIN = new URL(APP_URL).origin;
const GOOGLE_ORIGIN = 'https://accounts.google.com';

const STATE_FILE = () => path.join(app.getPath('userData'), 'window-state.json');
const DEFAULT_STATE = { width: 1280, height: 860 };

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8'));
    // 모니터를 뺀 뒤라 창이 화면 밖에 잡히는 경우가 있어, 크기만 믿고 위치는 검사해서 쓴다
    const ok = Number.isFinite(s.width) && Number.isFinite(s.height) && s.width > 400 && s.height > 300;
    return ok ? s : DEFAULT_STATE;
  } catch { return DEFAULT_STATE; }
}

function saveState(win) {
  if (!win || win.isDestroyed()) return;
  const b = win.getNormalBounds(); // 최대화/최소화 상태가 아닌 실제 크기
  try {
    fs.writeFileSync(STATE_FILE(), JSON.stringify({ ...b, maximized: win.isMaximized() }));
  } catch { /* 저장 실패는 다음 실행에서 기본 크기로 뜨는 것뿐이라 조용히 넘긴다 */ }
}

function createWindow() {
  const state = loadState();
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    ...(Number.isFinite(state.x) && Number.isFinite(state.y) ? { x: state.x, y: state.y } : {}),
    minWidth: 480,
    minHeight: 600,
    title: 'Phi Brain',
    backgroundColor: '#ffffff', // 로딩 중 흰 화면 — 페이지 배경과 같게 해서 깜빡임을 없앤다
    show: false,
    webPreferences: {
      // 원격 페이지를 여는 창이다. 이 둘은 절대 끄지 않는다 — 페이지 스크립트가 파일 시스템에 닿으면 안 된다.
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'), // 앱이 들고 있는 세션을 페이지보다 먼저 놓아둔다
    },
  });

  if (state.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.loadURL(APP_URL);

  // 페이지가 Google 로그인 창을 열려고 하면(화면의 "Google로 로그인" 버튼) 가로채서
  // 데스크톱 방식으로 바꾼다 — 앱 안에서는 Google이 로그인을 거부하기 때문(docs/DESKTOP.md 2단계).
  // 나머지 바깥 링크(공간예약·Phi LMS·출결 스프레드시트·Figma 보드)는 그냥 기본 브라우저로.
  const external = url => {
    if (new URL(url).origin === GOOGLE_ORIGIN) { auth.startLogin(APP_URL); return; }
    shell.openExternal(url);
  };
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (new URL(url).origin === APP_ORIGIN) return { action: 'allow' };
    external(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (new URL(url).origin === APP_ORIGIN) return;
    e.preventDefault();
    external(url);
  });

  // 인터넷이 끊겼거나 서버가 죽었을 때: 빈 창 대신 이유와 다시 시도 버튼을 보여준다(온라인 전용 앱이라 더 중요)
  win.webContents.on('did-fail-load', (e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 = 사용자가 중단
    const page = `<!doctype html><meta charset="utf-8">
      <style>body{font:14px system-ui;margin:0;height:100vh;display:grid;place-content:center;text-align:center;color:#111;gap:12px}
      button{font:inherit;padding:6px 14px;border:1px solid #ddd;border-radius:10px;background:#fff;cursor:pointer}</style>
      <div><p>Phi Brain에 연결하지 못했어요.</p>
      <p style="color:#888">인터넷 연결을 확인하고 다시 시도해 주세요. (${desc})</p>
      <button onclick="location.href='${APP_URL}'">다시 시도</button></div>`;
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(page));
  });

  let saveTimer = null;
  const queueSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveState(win), 400); };
  win.on('resize', queueSave);
  win.on('move', queueSave);
  win.on('close', () => { clearTimeout(saveTimer); saveState(win); });

  return win;
}

// 창 하나짜리 앱 — 두 번 실행하면 이미 떠 있는 창을 앞으로 가져온다.
// 브라우저에서 로그인을 마치면 윈도우가 phibrain:// 주소를 "두 번째 실행"으로 넘겨준다.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let mainWindow = null;

  // 로그인 복귀: 코드를 세션으로 바꾸고, 페이지를 다시 읽어 로그인된 화면으로 만든다
  async function handleAuthUrl(rawUrl) {
    if (!rawUrl) return;
    const gmailPage = gmail.returnPage(rawUrl, APP_URL);
    if (gmailPage && mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      await mainWindow.loadURL(gmailPage); // connection status is read from the API, never from the URL
      return;
    }
    const session = await auth.completeLogin(rawUrl);
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    if (session) mainWindow.loadURL(APP_URL); // preload가 이 세션을 페이지에 놓는다
  }

  app.on('second-instance', (e, argv) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    handleAuthUrl(auth.urlFromArgv(argv));
  });
  app.on('open-url', (e, url) => { e.preventDefault(); handleAuthUrl(url); }); // macOS

  // 페이지(preload)와 주고받는 것: 앱이 들고 있는 세션을 넘기고, 로그아웃은 앱에서도 지운다
  const trustedPage = e => {
    if (!mainWindow || mainWindow.isDestroyed() || e.sender !== mainWindow.webContents ||
        e.senderFrame !== mainWindow.webContents.mainFrame) return false;
    try {
      const url = new URL(e.senderFrame.url);
      return url.origin === APP_ORIGIN && url.pathname === new URL(APP_URL).pathname;
    } catch { return false; }
  };
  ipcMain.handle('phi:start-login', async e => {
    if (!trustedPage(e)) throw new Error('Untrusted login request');
    await auth.startLogin(APP_URL);
  });
  ipcMain.handle('phi:connect-gmail', async (e, url) => {
    if (!trustedPage(e)) throw new Error('Untrusted Gmail request');
    await shell.openExternal(gmail.consentUrl(url));
  });
  ipcMain.on('phi:session', e => { e.returnValue = trustedPage(e) ? auth.session : null; });
  ipcMain.on('phi:signed-out', e => { if (trustedPage(e)) auth.clear(); });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null); // 기본 메뉴줄은 숨긴다 — 4단계에서 필요한 항목만 다시 만든다
    auth.registerProtocol();
    auth.load();
    mainWindow = createWindow();
    // 첫 실행이 곧 복귀인 경우(앱이 꺼진 채로 브라우저에서 로그인을 끝낸 경우)
    handleAuthUrl(auth.urlFromArgv(process.argv));
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow(); });
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
