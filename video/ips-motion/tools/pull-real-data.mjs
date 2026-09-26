// 실제 Phi Brain 데이터(D1 원격 DB "phi-brain")를 읽기 전용으로 가져와 data/real.json에 저장한다.
// data/는 저장소에 함께 둔다(실제 저널 허용 — 사용자 결정 2026-09-27). 사용 장면 9~12가 이 파일을 읽는다.
// 실행: node tools/pull-real-data.mjs   (wrangler가 사용자 Cloudflare 계정으로 로그인되어 있어야 함)
// Gmail 연결 정보는 연결 여부 · 주소만(토큰 열은 읽지 않음).
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const WORKER = resolve(here, '../../../worker');
const OUT = resolve(here, '../data/real.json');
const WEEK = 3; // Assignment Manage 장면의 주차

const q = (sql) => {
  const cmd = `npx wrangler d1 execute phi-brain --remote --json --command "${sql.replace(/\s+/g, ' ').replace(/"/g, '\\"')}"`;
  let raw;
  // Windows의 wrangler는 성공해도 종료할 때 libuv assertion으로 0이 아닌 코드를 낸다 — 출력(JSON)으로 판단
  try { raw = execSync(cmd, { cwd: WORKER, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { raw = e.stdout || ''; }
  const json = JSON.parse(raw.slice(raw.indexOf('[')));
  if (!json[0]?.success) throw new Error(`query failed: ${sql}`);
  return json[0].results;
};

const data = {
  pulledAt: new Date().toISOString(),
  journals: q('SELECT date, title, courses, html, saved_at FROM journals ORDER BY date'),
  findingsFavorites: q('SELECT course AS key, created_at FROM findings_favorites ORDER BY created_at, rowid').map((r) => r.key),
  findingsHidden: q('SELECT key FROM findings_hidden').map((r) => r.key),
  future: JSON.parse(q('SELECT data FROM future_state WHERE id = 1')[0]?.data || 'null'),
  courses: q('SELECT id, name, code FROM courses ORDER BY code'),
  weeks: q('SELECT week_no, start_date, end_date FROM weeks ORDER BY week_no'),
  week: WEEK,
  targets: q(`SELECT t.id, t.course_id, t.kind, m.status AS manual,
      (SELECT count(*) FROM submission_evidence e WHERE e.target_id = t.id) AS evidence,
      (SELECT min(received_at) FROM submission_evidence e WHERE e.target_id = t.id) AS first_at
    FROM submission_targets t JOIN weeks w ON w.id = t.week_id LEFT JOIN manual_status m ON m.target_id = t.id
    WHERE w.week_no = ${WEEK} ORDER BY t.course_id, t.kind`),
  notes: q(`SELECT course_id, week_no, raw, due_at, late_due_at FROM assignment_notes WHERE week_no = ${WEEK} ORDER BY course_id`),
  gmail: q('SELECT connected, email, last_sync_at FROM gmail_connection WHERE id = 1')[0] || null,
  nickname: q("SELECT value FROM settings WHERE key = 'nickname'")[0]?.value || '',
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log(`saved ${OUT}: journals ${data.journals.length}, findings★ ${data.findingsFavorites.length}, hidden ${data.findingsHidden.length}, `
  + `future items ${data.future?.items?.length ?? 0}, week ${WEEK} targets ${data.targets.length}, notes ${data.notes.length}`);
