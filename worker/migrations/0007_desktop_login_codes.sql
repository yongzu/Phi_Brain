-- 2026-09-17 데스크톱 앱 2단계(docs/DESKTOP.md): 브라우저에서 로그인하고 앱으로 돌아올 때 쓰는 1회용 코드.
-- 복귀 주소(phibrain://...)는 브라우저 기록·로그에 남으므로 세션 토큰을 직접 싣지 않는다.
-- 주소에는 이 번호표만 싣고, 앱이 따로 조용히 요청해 진짜 토큰으로 바꿔 간다(OAuth authorization code와 같은 이유).
-- Apply: cd worker && npx wrangler@4.131.1 d1 migrations apply phi-brain --remote

CREATE TABLE desktop_login_codes (
  code TEXT PRIMARY KEY,       -- 무작위 256비트(hex). 1회 쓰면 즉시 삭제된다
  email TEXT NOT NULL,         -- 이 코드로 발급할 세션의 주인
  state TEXT NOT NULL,         -- 앱이 만든 값. 교환할 때 같은지 확인해 다른 창구의 코드를 받지 않게 한다
  expires_at TEXT NOT NULL     -- ISO 시각. 짧게(60초) 잡는다
);
