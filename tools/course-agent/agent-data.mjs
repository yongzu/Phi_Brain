#!/usr/bin/env node
// Course Agent 도구(사용자 지시 2026-11-23) — Claude Code 스킬 course-agent가 부른다.
//
//   node tools/course-agent/agent-data.mjs pull [--out <폴더>]
//       Phi Brain D1을 내려받아(wrangler d1 export) 과목마다 맥락 파일 <폴더>/<과목>.md를 만든다:
//       저널(과목 상자별 4F, 굵게 **·하이라이트 ==), 과제 공지(주차·회차·마감), 제출 상태, Future Item,
//       이미 있는 과목 기억, 그 과목 로컬 폴더(Phi_1)에서 읽을 만한 파일 목록. 기본 폴더는 OS 임시 폴더.
//   node tools/course-agent/agent-data.mjs push <과목|general> <memory.json> [--dry]
//       에이전트가 쓴 과목 기억을 그 과목 통째로 바꿔 쓴다(D1 course_memory + course_memory_runs)
//       그리고 과목 폴더에 COURSE_MEMORY.md를 남긴다(과목별 Claude 세션이 읽는다).
//       memory.json = { mode: 'harvest'|'synthesize'|'apply', summary, items: [{ id?, section, title, body, sources }] }
//
// D1 쓰기·읽기는 이 컴퓨터의 wrangler 로그인으로 한다(API 키 없음). 실제 저널 내용은 이 저장소에 남기지 않는다.
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const WRANGLER_CONFIG = join(REPO, 'worker', 'wrangler.jsonc');
const PHI_ROOT = process.env.PHI_ROOT || 'C:/Users/yongz/Phi_1';
// 과목 → Phi_1 폴더 · 저장소(있으면)
export const FOLDERS = {
  general: ['00_General', 'Phi_Brain'], ips: ['01_IPS', 'IPS'], bi: ['02_BI', 'BI'], vt: ['03_VT', 'VT'], iae: ['04_IAE', 'IAE'],
  aor: ['05_AOR', 'AOR'], ewa: ['06_EWA', null], al: ['07_AL', 'AL'], tf: ['08_TF', 'TF'], si: ['09_SI', null], pc: ['11_PC', null],
};
export const SECTIONS = ['overview', 'insight', 'method', 'feedback', 'mine', 'apply', 'next', 'synthesis'];
export const SECTION_LABEL = {
  overview: '한눈에', insight: '핵심 인사이트', method: '방법 · 도구', feedback: '전문가 피드백',
  mine: '내 생각', apply: '내 작업에 적용한 것', next: '다음 과제에 쓸 것', synthesis: '과목을 잇는 인사이트',
};
const MODES = ['harvest', 'synthesize', 'apply'];

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const wrangler = args => execFileSync(npx, ['wrangler@4.131.1', ...args, '--config', WRANGLER_CONFIG], { cwd: join(REPO, 'worker'), stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 }).toString();

// ---- 저널 HTML → 과목 상자별 조각(4F 칸 · 과목 · 문단) ----
const ENT = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
export function journalChunks(html) {
  const marked = html
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, (_, t) => `\n@@H3:${t.replace(/<[^>]+>/g, '').trim()}@@\n`)
    .replace(/<div class="course-box"[^>]*data-course="([^"]*)"[^>]*>[\s\S]*?<\/button><\/div>/g, (_, c) => `\n@@BOX:${c}@@\n`)
    .replace(/<\/?(?:b|strong)>/g, '**').replace(/<mark[^>]*>/g, '==').replace(/<\/mark>/g, '==')
    .replace(/<br\s*\/?>/g, '\n').replace(/<\/(?:p|li|div|h\d)>/g, '\n').replace(/<li[^>]*>/g, '- ')
    .replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, e => ENT[e] ?? e);
  const out = [];
  let section = '', course = null, buf = [];
  const flush = () => {
    const text = buf.join('\n').replace(/\*\*(\s*)\*\*/g, '$1').replace(/==(\s*)==/g, '$1').replace(/\n{3,}/g, '\n\n').trim();
    if (text) out.push({ section, course: course || 'general', text });
    buf = [];
  };
  for (const line of marked.split('\n')) {
    const h = line.match(/^@@H3:(.*)@@$/), b = line.match(/^@@BOX:(.*)@@$/);
    if (h) { flush(); section = h[1]; course = null; continue; }
    if (b) { flush(); course = b[1].toLowerCase(); continue; }
    buf.push(line.replace(/[ \t\u00a0]+/g, ' ').trim());
  }
  flush();
  return out;
}

function loadDb(sqlPath) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(sqlPath, 'utf8'));
  return db;
}

function exportD1(dir) {
  const file = join(dir, 'phi-brain.sql');
  wrangler(['d1', 'export', 'phi-brain', '--remote', `--output=${file}`]);
  return file;
}

