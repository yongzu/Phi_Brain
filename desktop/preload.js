// 페이지 스크립트보다 먼저 돈다. 앱이 들고 있는 세션을 페이지의 localStorage에 미리 놓아
// auth.js가 읽을 때 이미 로그인된 상태가 되게 한다 (docs/DESKTOP.md 2단계).
// contextIsolation은 켜 둔 채다 — 여기서 쓰는 localStorage는 같은 origin의 저장소라 그대로 통한다.
const { ipcRenderer, contextBridge } = require('electron');

// Only the deployed app's top-level page gets this narrow bridge. No arbitrary URLs or IPC.
if (window === window.top && location.origin === 'https://yongzu.github.io' &&
    location.pathname === '/Phi_Brain/prototypes/home.html') {
  contextBridge.exposeInMainWorld('phiDesktop', {
    startLogin: () => ipcRenderer.invoke('phi:start-login'),
    signOut: () => ipcRenderer.send('phi:signed-out'),
  });
}

const SESSION_KEY = 'phi-brain:session';
const SIGNED_OUT_KEY = 'phi-brain:signed-out';

try {
  // 로그아웃은 bridge에서 즉시 반영한다. 새 로그인 세션은 이전 로그아웃 표시보다 우선한다.
  const s = ipcRenderer.sendSync('phi:session');
  if (s) {
    localStorage.removeItem(SIGNED_OUT_KEY);
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
} catch { /* 저장소를 못 쓰면 평소처럼 로그인 화면이 뜬다 */ }
