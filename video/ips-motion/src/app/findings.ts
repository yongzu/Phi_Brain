// Findings — 앱(design/prototypes/journal.js)과 같은 규칙으로 실제 저널에서 박스를 뽑고 순서를 정한다.
// 저널의 "Finding" 소제목 아래, 과목 박스마다, "1. 2." 번호 줄마다 박스 하나. 별표한 박스(별표한 순서) → 나머지는 날짜순.
// 브라우저 DOM을 쓰므로 렌더(크롬) 안에서만 부른다.
import { ALIASES, JOURNAL_SCOPES, courseName, esc, monthDay } from './courses';
import { real } from './real';

const NUMBERED = /^\s*\d{1,3}\s*[.)](?!\d)\s*\S/;
const INLINE_TAG = /^(B|STRONG|I|EM|U|S|STRIKE|MARK|CODE|SPAN|A)$/;
const isNumberedLine = (el: Element) => /^(P|DIV)$/.test(el.tagName) && !el.classList.contains('course-box') && NUMBERED.test(el.textContent || '');
const isBlankBlock = (el: Element) => (el.textContent || '').trim() === '' && !el.querySelector('img, hr');

function repairRich(root: HTMLElement) {
  root.querySelectorAll('span[style]').forEach((sp) => sp.replaceWith(...Array.from(sp.childNodes)));
  root.querySelectorAll('h3').forEach((h) => {
    const nodes = Array.from(h.childNodes);
    const cut = nodes.findIndex((n) => n.nodeType === 1 && !INLINE_TAG.test((n as Element).tagName));
    if (cut === -1) return;
    const out: Node[] = [];
    let line: HTMLElement | null = null;
    nodes.slice(cut).forEach((n) => {
      if (n.nodeName === 'BR') { if (!line) out.push(Object.assign(document.createElement('p'), { innerHTML: '<br>' })); line = null; return; }
      if (n.nodeType === 1 && !INLINE_TAG.test((n as Element).tagName)) { line = null; out.push(n); return; }
      if (!line) { line = document.createElement('p'); out.push(line); }
      line.append(n);
    });
    if (out[0] && (out[0] as Element).tagName === 'P' && (out[0] as Element).innerHTML === '<br>' && nodes[cut].nodeName === 'BR') out.shift();
    h.after(...out);
    if (!(h.textContent || '').trim()) h.remove();
  });
  root.normalize();
}

function splitNumberedBreaks(p: Element): Element[] {
  if (p.tagName !== 'P' || !p.querySelector(':scope > br')) return [p];
  const lines: Node[][] = [[]];
  Array.from(p.childNodes).forEach((n) => (n.nodeName === 'BR' ? lines.push([]) : lines[lines.length - 1].push(n)));
  const lineText = (nodes: Node[]) => nodes.map((n) => n.textContent).join('');
  if (!lines.slice(1).some((l) => NUMBERED.test(lineText(l)))) return [p];
  const paras: HTMLElement[] = [];
  lines.forEach((nodes, i) => {
    if (i === 0 || NUMBERED.test(lineText(nodes))) paras.push(document.createElement('p'));
    else paras[paras.length - 1].append(document.createElement('br'));
    paras[paras.length - 1].append(...nodes);
  });
  paras.forEach((np) => { if (!np.childNodes.length) np.append(document.createElement('br')); });
  p.replaceWith(...paras);
  return paras;
}

function findingSlices(html: string) {
  const frag = document.createElement('div');
  frag.innerHTML = html;
  repairRich(frag);
  const slices: { course: string; els: Element[] }[] = [];
  let capturing = false;
  let cur: { course: string; els: Element[] } | null = null;
  const trim = (els: Element[]) => {
    while (els.length && isBlankBlock(els[0])) els.shift();
    while (els.length && isBlankBlock(els[els.length - 1])) els.pop();
    return els;
  };
  const flush = () => {
    if (!cur) return;
    const groups: Element[][] = [];
    trim(cur.els).forEach((el) => {
      if (!groups.length || isNumberedLine(el)) groups.push([]);
      groups[groups.length - 1].push(el);
    });
    const course = cur.course;
    groups.map(trim).filter((g) => g.length).forEach((g) => slices.push({ course, els: g }));
    cur = null;
  };
  Array.from(frag.children).forEach((el) => {
    if (el.tagName === 'H3') { flush(); capturing = (el.textContent || '').trim().toLowerCase() === 'finding'; return; }
    if (!capturing) return;
    if (el.classList.contains('course-box')) { flush(); const c = (el as HTMLElement).dataset.course || ''; cur = { course: ALIASES[c] || c, els: [] }; return; }
    if (cur) cur.els.push(...splitNumberedBreaks(el));
  });
  flush();
  return slices
    .filter((s) => JOURNAL_SCOPES.some((c) => c[0] === s.course))
    .map((s) => ({ course: s.course, html: s.els.map((el) => el.outerHTML).join('') }));
}

