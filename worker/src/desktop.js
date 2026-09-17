// 데스크톱 앱 로그인 (docs/DESKTOP.md 2단계).
//
//   POST /api/session/desktop/code      { state }        세션 필요 — 브라우저에서 로그인한 뒤 화면이 부른다 → { code, expiresAt }
//   POST /api/session/desktop/exchange  { code, state }  세션 없이 — 앱이 부른다 → { token, email, expiresAt }
//
// 왜 두 단계인가: Google은 앱에 내장된 브라우저에서의 로그인을 막는다. 그래서 로그인은 시스템 브라우저에서 하고,
// 끝나면 phibrain:// 주소로 앱을 깨운다. 그 주소는 브라우저 기록에 남으므로 세션 토큰을 싣지 않고 1회용 코드만 싣는다.
// 앱은 그 코드를 exchange로 보내 진짜 토큰을 받는다 — 코드는 그 순간 삭제되고, 60초가 지나면 저절로 못 쓴다.
import { signSession } from './auth.js';
import { BadRequest } from './journals.js';

export const CODE_TTL_SEC = 60;
const STATE_RE = /^[A-Za-z0-9_-]{16,128}$/; // 앱이 만드는 무작위 문자열

const randomHex = (bytes = 32) =>
  [...crypto.getRandomValues(new Uint8Array(bytes))].map(b => b.toString(16).padStart(2, '0')).join('');

// 만료된 코드는 아무도 쓸 수 없으니 오다가다 치운다(따로 크론을 두지 않는다)
const sweep = (db, now) => db.prepare('DELETE FROM desktop_login_codes WHERE expires_at <= ?').bind(now).run();

export async function createLoginCode(db, email, state, { now = new Date() } = {}) {
  if (typeof state !== 'string' || !STATE_RE.test(state)) throw new BadRequest('bad_state');
  const nowIso = now.toISOString();
  await sweep(db, nowIso);
  const code = randomHex();
  const expiresAt = new Date(now.getTime() + CODE_TTL_SEC * 1000).toISOString();
  await db.prepare('INSERT INTO desktop_login_codes (code, email, state, expires_at) VALUES (?, ?, ?, ?)')
    .bind(code, email, state, expiresAt).run();
  return { code, expiresAt };
}

// 성공하든 실패하든 그 코드는 사라진다 — 한 번 쓴 번호표는 폐기, 틀린 state로 찔러본 코드도 폐기.
export async function exchangeLoginCode(db, secret, code, state, { now = new Date() } = {}) {
  if (typeof code !== 'string' || !/^[0-9a-f]{64}$/.test(code)) throw new BadRequest('bad_code');
  if (typeof state !== 'string' || !STATE_RE.test(state)) throw new BadRequest('bad_state');
  const nowIso = now.toISOString();
  const row = await db.prepare('SELECT * FROM desktop_login_codes WHERE code = ?').bind(code).first();
  await db.prepare('DELETE FROM desktop_login_codes WHERE code = ?').bind(code).run();
  await sweep(db, nowIso);
  // 없는 코드 / 이미 쓴 코드 / 만료 / 다른 state — 무엇이 틀렸는지는 알려주지 않는다(찔러보기 단서가 된다)
  if (!row || row.state !== state || row.expires_at <= nowIso) throw new BadRequest('bad_code');
  const { token, exp } = await signSession(secret, { email: row.email }, { now: now.getTime() / 1000 });
  return { token, email: row.email, expiresAt: exp * 1000 };
}