// 과목 폴더에서 에이전트가 읽을 만한 글 파일(.md) — 큰 원본(psd·ai·pdf)은 목록에서 뺀다
function localFiles(courseId) {
  const [folder, repo] = FOLDERS[courseId] || [];
  if (!folder) return [];
  const base = join(PHI_ROOT, folder), found = [];
  const walk = (dir, depth) => {
    if (depth > 3 || !existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.') || name === 'node_modules' || name === 'dist') continue;
      const p = join(dir, name);
      let st; try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) walk(p, depth + 1);
      else if (/\.(md|txt)$/i.test(name) && st.size < 400_000) found.push({ path: p.slice(PHI_ROOT.length + 1).replace(/\\/g, '/'), size: st.size, mtime: st.mtime.toISOString().slice(0, 10) });
    }
  };
  walk(join(base, 'previous'), 0);
  if (repo) walk(join(base, repo), 0);
  for (const w of ['WK12', 'WK13', 'WK14', 'WK15', 'WK16']) walk(join(base, w), 0);
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

export function courseContext(db, courseId) {
  const lines = [];
  const course = courseId === 'general' ? { id: 'general', code: 'General', name: '과목 공통 · 과목을 잇는 종합' } : db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  const settings = Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, r.value]));
  const states = JSON.parse(settings.assignment_course_states || '{}');
  const rounds = JSON.parse(settings.assignment_rounds || '{}')[courseId] || [];
  lines.push(`# ${course.code} ${course.name} — Course Agent 맥락 (${new Date().toISOString().slice(0, 10)})`, '');
  lines.push(`- 상태: ${states[courseId] === 'completed' ? '완강' : states[courseId] === 'inactive' ? '수강기간 아님' : '진행 중'}`);
  if (rounds.length) lines.push(`- 회차 목록: ${rounds.join(', ')}`);
  lines.push('');

  // 저널: 그 과목 상자 조각(종합은 상자 밖 · general 조각)
  lines.push('## 저널 (과목 상자별 4F — 원문)', '');
  const code = (course.code || '').toLowerCase();
  for (const j of db.prepare('SELECT date, html FROM journals ORDER BY date').all()) {
    const mine = journalChunks(j.html).filter(c => (courseId === 'general' ? c.course === 'general' : c.course === code));
    if (!mine.length) continue;
    lines.push(`### ${j.date}`);
    for (const c of mine) lines.push(`[${c.section || '—'}]`, c.text, '');
  }

  if (courseId !== 'general') {
    lines.push('## 과제 공지 (주차 · 회차 · 마감 — 원문)', '');
    for (const n of db.prepare('SELECT * FROM assignment_notes WHERE course_id = ? ORDER BY week_no, round').all(courseId)) {
      lines.push(`### ${n.week_no}주차${n.round ? ` · ${n.round}` : ''}${n.due_at ? ` · 마감 ${n.due_at.replace('T', ' ')}` : ''}`, n.raw.trim(), '');
    }
    lines.push('## 제출 (확인메일 · 직접 확인)', '');
    for (const r of db.prepare(`SELECT w.week_no, t.kind, e.round, count(*) n, min(e.received_at) first FROM submission_evidence e
      JOIN submission_targets t ON t.id = e.target_id JOIN weeks w ON w.id = t.week_id WHERE t.course_id = ? GROUP BY w.week_no, t.kind, e.round ORDER BY w.week_no`).all(courseId)) {
      lines.push(`- ${r.week_no}주차${r.round ? ` ${r.round}` : ''} ${r.kind === 'assignment' ? '과제' : '셀프피드백'}: 확인메일 ${r.n}통 (첫 ${r.first.slice(0, 10)})`);
    }
    lines.push('');
  }

  const fs = db.prepare('SELECT data FROM future_state').get();
  if (fs) {
    const items = JSON.parse(fs.data).items.filter(i => (courseId === 'general' ? i.scope !== 'course' : (i.courseId || '').toLowerCase() === code));
    if (items.length) {
      lines.push('## Future Item', '');
      for (const i of items) lines.push(`- [${i.done ? 'x' : ' '}] ${i.text.replace(/\n/g, ' / ')}${i.source?.journalDate ? ` (저널 ${i.source.journalDate})` : ''}`);
      lines.push('');
    }
  }

  const mem = db.prepare('SELECT * FROM course_memory WHERE course_id = ? ORDER BY position').all(courseId);
  if (mem.length) {
    lines.push('## 지금 과목 기억 (고쳐 쓰거나 이어 쓴다)', '');
    for (const m of mem) lines.push(`- [${m.section}] (${m.id}) ${m.title} — ${m.body.replace(/\n/g, ' ')}`);
    lines.push('');
  }

  const files = localFiles(courseId);
  if (files.length) {
    lines.push(`## 로컬 자료 (${PHI_ROOT} 아래 — 필요한 것을 직접 읽는다)`, '');
    for (const f of files) lines.push(`- ${f.path} (${Math.round(f.size / 1024)}KB, ${f.mtime})`);
    lines.push('');
  }
  return lines.join('\n');
}

// ---- push ----
const sq = v => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';

