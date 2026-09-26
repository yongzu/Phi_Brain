// 9 · 사용 ① Journaling — 실제 앱 화면(앱 CSS · 실제 과목 목록)에서 오늘(9/27) 저널을 쓴다.
//   4F 템플릿 → Finding 줄 → BI 과목 버튼으로 과목 박스 → 세 줄 입력(사용자가 준 실제 BI Finding)
//   → 굵게 · 하이라이트(파랑) → Future Item 줄도 BI로 한 줄 → "Future Item에 등록하기" → 정리하기 → 알림
//   → 왼쪽 탐색의 Findings를 누르며 10번으로 이어진다.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { AppScreen, WHOLE } from '../app/AppScreen';
import { courseBoxHTML, fourFSection, journalViewHTML, pageHTML, toastHTML } from '../app/shell';
import { caret, cursorProps, fadeStyle, ramp, typed, type Step } from '../app/motion';
import { sec } from '../theme';

export const S09_DURATION = sec(16.2);

// 사용자가 준 실제 Finding(BI) — phrase가 굵게(2번은 하이라이트도) 칠해지는 부분
const ITEMS = [
  { pre: '1. 여러가지 텍스트나 컨텐츠가 들어가는 박스는, ', phrase: '가장 길거나 큰 개체를 기준으로 세운다', post: '. (ex) What If → Iterative Problem Solving)', cpf: 1.6 },
  { pre: '2. ', phrase: '양쪽정렬은 절대 안쓴다.', post: ' 양쪽 정렬을 사용 시 자간이 들쭉날쭉해지기 때문에 가독성을 해치기 쉽다. 전문가님을 포함해 타이포그래피에 대한 개념이 있는 사람들은 거의 무조건 좌측 정렬을 사용한다. 같은문장 맥락에서 줄바꿈을 할 이유는 크게 없다. (새로운 의미단위이거나, 단어 자체가 끊길때는 다음 줄로 넘겨도된다.) 워드 브레이킹이라는 코드로, 줄변경시 단어 끊김이 없게 만들 수 있다. ← 서치할것.', cpf: 4 },
  { pre: '3. ', phrase: '여백에 대한 암묵지적 감각 기르기.', post: ' 텍스트와 박스 사이의 여백에 대한 내용. 텍스트가 커지면 여백도 좁아보인다 등.', cpf: 2.2 },
];
const FUTURE = '워드브레이킹 코드 서치 및 적용'; // 이 Finding에서 나온 실제 BI Future Item
const len = (i: number) => Array.from(ITEMS[i].pre + ITEMS[i].phrase + ITEMS[i].post).length;

// ---- 시간표(프레임) ----
const TMPL = sec(1.5); // 4F 템플릿
const FIND_LINE = sec(2.2); // Finding 줄 클릭
const BI1 = sec(2.9); // BI 과목 버튼
const TYPE_AT = sec(3.15);
const GAP = 5; // 줄 사이(Enter)
const starts = ITEMS.reduce<number[]>((acc, _, i) => [...acc, i === 0 ? TYPE_AT : acc[i - 1] + Math.ceil(len(i - 1) / ITEMS[i - 1].cpf) + GAP], []);
const TYPED_END = starts[2] + Math.ceil(len(2) / ITEMS[2].cpf);
const FI_LINE = TYPED_END + sec(0.55); // Future Item 줄 클릭
const BI2 = FI_LINE + sec(0.55);
const FI_TYPE = BI2 + sec(0.15);
const FI_END = FI_TYPE + Math.ceil(Array.from(FUTURE).length / 1.2);
// 서식: 선택(드래그) → 굵게(→ 하이라이트)
const FMT: { sel: number; selEnd: number; bold: number; mark?: number }[] = [
  { sel: FI_END + sec(0.6), selEnd: FI_END + sec(0.95), bold: FI_END + sec(1.35) },
  { sel: FI_END + sec(1.85), selEnd: FI_END + sec(2.15), bold: FI_END + sec(2.55), mark: FI_END + sec(2.9) },
  { sel: FI_END + sec(3.4), selEnd: FI_END + sec(3.75), bold: FI_END + sec(4.15) },
];
const REG = FMT[2].bold + sec(0.75); // Future Item에 등록하기
const ORG = REG + sec(0.6); // 정리하기
const NAV = S09_DURATION - sec(0.12); // 왼쪽 탐색 Findings

function itemHTML(i: number, f: number) {
  const it = ITEMS[i];
  if (f < starts[i]) return null;
  const t = typed(it.pre + it.phrase + it.post, f, starts[i], it.cpf);
  if (!t.done) return { html: t.text, typing: true };
  const fm = FMT[i];
  const next = FMT[i + 1]?.sel ?? REG; // 다음 줄을 고르기 시작하면 선택이 풀린다
  const selP = f >= fm.sel && f < next ? ramp(f, fm.sel, fm.selEnd) : 0;
  const chars = Array.from(it.phrase);
  const n = Math.round(chars.length * selP);
  let ph = selP > 0 ? `<span style="background:#ededed">${chars.slice(0, n).join('')}</span>${chars.slice(n).join('')}` : it.phrase;
  if (f >= fm.bold) ph = `<b>${ph}</b>`;
  if (fm.mark !== undefined && f >= fm.mark) ph = `<mark data-hl="blue">${ph}</mark>`;
  return { html: `${it.pre}<span data-ph="${i + 1}">${ph}</span>${it.post}`, typing: false };
}

