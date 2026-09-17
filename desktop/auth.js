// 데스크톱 로그인 (docs/DESKTOP.md 2단계) — 시스템 브라우저에서 로그인하고 phibrain:// 로 돌아온다.
//
// 왜 앱 안에서 로그인하지 않나: Google은 앱에 내장된 브라우저에서의 로그인을 정책으로 막는다
// ("이 브라우저는 안전하지 않을 수 있습니다"). 앱이 비밀번호를 가로챌 수 있기 때문이고,
// 우회(User-Agent 위장 등)는 계정 정지 위험이 있어 하지 않는다.
//
// 세션은 safeStorage로 암호화해 파일에 둔다(윈도우는 자격 증명 저장소 키를 쓴다).
const { app, safeStorage, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const PROTOCOL = 'phibrain';
const API_BASE = 'https://api.phibrain.workers.dev';

const file = () => path.join(app.getPath('userData'), 'session.bin');

let session = null;   // { token, email, expiresAt }
let pending = null;   // 로그인 중인 state — 다른 곳에서 날아온 코드를 받지 않기 위한 표식

function load() {
  try {
    const raw = fs.readFileSync(file());
    const json = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf8');
    const s = JSON.parse(json);
    session = s && s.token && s.expiresAt > Date.now() ? s : null;
  } catch { session = null; }
  return session;
}

function save(s) {
  session = s;
  try {
    if (!s) { fs.rmSync(file(), { force: true }); return; }
    const json = JSON.stringify(s);
    fs.writeFileSync(file(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(json) : json);
  } catch { /* 못 저장하면 다음 실행 때 다시 로그인하면 된다 */ }
}

// 브라우저를 열어 로그인시킨다. 페이지(design/prototypes/auth.js)가 로그인을 마치면
// 1회용 코드를 받아 phibrain://auth?state=…&code=… 로 이 앱을 깨운다.
function startLogin(appUrl) {
  pending = crypto.randomBytes(24).toString('base64url'); // 서버의 STATE_RE와 같은 모양
  const u = new URL(appUrl);
  u.searchParams.set('desktop', pending);
  return shell.openExternal(u.toString());
}

// phibrain://auth?state=…&code=… → 진짜 세션으로 교환. 성공하면 세션을 돌려준다.
async function completeLogin(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { return null; }
  if (url.protocol !== `${PROTOCOL}:` || url.hostname !== 'auth') return null;
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  // 내가 시작하지 않은 로그인은 받지 않는다 — 아무나 이 주소를 열어 세션을 밀어넣지 못하게
  if (!state || !code || state !== pending) return null;
  pending = null;
  const res = await fetch(`${API_BASE}/api/session/desktop/exchange`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, state }),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const body = await res.json().catch(() => null);
  if (!body?.token) return null;
  save({ token: body.token, email: body.email, expiresAt: body.expiresAt });
  return session;
}

// 설치된 앱은 윈도우가 알아서 등록하지만, 개발 중(npm start)에는 electron.exe를 가리켜야 한다
function registerProtocol() {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

module.exports = {
  PROTOCOL,
  registerProtocol,
  startLogin,
  completeLogin,
  load,
  get session() { return session; },
  clear: () => save(null),
  // 윈도우는 두 번째 실행의 인자로 주소를 넘긴다 — 그중 phibrain:// 를 골라낸다
  urlFromArgv: argv => argv.find(a => typeof a === 'string' && a.startsWith(`${PROTOCOL}://`)) || null,
};
