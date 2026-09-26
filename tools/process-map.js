// Generates ips/process-map.svg — the IPS problem → solution map (Discover → Deliver).
// Run: node tools/process-map.js
// Text is laid out by hand (explicit line breaks), so keep each line short when editing.
const fs = require('fs');
const path = require('path');

const W = 1600;
const INK = '#141414';
const GRAY = '#6b6b6b';
const SOFT = '#f4f4f4';
const RULE = '#e2e2e2';
const FONT = "Pretendard, 'Pretendard Variable', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

const COL_W = 340;
const GAP = 50;
const X = [40, 40 + COL_W + GAP, 40 + 2 * (COL_W + GAP), 40 + 3 * (COL_W + GAP)];

const PHASES = [
  ['01', 'Discover', '문제 발견'],
  ['02', 'Define', '문제 정의'],
  ['03', 'Develop', '해결 방향'],
  ['04', 'Deliver', '솔루션 · Phi Brain'],
];

// One row per problem: [Discover, Define, Develop, Deliver]. Each cell: { tag, title, body[] }.
const ROWS = [
  [
    { tag: '문제 1 · 핵심', title: '저널을 다시 보지 않는다', body: ['학습 성찰이 일어나지 않아', '배운 것이 디자인으로 안 이어진다.'] },
    { tag: '근본 원인 · 5 Whys', title: '쓰는 데서 끝난다', body: ['날짜순 사본으로 쌓여', '다시 꺼내 보는 단계가 없다.'] },
    { tag: '선택 · 후보 8개 중 D', title: '쓰는 곳 = 다시 보는 곳', body: ['찾을 수 있게 하고,', '옮겨 쓰는 일을 없앤다.'] },
    { tag: 'Journaling · Findings · Archive', title: '쓴다 → 모인다 → 다시 본다', body: ['과목 박스·하이라이트로 쓰고', 'Finding을 과목별로 다시 읽는다.'] },
  ],
  [
    { tag: '문제 2 · 부차', title: '행동·과제를 수행하지 않는다', body: ['Future Item은 추적되지 않고', '셀프 피드백은 44%가 미제출.'] },
    { tag: '원인', title: '할 일이 여기저기 흩어진다', body: ['저널과 외부 앱에 나뉘어', '완료 여부가 남지 않는다.'] },
    { tag: '방향', title: '행동은 한 목록에서 끝까지', body: ['저널에서 바로 옮기고', '완료까지 한곳에서 본다.'] },
    { tag: 'Future Item', title: '과목별 할 일 보드', body: ['저널에서 등록 · 마감,', '못 한 일은 이번 주로 이월.'] },
  ],
  [
    { tag: '문제 3 · 부차', title: 'LMS로 현황을 알 수 없다', body: ['과제와 셀프 피드백이 섞여', '우선순위를 정하기 어렵다.'] },
    { tag: '원인', title: '마감을 한눈에 못 본다', body: ['한눈에 보이지 않으면', '밀리는 일부터 빠진다.'] },
    { tag: '방향', title: '제출 여부를 자동으로 확인', body: ['과목 × 주차 표 하나로', '무엇이 남았는지 바로 보이게.'] },
    { tag: 'Assignment Manage', title: '과목 × 주차 제출 현황', body: ['제출 확인 메일로 자동 확인,', '지각 · 미제출 · 링크 모음.'] },
  ],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = (x, y, s, { size = 15, weight = 400, fill = INK, anchor = 'start', ls = '-0.01em' } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;

const out = [];
let y = 0;

// Title
out.push(text(40, 70, 'Phi Brain — 문제 정의에서 해결까지', { size: 34, weight: 700, ls: '-0.02em' }));
out.push(text(40, 104, 'IPS · 문제해결 월드컵 3라운드 · Double Diamond', { size: 16, weight: 500, fill: GRAY }));

// Double diamond, drawn square like the page (45° sides, every quarter the same size) — never stretched to fit the columns
const DQ = 140; // quarter width = half height
const DX = W - 40 - DQ * 4;
const DY = 36;
PHASES.forEach(([num, name], i) => {
  const x = DX + i * DQ;
  const diverge = i % 2 === 0;
  const pts = diverge
    ? `${x},${DY + DQ} ${x + DQ},${DY} ${x + DQ},${DY + DQ * 2}`
    : `${x},${DY} ${x + DQ},${DY + DQ} ${x},${DY + DQ * 2}`;
  out.push(`<polygon points="${pts}" fill="${i === 3 ? INK : SOFT}" stroke="${i === 3 ? INK : RULE}" stroke-width="1"/>`);
  const cx = diverge ? x + DQ * 0.62 : x + DQ * 0.38;
  out.push(text(cx, DY + DQ - 6, `${num} · ${diverge ? "발산" : "수렴"}`, { size: 11, weight: 600, fill: i === 3 ? "#bdbdbd" : GRAY, anchor: "middle" }));
  out.push(text(cx, DY + DQ + 16, name, { size: 15, weight: 700, fill: i === 3 ? "#fff" : INK, anchor: "middle" }));
});

// Column headers — one phase per column
y = DY + DQ * 2 + 44;
PHASES.forEach(([num, name, ko], i) => {
  out.push(text(X[i], y, `${num} · ${name}`, { size: 13, weight: 600, fill: GRAY }));
  out.push(text(X[i], y + 26, ko, { size: 19, weight: 700, ls: "-0.02em" }));
  out.push(`<rect x="${X[i]}" y="${y + 40}" width="${COL_W}" height="2" fill="${INK}"/>`);
});

// Evidence (Discover) + core problem statement (Define → Deliver)
y += 64;
const BAND_H = 124;
out.push(`<rect x="${X[0]}" y="${y}" width="${COL_W}" height="${BAND_H}" rx="20" fill="#fff" stroke="${RULE}"/>`);
out.push(text(X[0] + 24, y + 32, '조사 근거', { size: 13, weight: 600, fill: GRAY }));
out.push(text(X[0] + 24, y + 58, '직접 겪은 불편 · 동료 인터뷰 6명', { size: 16, weight: 600 }));
out.push(text(X[0] + 24, y + 82, '논문 5편 · 제출 데이터', { size: 16, weight: 600 }));
out.push(text(X[0] + 24, y + 106, '과제 509건 · 셀프 피드백 728칸', { size: 16, weight: 600 }));

const coreX = X[1];
const coreW = X[3] + COL_W - X[1];
out.push(`<rect x="${coreX}" y="${y}" width="${coreW}" height="${BAND_H}" rx="20" fill="${INK}"/>`);
out.push(text(coreX + 28, y + 34, '근본 원인 · Define', { size: 13, weight: 600, fill: '#a8a8a8' }));
out.push(text(coreX + 28, y + 70, '저널링은 쓰는 데서 끝나, 배운 것을 다시 꺼내 보는 단계가 없다.', { size: 24, weight: 700, fill: '#fff', ls: '-0.02em' }));
out.push(text(coreX + 28, y + 104, 'HMW — 어떻게 하면 저널에 쓴 Findings를 다시 꺼내 보고, 자신의 디자인에 적용하게 할 수 있을까?', { size: 15, weight: 500, fill: '#dcdcdc' }));

// Rows
const ROW_H = 150;
const ROW_GAP = 18;
y += BAND_H + 28;
ROWS.forEach((row) => {
  row.forEach((cell, i) => {
    const x = X[i];
    const dark = i === 3;
    const fill = dark ? INK : i === 1 ? '#fff' : SOFT;
    const stroke = i === 1 ? ` stroke="${RULE}"` : '';
    const main = dark ? '#fff' : INK;
    const sub = dark ? '#bdbdbd' : GRAY;
    out.push(`<rect x="${x}" y="${y}" width="${COL_W}" height="${ROW_H}" rx="20" fill="${fill}"${stroke}/>`);
    out.push(text(x + 24, y + 34, cell.tag, { size: 13, weight: 600, fill: sub }));
    out.push(text(x + 24, y + 66, cell.title, { size: 20, weight: 700, fill: main, ls: '-0.02em' }));
    cell.body.forEach((line, j) => out.push(text(x + 24, y + 98 + j * 24, line, { size: 15, fill: dark ? '#e6e6e6' : '#3a3a3a' })));
    // arrow into the next column
    if (i < 3) {
      const ax = x + COL_W + 10;
      const ay = y + ROW_H / 2;
      out.push(`<path d="M${ax} ${ay} H${ax + GAP - 22}" stroke="${INK}" stroke-width="1.6" fill="none"/>`);
      out.push(`<path d="M${ax + GAP - 28} ${ay - 6} L${ax + GAP - 21} ${ay} L${ax + GAP - 28} ${ay + 6}" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  });
  y += ROW_H + ROW_GAP;
});

// Delivery channel under the solutions
y += 6;
out.push(`<rect x="${X[3]}" y="${y}" width="${COL_W}" height="84" rx="20" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`);
out.push(text(X[3] + 24, y + 32, '어디서나 · Desktop App', { size: 13, weight: 600, fill: GRAY }));
out.push(text(X[3] + 24, y + 60, '웹 + Windows · macOS 앱, 트레이·단축키', { size: 16, weight: 600 }));
out.push(text(X[0], y + 50, '각 행: 발견한 문제 → 원인 → 해결 방향 → 구현한 기능 · 첫 행이 핵심 문제', { size: 14, weight: 500, fill: GRAY }));
y += 84 + 40;

const H = y;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
<title>Phi Brain — 문제 정의에서 해결까지</title>
<rect width="${W}" height="${H}" fill="#fff"/>
${out.join('\n')}
</svg>
`;
fs.writeFileSync(path.join(__dirname, '..', 'ips', 'process-map.svg'), svg);
console.log(`ips/process-map.svg ${W}×${H}`);
