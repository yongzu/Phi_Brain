-- 2026-09-17 사용자 지시: VT의 Figma 보드 링크를 실제 보드 주소로. 나머지 과목은 go.phi.design 단축주소 그대로.
-- (server/db.js의 BOARD_URL과 같은 값 — 둘 다 고쳐야 화면·읽기 전용 파일이 어긋나지 않는다)
-- Apply: cd worker && npx wrangler@4.131.1 d1 migrations apply phi-brain --remote

UPDATE courses
SET board_url = 'https://www.figma.com/board/eAeCinqhdU8SMb0aEi8MRM/-1%EA%B8%B0-B--Visual-Translation?node-id=0-1'
WHERE id = 'vt';