function textPrint(html: string) {
  const t = document.createElement('div');
  t.innerHTML = html;
  const s = (t.textContent || '').replace(/\s+/g, ' ').trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

export type Entry = { date: string; pos: number; html: string; course: string; key: string; hidden: boolean; num?: number };

let cache: Entry[] | null = null;
export function findingsEntries(): Entry[] {
  if (cache) return cache;
  const gone = new Set(real.findingsHidden);
  const out: Entry[] = [];
  [...real.journals].sort((a, b) => b.date.localeCompare(a.date)).forEach((j) => {
    if (!j.html) return;
    const seen = new Map<string, number>();
    findingSlices(j.html).forEach((s, pos) => {
      const n = seen.get(s.course) || 0;
      seen.set(s.course, n + 1);
      out.push({ date: j.date, pos, html: s.html, course: s.course, key: `${j.date}::${s.course}::${n}`, hidden: gone.has(`${j.date}::${s.course}::${textPrint(s.html)}`) });
    });
  });
  cache = out;
  return out;
}

/** 필터 줄 숫자 — All · 즐겨찾기 · 과목별(내용 있는 과목만, 앱의 과목 순서) */
export function findingsCounts(favorites: string[]) {
  const all = findingsEntries();
  const keys = JOURNAL_SCOPES.map((c) => c[0]).filter((k) => all.some((e) => e.course === k));
  return {
    all: all.length,
    fav: favorites.filter((k) => all.some((e) => e.key === k)).length,
    courses: keys.map((k) => [k, all.filter((e) => e.course === k).length] as [string, number]),
  };
}

/** 한 과목 필터의 박스 순서 — 별표(별표한 순서) → 날짜 → 저널 안 위치. 숨긴 박스는 번호 없이 맨 아래 */
export function findingsList(course: string, favorites: string[]) {
  const rank = (e: Entry) => { const i = favorites.indexOf(e.key); return i === -1 ? Infinity : i; };
  const cards = findingsEntries().filter((e) => course === 'all' || e.course === course)
    .sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date) || a.pos - b.pos);
  const shown = cards.filter((e) => !e.hidden).map((e, i) => ({ ...e, num: i + 1 }));
  return { shown, hidden: cards.filter((e) => e.hidden) };
}

// 저널에 쓴 "1. " 번호는 박스에서만 뗀다(앱의 splitLeadNumber)
function firstText(root: Node) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = w.nextNode()) && !(n.textContent || '').trim());
  return n;
}
function splitLeadNumber(html: string): [string, string] {
  const t = document.createElement('div');
  t.innerHTML = html;
  const n = firstText(t);
  const line = n?.parentElement?.closest('p, div, li, blockquote, h3') || t;
  const lead = n && NUMBERED.test(line.textContent || '') && (n.textContent || '').match(/^\s*\d{1,3}\s*[.)]\s*/)?.[0];
  if (!lead || !n) return ['', html];
  n.textContent = (n.textContent || '').slice(lead.length);
  return [lead, t.innerHTML];
}

/** 앱의 findingsCardHTML과 같은 마크업. isFav = 별 모양, flip = 영상에서 움직임을 맞출 키 */
export function findingsCardHTML(e: Entry, isFav: boolean) {
  const key = e.course;
  const label = key === 'general' ? 'General' : `<span class="nav-code">${esc(key)}</span>_${esc(courseName(key))}`;
  const [lead, body] = splitLeadNumber(e.html);
  return `<section class="fi-box findings-card" data-box="${key}" data-key="${esc(e.key)}" data-flip="${esc(e.key)}">
      <header class="fi-box-head">
        ${e.num ? `<span class="findings-num">${e.num}</span>` : ''}
        <h2 class="fi-box-title">${label}</h2>
        <span class="findings-date">${esc(monthDay(e.date))}</span>
        <button type="button" class="findings-edit-btn">수정하기</button>${e.hidden
          ? '<button type="button" class="findings-edit-btn">숨기기 해제</button>'
          : '<button type="button" class="findings-edit-btn">숨기기</button>'}
        <button type="button" class="fi-box-fav${isFav ? ' is-fav' : ''}" data-fav="${esc(e.key)}" aria-pressed="${isFav}"></button>
      </header>
      <div class="editor archive-preview findings-body" data-lead="${esc(lead)}">${body}</div>
    </section>`;
}

/** Findings 화면 전체(제목 · 설명 · 필터 · 목록) */
export function findingsViewHTML(filter: string, favorites: string[], style = '', listStyle = '') {
  const c = findingsCounts(favorites);
  const pill = (k: string, label: string, n: number) =>
    `<button type="button" class="pill fi-filter" data-findings-filter="${k}" aria-pressed="${k === filter}">${label}<span class="f-count" aria-hidden="true">${n}</span></button>`;
  const filters = pill('all', 'All', c.all) + (c.fav ? pill('favorites', '즐겨찾기', c.fav) : '')
    + c.courses.map(([k, n]) => pill(k, k === 'general' ? 'General' : k, n)).join('');
  const { shown, hidden } = findingsList(filter, favorites);
  const card = (e: Entry) => findingsCardHTML(e, favorites.includes(e.key));
  const list = `<div class="findings-stack"><div class="findings-col">${shown.map(card).join('')}</div></div>`
    + (hidden.length ? `<section class="findings-hidden"><p class="findings-hidden-label">숨긴 박스 ${hidden.length}</p><div class="findings-stack"><div class="findings-col">${hidden.map(card).join('')}</div></div></section>` : '');
  return `<div class="view view-findings" id="view-findings" style="${style}">
    <section>
      <header class="journal-head"><h1 class="journal-heading">Findings</h1></header>
      <p class="field-hint findings-hint">저널의 Finding 중 과목 태그를 단 내용만 과목별로 모아 보여줘요. 1. 2. 처럼 번호를 달면 번호마다 박스가 나뉘고, 별표한 박스는 앞으로 와요.</p>
      <nav class="fi-filters findings-filters">${filters}</nav>
      <div class="fi-list findings-list" style="${listStyle}">${list}</div>
    </section>
  </div>`;
}
