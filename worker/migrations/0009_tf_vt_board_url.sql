-- 2026-10-01 사용자 지시: TF도 Figma 보드 직접 링크로, VT는 새 주소로(node-id 없이 보드 첫 화면).
-- 사용자가 준 주소의 t= 공유 토큰은 뺐다(0006과 같은 원칙). server/db.js의 BOARD_URL과 같은 값.
-- Apply: cd worker && npx wrangler@4.131.1 d1 migrations apply phi-brain --remote

UPDATE courses SET board_url = 'https://www.figma.com/board/rqI2rIYxv8BOimYbzT9FDn/-1%EA%B8%B0-B--Typography-as-Foundation' WHERE id = 'tf';
UPDATE courses SET board_url = 'https://www.figma.com/board/eAeCinqhdU8SMb0aEi8MRM/-1%EA%B8%B0-B--Visual-Translation' WHERE id = 'vt';