export function validateMemory(courseId, doc) {
  if (!FOLDERS[courseId]) throw new Error(`모르는 과목: ${courseId}`);
  if (!doc || !MODES.includes(doc.mode)) throw new Error(`mode는 ${MODES.join('|')} 중 하나`);
  if (!Array.isArray(doc.items) || !doc.items.length) throw new Error('items가 비었다');
  const seen = new Set();
  return doc.items.map((it, i) => {
    if (!SECTIONS.includes(it.section)) throw new Error(`items[${i}].section: ${it.section}`);
    if (!it.title?.trim()) throw new Error(`items[${i}].title 없음`);
    if (it.section !== 'overview' && (!Array.isArray(it.sources) || !it.sources.length)) throw new Error(`items[${i}] 출처(sources) 없음 — 출처 없는 인사이트는 쓰지 않는다: ${it.title}`);
    let id = it.id || `${courseId}:${it.section}:${slug(it.title)}`;
    while (seen.has(id)) id += '-2';
    seen.add(id);
    return { id, section: it.section, title: it.title.trim(), body: (it.body || '').trim(), sources: it.sources || [], position: i };
  });
}

export function memorySql(courseId, doc, items, now = new Date().toISOString()) {
  return [
    `DELETE FROM course_memory WHERE course_id = ${sq(courseId)};`,
    ...items.map(it => `INSERT INTO course_memory (id, course_id, section, title, body, sources, position, updated_at) VALUES (${[it.id, courseId, it.section, it.title, it.body, JSON.stringify(it.sources), it.position, now].map((v, k) => (k === 6 ? v : sq(v))).join(', ')});`),
    `INSERT INTO course_memory_runs (course_id, mode, summary, ran_at) VALUES (${sq(courseId)}, ${sq(doc.mode)}, ${sq(doc.summary || '')}, ${sq(now)}) ON CONFLICT(course_id) DO UPDATE SET mode = excluded.mode, summary = excluded.summary, ran_at = excluded.ran_at;`,
  ].join('\n');
}

const sourceText = s => (s.type === 'journal' ? `저널 ${s.date}` : s.type === 'notice' ? `${s.week}주차${s.round ? ` ${s.round}` : ''} 공지`
  : s.type === 'file' ? s.path : s.type === 'course' ? `${String(s.id).toUpperCase()} 과목 기억` : JSON.stringify(s));

export function memoryMarkdown(courseId, doc, items, now = new Date().toISOString()) {
  const out = [`# ${courseId === 'general' ? '종합' : courseId.toUpperCase()} · 과목 기억 (Course Agent)`, '',
    `Phi Brain Course Agent가 ${now.slice(0, 10)}에 정리했다(${doc.mode}). 화면: Phi Brain → Course Agent. 이 파일은 정리할 때마다 새로 쓴다 - 직접 고칠 것은 Phi Brain 저널·공지에 남긴다.`, ''];
  if (doc.summary) out.push(`> ${doc.summary}`, '');
  for (const sec of SECTIONS) {
    const list = items.filter(i => i.section === sec);
    if (!list.length) continue;
    out.push(`## ${SECTION_LABEL[sec]}`, '');
    for (const it of list) {
      out.push(`- **${it.title}**${it.body ? ` ${it.body.replace(/\n/g, ' ')}` : ''}${it.sources.length ? ` _(${it.sources.map(sourceText).join(' · ')})_` : ''}`);
    }
    out.push('');
  }
  return out.join('\n');
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  if (cmd === 'pull') {
    const out = resolve(opt('--out') || join(tmpdir(), 'phi-course-agent'));
    mkdirSync(out, { recursive: true });
    const db = loadDb(exportD1(out));
    for (const id of Object.keys(FOLDERS)) writeFileSync(join(out, `${id}.md`), courseContext(db, id), 'utf8');
    console.log(`맥락 파일 ${Object.keys(FOLDERS).length}개: ${out}`);
    return;
  }
  if (cmd === 'push') {
    const [courseId, file] = args;
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    const items = validateMemory(courseId, doc);
    const now = new Date().toISOString();
    const sqlFile = join(dirname(resolve(file)), `${courseId}.memory.sql`);
    writeFileSync(sqlFile, memorySql(courseId, doc, items, now), 'utf8');
    const md = memoryMarkdown(courseId, doc, items, now);
    if (args.includes('--dry')) { console.log(md); return; }
    wrangler(['d1', 'execute', 'phi-brain', '--remote', `--file=${sqlFile}`, '-y']);
    const [folder] = FOLDERS[courseId];
    writeFileSync(join(PHI_ROOT, folder, 'COURSE_MEMORY.md'), md, 'utf8');
    console.log(`${courseId}: ${items.length}개 항목을 썼다 (D1 + ${folder}/COURSE_MEMORY.md)`);
    return;
  }
  console.error('사용: agent-data.mjs pull [--out 폴더] | push <과목> <memory.json> [--dry]');
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.message); process.exit(1); });
