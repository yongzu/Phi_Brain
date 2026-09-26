#!/usr/bin/env node
// IPS Deliver 섹션의 프로토타입 화면을 가상 데이터(seed.js)로 찍는다.
// 로컬 서버가 먼저 떠 있어야 한다: node tools/dev-server.js . 5510
// Usage: node tools/ips-capture/capture.js [--seed 데이터.json] [--journal YYYY-MM-DD] [--chrome 경로]
//   --seed    가상 데이터(seed.js) 대신 쓸 JSON — { journals, findingsFavorites, findingsHidden, future }.
//             로그인한 프로토타입에서 내려받은 실제 데이터를 쓸 때. 저장소 밖에 두고, 저장소에는 넣지 않는다.
//   --journal Journaling 화면에 열 저널 날짜(기본 2026-09-21)
// 결과: ips/img/*.webp. 헤드리스 크롬을 따로 띄우고(임시 프로필) DevTools 프로토콜로 조작한다 — 평소 브라우저의 저장값은 건드리지 않는다.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const CHROME = arg('--chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe');
const SEED_FILE = arg('--seed', null);
const JOURNAL_DATE = arg('--journal', '2026-09-21');
const ORIGIN = 'http://localhost:5510';
const APP = `${ORIGIN}/design/prototypes/home.html`;
const OUT = path.resolve(__dirname, '..', '..', 'ips', 'img');
const PORT = 9333;
const W = 1440, H = 900;

// view = 왼쪽 탭(data-view), hash = 필터까지 담은 주소, journal = 그 날짜 저널을 에디터로 연다,
// click = 찍기 전에 누를 버튼, region = 찍을 범위(문서 좌표 {x, y, width, height})를 돌려주는 식.
// 페이지에 작게 들어가므로 전체 화면 대신 보여 줄 부분만 자른다.
const box = (sel) => `document.querySelector('${sel}').getBoundingClientRect()`;
const SHOTS = [
  // 입력창의 최대 높이(내부 스크롤)를 풀고 폭을 좁혀, Finding 소제목부터 찍는다 — 하이라이트가 있는 부분
  { name: 'phi-journaling', journal: JOURNAL_DATE,
    region: `(() => { const ed = document.querySelector('#editor'); ed.style.maxHeight = 'none'; ed.style.overflow = 'visible'; ed.style.maxWidth = '620px'; /* 페이지에 작게 들어가므로 줄을 짧게 */
      const heads = [...ed.querySelectorAll('h3')]; const h = (heads.find((x) => x.textContent.trim().toLowerCase() === 'finding') || heads[0]).getBoundingClientRect();
      const e = ed.getBoundingClientRect(); const width = Math.min(e.width + 48, 900);
      return { x: e.left - 24, y: h.top + scrollY - 12, width, height: Math.round(width / 1.185) }; })()` },
  { name: 'phi-findings', view: 'findings',
    region: `(() => { const f = ${box('#findings-filters')}, l = ${box('#findings-list')};
      return { x: l.left - 24, y: f.top + scrollY - 24, width: l.width + 48, height: 560 }; })()` },
  { name: 'phi-archive', view: 'journal-archive', hash: '#journal-archive/BI',
    region: `(() => { const f = ${box('#archive-filters')}, card = ${box('#archive-cards .archive-card')};
      return { x: f.left - 24, y: f.top + scrollY - 12, width: card.right - f.left + 48, height: card.bottom - f.top + 36 }; /* 첫 카드까지 */ })()` },
  { name: 'phi-future', view: 'future',
    region: `(() => { const f = ${box('#fi-filters')};
      const third = [...document.querySelectorAll('#view-future .fi-box')].map((b) => b.getBoundingClientRect()).filter((r) => r.top > f.bottom)[2]; // 세 번째 열까지
      return { x: f.left - 16, y: f.top + scrollY - 12, width: third.right - f.left + 32, height: 480 }; })()` },
  { name: 'phi-assignment', view: 'assignment', click: '#am-week-prev', // 2주차: 동기화가 끝난 주
    region: `(() => { const n = document.querySelector('#am-week-prev').parentElement.getBoundingClientRect(), t = ${box('#am-table')};
      return { x: t.left - 24, y: n.top + scrollY - 8, width: t.width + 48, height: 580 }; })()` },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ips-capture-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    `--window-size=${W},${H}`, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  try {
    let targets;
    for (let i = 0; i < 50 && !targets; i++) {
      await sleep(200);
      targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()).catch(() => null);
    }
    const page = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r, { once: true }));
    let seq = 0;
    const pending = new Map();
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const go = async (url) => { await send('Page.navigate', { url }); await sleep(1800); };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });
    await go(APP);
    const seedJson = SEED_FILE ? fs.readFileSync(SEED_FILE, 'utf8') : null;
    if (seedJson) JSON.parse(seedJson); // fail early on a broken file
    await evaluate(`(async () => {
      localStorage.clear();
      ${seedJson ? `window.__IPS_SEED__ = ${seedJson};` : "eval(await (await fetch('/tools/ips-capture/seed.js')).text());"}
      const S = window.__IPS_SEED__;
      Object.entries(S.journals).forEach(([d, v]) => { if (v) localStorage.setItem('phi-brain:journal:' + d, JSON.stringify(v)); });
      localStorage.setItem('phi-brain:future:v2', JSON.stringify(S.future));
      localStorage.setItem('phi-brain:findings:favorites', JSON.stringify(S.findingsFavorites || []));
      localStorage.setItem('phi-brain:findings:hidden', JSON.stringify(S.findingsHidden || []));
      localStorage.setItem('phibrain.highlightColor', 'yellow');
    })()`);

    for (const s of SHOTS) {
      await go('about:blank');
      await go(APP);
      if (s.view) await evaluate(`document.querySelector('.nav-tab[data-view="${s.view}"]').click()`);
      if (s.hash) await evaluate(`location.hash = ${JSON.stringify(s.hash)}`);
      if (s.journal) await evaluate(`window.PhiBrain.openJournal(${JSON.stringify(s.journal)})`);
      await sleep(1200);
      if (s.click) { await evaluate(`document.querySelector(${JSON.stringify(s.click)}).click()`); await sleep(1200); }
      const clip = await evaluate(`(() => {
        document.activeElement && document.activeElement.blur();
        document.querySelector('header.toolbar').style.visibility = 'hidden'; // 스크롤해도 따라오는 머리줄이 본문을 가리지 않게
        const r = ${s.region};
        return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), scale: 1 };
      })()`);
      await sleep(400);
      const { data } = await send('Page.captureScreenshot', { format: 'webp', quality: 90, clip, captureBeyondViewport: true });
      const file = path.join(OUT, `${s.name}.webp`);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      console.log(`${path.relative(process.cwd(), file)}  ${Math.round(fs.statSync(file).size / 1024)}KB`);
    }
    ws.close();
  } finally {
    chrome.kill();
    await sleep(500);
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
