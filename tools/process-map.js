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
    { tag: 'A · 저널 활용', title: '저널을 두 번 쓴다', body: ['외부 앱에 필기·정리한 뒤', '디스코드로 다시 옮겨 적는다.'] },
    { tag: '원인', title: '디스코드 저널은 사본이다', body: ['기록의 중심은 외부 앱에 있고,', '저널은 날짜순이라 과목별로 못 본다.'] },
    { tag: '방향', title: '한 곳에 쓰면 저절로 정리', body: ['쓰는 곳과 모아 보는 곳을 하나로.', '과목 태그로 자동 분류한다.'] },
    { tag: 'Journaling · Journal Archive', title: '쓰고, 과목별로 다시 본다', body: ['과목 칩으로 저널을 분류하고', '과목별 카드로 모아 다시 읽는다.'] },
  ],
  [
    { tag: 'B1 · 저널링', title: 'Findings가 휘발된다', body: ['써도 다시 보지 않아', '체화되지 못하고 금방 잊힌다.'] },
    { tag: '원인', title: '날짜순 기록은 다시 못 찾는다', body: ['기록은 다시 볼 때 배움이 되지만,', '쌓일수록 다시 보기 어렵다.'] },
    { tag: '방향', title: '깨달음만 모아 보여준다', body: ['저널에서 Finding만 뽑아', '과목별로 한눈에 보이게 한다.'] },
    { tag: 'Findings', title: '과목별 깨달음 모음', body: ['저널의 Finding을 과목 박스로 모으고', '별표한 것을 먼저 보여준다.'] },
  ],
  [
    { tag: 'B2 · 저널링', title: 'Future Item을 두 번 쓴다', body: ['매일 저널에 누적하거나', '외부 일정 앱에서 따로 관리한다.'] },
    { tag: '원인', title: '할 일이 여기저기 흩어진다', body: ['행동 계획이 저널과 외부 앱에', '나뉘어 끝까지 추적되지 않는다.'] },
    { tag: '방향', title: '행동은 한 목록에서 끝까지', body: ['저널에서 바로 옮기고', '마감과 완료까지 한곳에서 본다.'] },
    { tag: 'Future Item', title: '과목별 할 일 보드', body: ['과목 박스 · 마감 · 드래그 정렬,', '못 한 일은 이번 주로 이월된다.'] },
  ],
  [
    { tag: 'C · 과제 제출', title: '과제 관리가 어렵다', body: ['제출 현황·마감·링크가', 'LMS와 폼, 피그마에 흩어져 있다.'] },
    { tag: '원인', title: '마감을 한눈에 못 본다', body: ['우선순위에서 밀리는', '셀프 피드백부터 빠진다.'] },
    { tag: '방향', title: '제출 여부를 자동으로 확인', body: ['과목 × 주차 표 하나로', '무엇이 남았는지 바로 보이게.'] },
    { tag: 'Assignment Manage', title: '과목 × 주차 제출 현황', body: ['Gmail 제출 메일로 자동 확인,', '지각 제출 · 미제출 · 링크 모음.'] },
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

// Phase strip with the double-diamond silhouette: diverge, converge, diverge, converge
y = 140;
PHASES.forEach(([num, name, ko], i) => {
  const x = X[i];
  const diverge = i % 2 === 0;
  const mid = y + 34;
  // small diamond half: a wedge that opens (diverge) or closes (converge)
  const pts = diverge
    ? `${x},${mid} ${x + COL_W},${y} ${x + COL_W},${y + 68}`
    : `${x},${y} ${x + COL_W},${mid} ${x},${y + 68}`;
  out.push(`<polygon points="${pts}" fill="${SOFT}" stroke="${RULE}" stroke-width="1"/>`);
  const tx = diverge ? x + COL_W - 18 : x + 18;
  const anchor = diverge ? 'end' : 'start';
  out.push(text(tx, y + 30, `${num} · ${diverge ? '발산' : '수렴'}`, { size: 13, weight: 600, fill: GRAY, anchor }));
  out.push(text(tx, y + 54, `${name}  ${ko}`, { size: 18, weight: 700, anchor }));
});

// Evidence (Discover) + core problem statement (Define → Deliver)
y = 236;
const BAND_H = 96;
out.push(`<rect x="${X[0]}" y="${y}" width="${COL_W}" height="${BAND_H}" rx="20" fill="#fff" stroke="${RULE}"/>`);
out.push(text(X[0] + 24, y + 32, '조사 근거', { size: 13, weight: 600, fill: GRAY }));
out.push(text(X[0] + 24, y + 58, '직접 겪은 불편 · 동료 인터뷰 6명', { size: 16, weight: 600 }));
out.push(text(X[0] + 24, y + 80, '논문 5편 · 제출 데이터 509건', { size: 16, weight: 600 }));

const coreX = X[1];
const coreW = X[3] + COL_W - X[1];
out.push(`<rect x="${coreX}" y="${y}" width="${coreW}" height="${BAND_H}" rx="20" fill="${INK}"/>`);
out.push(text(coreX + 28, y + 34, '핵심 문제', { size: 13, weight: 600, fill: '#a8a8a8' }));
out.push(text(coreX + 28, y + 70, '기록은 매일 쌓이지만, 과목별로 모아 다시 보여주는 구조가 없다.', { size: 24, weight: 700, fill: '#fff', ls: '-0.02em' }));
out.push(text(coreX + coreW - 28, y + 34, 'How might we', { size: 13, weight: 600, fill: '#a8a8a8', anchor: 'end' }));
out.push(text(coreX + coreW - 28, y + 70, '매일 쓰는 기록이 과목별로 모여 다시 보이게 하려면?', { size: 15, weight: 500, fill: '#dcdcdc', anchor: 'end' }));

// Rows
const ROW_H = 150;
const ROW_GAP = 18;
y = 360;
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
out.push(text(X[0], y + 50, '각 행: 발견한 문제 → 원인 → 해결 방향 → 구현한 기능', { size: 14, weight: 500, fill: GRAY }));
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
