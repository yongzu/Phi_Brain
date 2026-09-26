// 앱 겉틀(design/prototypes/home.html) — 머리줄 · 왼쪽 탐색 · 본문 칸 · 바닥글 · 토스트. 로그인한 상태(닉네임)로 그린다.
// 영상에서 바꾼 것: 개발용 안내 문구(prototype-note) 삭제, 왼쪽 탐색은 Course Agent 묶음을 빼고 머리줄 아래에 고정(내비게이션 바처럼 — 사용자 지시).
import { JOURNAL_SCOPES, courseName, esc } from './courses';
import { app, real } from './real';

export type View = 'findings' | 'future' | 'assignment' | 'journal';

const HEADER = () => `<header class="toolbar">
  <a class="brand-lockup"><img class="brand-logo" src="${app.logo}" alt=""><span class="brand-word-wrap"><img class="brand-word" src="${app.wordmark}" alt="Phi Brain"></span></a>
  <div class="search-shell"><form class="search-field"><input type="search" class="search-input" placeholder="저널·과목 검색"></form></div>
  <button class="profile-trigger">${esc(real.nickname || '프로필')}</button>
  <div class="desktop-dl"><button type="button" class="desktop-dl-btn">Desktop App<span class="caret" aria-hidden="true">▾</span></button></div>
</header>`;

const HEADER_H = 69; // 머리줄(.toolbar) 높이 — 실측
const NAV = (view: View) => {
  const tab = (v: View, label: string, tier: 'tab1' | 'tab2') =>
    `<button type="button" class="nav-tab ${tier}${v === view ? ' active' : ''}"${v === view ? ' aria-current="page"' : ''} data-view="${v}">${label}</button>`;
  return `<nav class="side-nav" style="position:sticky;top:${HEADER_H}px;align-self:flex-start;z-index:5">
  <div class="nav-group">${tab('findings', 'Findings', 'tab1')}${tab('future', 'Future Item', 'tab1')}${tab('assignment', 'Assignment Manage', 'tab1')}</div>
  <div class="nav-group">${tab('journal', 'Journaling', 'tab2')}<button type="button" class="nav-tab tab2" data-view="journal-archive">Archive</button></div>
</nav>`;
};

const FOOTER = `<footer class="site-footer"><div class="footer-identity"><p>Phi Brain</p><p class="footer-copyright">Product for Phi Design Institute</p></div><div class="footer-social"><a>GitHub ↗</a></div></footer>`;

/** 토스트 — p(0→1) 나타남. 앱처럼 흐림 → 선명 + 살짝 아래에서 */
export const toastHTML = (msg: string, p: number) => (p <= 0 ? '' : `<div class="toast-wrap"><div class="toast" style="opacity:${p};filter:blur(${(1 - p) * 6}px);transform:translateY(${(1 - p) * 8}px)"><img class="toast-logo" src="${app.logo}" alt=""><span class="toast-msg">${esc(msg)}</span><button type="button" class="pill toast-act" hidden></button></div></div>`);

/** 페이지 전체 — .phi-app 안에 들어갈 마크업 */
export const pageHTML = (view: View, viewHTML: string, extra = '') =>
  `${HEADER()}<div class="app-body">${NAV(view)}<main class="shell">${viewHTML}</main></div>${FOOTER}${extra}`;

// ---------- Journaling ----------
const FOUR_F: [string, string][] = [
  ['Fact', '오늘 무엇을 배우거나 경험했나요?'],
  ['Feeling', '무엇이 인상적이거나 불편했나요?'],
  ['Finding', '새롭게 깨달은 것은 무엇인가요?'],
  ['Future Item', '다음에 구체적으로 무엇을 해볼 건가요?'],
];
export const fourFSection = (f: string, body = '<p><br></p>') => `<h3 data-guide="${FOUR_F.find((x) => x[0] === f)?.[1] || ''}">${f}</h3>${body}`;
export const courseBoxHTML = (code: string) =>
  `<div class="course-box" contenteditable="false" data-course="${code}"><button type="button" class="cb-btn"><span><span class="nav-code">${code}</span>_${courseName(code)}</span><span class="caret" aria-hidden="true">▾</span></button></div>`;

const TOOLS = (pressed: Record<string, boolean>) => {
  const b = (fmt: string, label: string, inner: string) =>
    `<button type="button" class="pill pill-icon" data-fmt="${fmt}" aria-pressed="${!!pressed[fmt]}" aria-label="${label}">${inner}</button>`;
  return `<div class="editor-tools" role="toolbar">
    <button type="button" class="pill pill-start" data-cmd="template" aria-pressed="${!!pressed.template}">4F 템플릿</button>
    <span class="tool-sep" aria-hidden="true"></span>
    ${b('bold', '굵게', '<b>B</b>')}${b('italic', '기울임', '<i>I</i>')}${b('underline', '밑줄', '<u>U</u>')}${b('strikeThrough', '취소선', '<s>S</s>')}
    <span class="hl-group">${b('highlight', '하이라이트', '<span class="ico-mark" aria-hidden="true"></span>')}<button type="button" class="pill hl-caret" data-hl-menu><span class="caret" aria-hidden="true">▾</span></button></span>
    <span class="tool-sep" aria-hidden="true"></span>
    ${b('quote', '인용', '<span class="ico-quote" aria-hidden="true"></span>')}${b('code', '코드', '<span class="ico-code" aria-hidden="true">&lt;/&gt;</span>')}
  </div>`;
};

export type JournalState = {
  editor: string; // 본문 html('' = 비어 있음 → 안내 문구)
  pressed?: Record<string, boolean>; // 툴바 버튼 눌림
  register?: boolean; // Future Item에 등록하기 체크
  saveStatus?: string;
  todo?: number; // 지난 할 일 돌아보기 수
  style?: string;
};
export function journalViewHTML(s: JournalState) {
  const chips = JOURNAL_SCOPES.map(([code, name]) => `<button type="button" class="pill" data-code="${code}" title="${code}_${name}">${code === 'general' ? 'General' : code}</button>`).join('');
  const row = (label: string, n: number) => `<details class="resume-row"><summary class="resume-summary"><span>${label}</span><span class="resume-count">${n}</span><span class="caret" aria-hidden="true">▾</span></summary></details>`;
  return `<div class="view view-journal" id="view-journal" style="${s.style || ''}">
  <section class="journal">
    <header class="journal-head"><h1 class="journal-heading">오늘의 저널</h1></header>
    <input type="text" class="title-input" placeholder="9월 27일 저널">
    <div class="courses"><div class="course-chips">${chips}</div></div>
    <span class="date-field"><button type="button" class="pill pill-end"><span>9월 27일</span><span class="caret" aria-hidden="true">▾</span></button></span>
    <div class="editor-bar">${TOOLS(s.pressed || {})}</div>
    <div class="editor" id="editor" data-placeholder="오늘의 저널링을 적어주세요">${s.editor}</div>
    <footer class="journal-foot">
      <p class="save-status">${esc(s.saveStatus || '')}</p>
      <label class="fi-register"><input type="checkbox"${s.register ? ' checked' : ''}> Future Item에 등록하기</label>
      <button type="button" class="btn-primary" id="organize">정리하기</button>
    </footer>
  </section>
  <section class="resume">${row('이어서 작성하기', 0)}${row('검토가 필요한 저널', 0)}${row('지난 할 일 돌아보기', s.todo ?? 0)}</section>
</div>`;
}
