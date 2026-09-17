// 페이지 스크립트보다 먼저 돈다. 앱이 들고 있는 세션을 페이지의 localStorage에 미리 놓아
// auth.js가 읽을 때 이미 로그인된 상태가 되게 한다 (docs/DESKTOP.md 2단계).
// contextIsolation은 켜 둔 채다 — 여기서 쓰는 localStorage는 같은 origin의 저장소라 그대로 통한다.
const { ipcRenderer } = require('electron');

const SESSION_KEY = 'phi-brain:session';
const SIGNED_OUT_KEY = 'phi-brain:signed-out';

try {
  // 페이지에서 로그아웃했으면 앱이 들고 있던 세션도 버린다 — 안 그러면 새로고침할 때마다 되살아난다
  if (localStorage.getItem(SIGNED_OUT_KEY)) {
    ipcRenderer.send('phi:signed-out');
  } else if (!localStorage.getItem(SESSION_KEY)) {
    const s = ipcRenderer.sendSync('phi:session');
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }
} catch { /* 저장소를 못 쓰면 평소처럼 로그인 화면이 뜬다 */ }
