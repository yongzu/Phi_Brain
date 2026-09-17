// Phi Brain 데스크톱 앱 — 1단계: 배포된 화면을 여는 창 (계획: docs/DESKTOP.md).
//
// 화면 파일을 앱에 복사하지 않고 배포 주소를 그대로 연다(사용자 확정 2026-09-17):
// 원점(origin)이 그대로여야 서버 CORS·Google 로그인 등록·Gmail 복귀 주소를 하나도 건드리지 않고,
// 화면을 고칠 때마다 앱을 다시 배포할 필요도 없다. 온라인 전용 — 오프라인 모드는 범위 밖.
//
// 1단계에서는 로그인이 안 되는 게 정상이다. Google이 앱 안 브라우저에서의 로그인을 막기 때문이고,
// 2단계(시스템 브라우저 + phibrain:// 복귀)가 그것을 푼다.
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const APP_URL = 'https://yongzu.github.io/Phi_Brain/prototypes/home.html';
const APP_ORIGIN = new URL(APP_URL).origin;
// 로그인 창은 2단계에서 시스템 브라우저로 넘긴다. 그 전까지도 Google 주소만은 창 안에서 막지 않는다 —
// 막아 두면 "왜 아무 일도 안 일어나지?"가 되고, 열어 두면 Google이 왜 거부하는지 화면으로 보인다.
const IN_APP_ORIGINS = [APP_ORIGIN, 'https://accounts.google.com'];

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
    },
  });

  if (state.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.loadURL(APP_URL);

  // 바깥 링크(공간예약·Phi LMS·출결 스프레드시트·Figma 보드)는 기본 브라우저로
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (IN_APP_ORIGINS.includes(new URL(url).origin)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (IN_APP_ORIGINS.includes(new URL(url).origin)) return;
    e.preventDefault();
    shell.openExternal(url);
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
// (2단계에서 phibrain:// 주소도 이 자리로 들어온다 — 윈도우는 새 프로세스로 URL을 넘긴다.)
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let mainWindow = null;
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null); // 기본 메뉴줄은 숨긴다 — 4단계에서 필요한 항목만 다시 만든다
    mainWindow = createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow(); });
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