function editorAt(f: number) {
  if (f < TMPL) return '';
  const fact = f < FIND_LINE ? `<p>${caret(f - TMPL)}</p>` : '<p><br></p>';
  let finding = '<p><br></p>';
  if (f >= FIND_LINE && f < BI1) finding = `<p>${caret(f - FIND_LINE)}</p>`;
  if (f >= BI1) {
    const lines = ITEMS.map((_, i) => itemHTML(i, f)).filter((l): l is { html: string; typing: boolean } => !!l);
    const on = f < FI_LINE;
    const last = lines.length - 1;
    const body = lines.length
      ? lines.map((l, i) => `<p>${l.html}${on && i === last ? caret(l.typing ? 0 : f - TYPED_END) : ''}</p>`).join('')
      : `<p>${on ? caret(f - BI1) : '<br>'}</p>`;
    finding = courseBoxHTML('BI') + body;
  }
  let future = '<p><br></p>';
  if (f >= FI_LINE && f < BI2) future = `<p>${caret(f - FI_LINE)}</p>`;
  if (f >= BI2) {
    const t = typed(FUTURE, f, FI_TYPE, 1.2);
    const on = f < FMT[0].sel;
    future = courseBoxHTML('BI') + `<p>${t.text}${on ? caret(t.done ? f - FI_END : 0) : t.text ? '' : '<br>'}</p>`;
  }
  return fourFSection('Fact', fact) + fourFSection('Feeling') + fourFSection('Finding', finding) + fourFSection('Future Item', future);
}

// ---- 커서 경로 ----
const PATH: Step[] = [
  { t: 0, x: 1060, y: 610, k: 'arrow' },
  { t: sec(0.5), x: 1060, y: 610, k: 'arrow' },
  { t: TMPL - 3, sel: '[data-cmd="template"]', k: 'pointer' },
  { t: TMPL + 6, sel: '[data-cmd="template"]', k: 'pointer' },
  { t: FIND_LINE - 3, sel: '#editor h3:nth-of-type(3)', ax: 0.2, ay: 1, dy: 18, k: 'text' },
  { t: FIND_LINE + 6, sel: '#editor h3:nth-of-type(3)', ax: 0.2, ay: 1, dy: 18, k: 'text' },
  { t: BI1 - 3, sel: '.course-chips [data-code="BI"]', k: 'pointer' },
  { t: TYPED_END, sel: '.course-chips [data-code="BI"]', dy: 14, k: 'pointer' },
  { t: FI_LINE - 3, sel: '#editor h3:nth-of-type(4)', ax: 0.2, ay: 1, dy: 18, k: 'text' },
  { t: FI_LINE + 6, sel: '#editor h3:nth-of-type(4)', ax: 0.2, ay: 1, dy: 18, k: 'text' },
  { t: BI2 - 3, sel: '.course-chips [data-code="BI"]', k: 'pointer' },
  { t: FI_END, sel: '.course-chips [data-code="BI"]', dy: 14, k: 'pointer' },
  ...FMT.flatMap((m, i) => {
    const ph = `[data-ph="${i + 1}"]`;
    const steps: Step[] = [
      { t: m.sel - 2, sel: ph, edge: 'start', k: 'text' },
      { t: m.selEnd, sel: ph, edge: 'end', k: 'text' },
      { t: m.bold - 3, sel: '[data-fmt="bold"]', k: 'pointer' },
      { t: m.bold + 5, sel: '[data-fmt="bold"]', k: 'pointer' },
    ];
    if (m.mark !== undefined) steps.push({ t: m.mark - 3, sel: '[data-fmt="highlight"]', k: 'pointer' }, { t: m.mark + 5, sel: '[data-fmt="highlight"]', k: 'pointer' });
    return steps;
  }),
  { t: REG - 3, sel: '.fi-register input', k: 'pointer' },
  { t: REG + 6, sel: '.fi-register input', k: 'pointer' },
  { t: ORG - 3, sel: '#organize', k: 'pointer' },
  { t: ORG + sec(0.9), sel: '#organize', dx: 30, dy: 26, k: 'arrow' },
  { t: NAV - 3, sel: '.nav-tab[data-view="findings"]', ax: 0.35, k: 'pointer' },
  { t: NAV + 20, sel: '.nav-tab[data-view="findings"]', ax: 0.35, k: 'pointer' },
];
const CLICKS = [TMPL, FIND_LINE, BI1, FI_LINE, BI2, ...FMT.flatMap((m) => (m.mark !== undefined ? [m.bold, m.mark] : [m.bold])), REG, ORG, NAV];

export const S09Journal: React.FC = () => {
  const f = useCurrentFrame();
  const selBold = FMT.some((m, i) => f >= m.bold && f < (FMT[i + 1]?.sel ?? REG));
  const selMark = FMT[1].mark !== undefined && f >= FMT[1].mark && f < FMT[2].sel;
  const view = journalViewHTML({
    editor: editorAt(f),
    pressed: { template: f >= TMPL, bold: selBold, highlight: selMark },
    register: f >= REG,
    todo: 7,
    style: fadeStyle(ramp(f, 0, sec(0.5))),
  });
  const toast = ramp(f, ORG + 4, ORG + sec(0.4)) * (1 - ramp(f, NAV - sec(0.4), NAV));
  const html = pageHTML(f >= NAV ? 'findings' : 'journal', view, toastHTML('Findings 3개 · Future Item 1개 추가했어요', toast));
  // 편집 줄이 늘어나면 페이지도 조금 내려간다 — 100이면 과목 버튼(188) · 툴바(271) · 본문 · 정리하기(858)가 한 화면(머리줄 69 아래)에 다 보인다
  const scroll = ramp(f, starts[1], FI_LINE) * 100;
  return <AppScreen html={html} scroll={Math.max(0, scroll)} camera={WHOLE} cursor={cursorProps(PATH, f, CLICKS, ramp(f, sec(0.3), sec(0.6)))} />;
};
