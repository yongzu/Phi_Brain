// Future Item — 앱(design/prototypes/future.js)과 같은 마크업 · 순서로 실제 보드를 그린다.
// 영상에서 바꿔 보여 주는 것: favorites(박스 별표), done(완료로 옮긴 항목), checking(체크 표시만 먼저).
import { COURSES, courseName, esc } from './courses';
import { real, TODAY, type FutureItem } from './real';

const SEMESTER_START_MS = new Date(2026, 8, 7).getTime(); // 2026-09-07 (앱과 같음)
const weekOf = (ms: number) => Math.max(1, Math.floor((ms - SEMESTER_START_MS) / 86400000 / 7) + 1);
const VIEW_WEEK = weekOf(TODAY);
const weekRangeLabel = (n: number) => {
  const md = (ms: number) => { const d = new Date(ms); return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };
  const start = SEMESTER_START_MS + (n - 1) * 7 * 86400000;
  return `Week ${String(n).padStart(2, '0')} (${md(start)}~${md(start + 6 * 86400000)})`;
};
const dueLabel = (iso: string) => { const [d, t] = iso.split('T'); const [, m, day] = d.split('-').map(Number); return `${m}월 ${day}일${t ? ` ${t.slice(0, 5)}` : ''}`; };

const S = real.future;
const BOX_KEYS = ['general', ...COURSES.map((c) => `course:${c[0]}`), ...S.customBoxes.map((b) => `custom:${b.id}`)];
const customName = (id: string) => S.customBoxes.find((b) => b.id === id)?.name || '';
const keyOf = (i: FutureItem) => (i.scope === 'course' ? `course:${i.courseId}` : i.scope === 'custom' ? `custom:${i.customId}` : i.scope);
const shortLabel = (key: string) => (key === 'general' ? 'General' : key === 'unassigned' ? '임시' : key.startsWith('custom:') ? customName(key.slice(7)) : key.slice(7));
const titleHTML = (key: string) => (key.startsWith('course:')
  ? `<span class="nav-code">${key.slice(7)}</span>_${courseName(key.slice(7))}`
  : `<span class="nav-code">${esc(shortLabel(key))}</span>`);
const gridOrder = () => {
  const valid = BOX_KEYS.filter((k) => k !== 'general');
  const ordered = S.boxOrder.filter((k) => valid.includes(k));
  return [...ordered, ...valid.filter((k) => !ordered.includes(k))];
};

export type FutureOpts = {
  favorites: string[];
  done?: Record<string, number>; // 영상에서 완료한 항목 id → 완료 시각(표시용)
  checking?: Record<string, number>; // 체크 표시 진행 0→1 (아직 목록에서 안 빠짐)
  style?: string;
};

/** 완료 표시를 반영한 항목 — 영상에서 완료한 항목은 done */
const itemsWith = (o: FutureOpts) => S.items.map((i) => (o.done?.[i.id] != null ? { ...i, done: true, doneAt: o.done[i.id] } : i));
const itemWeek = (i: FutureItem) => (i.done ? weekOf(i.doneAt || i.createdAt) : Math.max(weekOf(i.createdAt), VIEW_WEEK));

/** 박스 안 항목 — 앱처럼 최근에 놓인 것이 위(placedAt 내림차순) */
export function boxItems(key: string, o: FutureOpts) {
  const items = itemsWith(o).filter((i) => itemWeek(i) === VIEW_WEEK && keyOf(i) === key).sort((a, b) => b.placedAt - a.placedAt);
  return { open: items.filter((i) => !i.done), done: items.filter((i) => i.done) };
}

const rowHTML = (i: FutureItem, check = 0) => `
    <li class="fi-row${i.done ? ' is-done' : ''}" data-id="${i.id}" data-flip="row:${i.id}">
      <div class="fi-row-main">
        <input type="checkbox" class="fi-check"${i.done || check > 0.5 ? ' checked' : ''}>
        <span class="fi-num" aria-hidden="true"></span>
        ${i.html ? `<span class="fi-text fi-rich">${i.html}</span>` : `<span class="fi-text">${esc(i.text)}</span>`}
        <button type="button" class="pill pill-icon fi-delete">✕</button>
      </div>
      ${i.dueAt ? `<span class="fi-due">마감 ${dueLabel(i.dueAt)}</span>` : ''}
    </li>`;

function boxHTML(key: string, o: FutureOpts, forced = false) {
  const { open, done } = boxItems(key, o);
  const temp = key === 'unassigned';
  const inGrid = key !== 'unassigned' && key !== 'general';
  const isFav = o.favorites.includes(key);
  const empty = open.length ? '' : `<p class="fi-box-empty">${done.length ? '남은 항목이 없어요.' : temp ? '소속을 정하지 않은 항목이 여기에 모여요.' : '아직 없어요. 위에서 실행할 행동을 추가해 보세요.'}</p>`;
  return `
      <section class="fi-box${temp ? ' is-temp' : ''}" data-box="${key}" data-flip="box:${key}">
        <header class="fi-box-head">
          ${inGrid ? '<span class="fi-box-grip" aria-hidden="true">⠿</span>' : ''}
          ${inGrid ? `<button type="button" class="fi-box-fav fi-box-fav-lead${isFav ? ' is-fav' : ''}" data-box-fav="${key}" aria-pressed="${isFav}"></button>` : ''}
          <h2 class="fi-box-title">${titleHTML(key)}</h2>
          <span class="resume-count">${open.length}</span>
          ${inGrid && key.startsWith('custom:') ? '<button type="button" class="pill pill-icon fi-box-more">⋯</button>' : ''}
        </header>
        ${temp && (forced || open.length) ? '<p class="fi-box-hint">박스나 위 필터로 끌어다 놓아 자리를 정해 주세요.</p>' : ''}
        ${open.length ? `<ul class="fi-rows">${open.map((i) => rowHTML(i, o.checking?.[i.id] || 0)).join('')}</ul>` : empty}
        ${done.length ? `
          <details class="fi-done" data-done="${key}">
            <summary class="fi-done-summary">완료한 항목 <span class="resume-count">${done.length}</span><span class="caret" aria-hidden="true">▾</span></summary>
          </details>` : ''}
      </section>`;
}

const COMPOSER = () => {
  const opts: [string, string][] = [['unassigned', '미지정'], ['general', 'General'], ...COURSES.map(([c]) => [`course:${c}`, c] as [string, string]), ...S.customBoxes.map((b) => [`custom:${b.id}`, b.name] as [string, string])];
  const b = (fmt: string, inner: string) => `<button type="button" class="pill pill-icon" data-fmt="${fmt}" aria-pressed="false">${inner}</button>`;
  return `<form class="fi-composer">
    <div class="course-chips fi-scope-chips">${opts.map(([k, label]) => `<button type="button" class="pill" aria-pressed="${k === 'unassigned'}">${esc(label)}</button>`).join('')}</div>
    <div class="fi-due-row"><label class="fi-due-toggle"><input type="checkbox" class="fi-check"> 마감</label></div>
    <div class="editor-tools fi-tools">${b('bold', '<b>B</b>')}${b('italic', '<i>I</i>')}${b('underline', '<u>U</u>')}${b('strikeThrough', '<s>S</s>')}<span class="hl-group">${b('highlight', '<span class="ico-mark" aria-hidden="true"></span>')}<button type="button" class="pill hl-caret"><span class="caret" aria-hidden="true">▾</span></button></span><span class="tool-sep" aria-hidden="true"></span>${b('quote', '<span class="ico-quote" aria-hidden="true"></span>')}${b('code', '<span class="ico-code" aria-hidden="true">&lt;/&gt;</span>')}</div>
    <div class="fi-input fi-rich" data-placeholder="실행할 행동을 적어주세요"></div>
    <button type="submit" class="btn-primary fi-submit">추가</button>
  </form>`;
};

export function futureViewHTML(o: FutureOpts) {
  const items = itemsWith(o).filter((i) => itemWeek(i) === VIEW_WEEK);
  const openCount = (k: string) => items.filter((i) => !i.done && (k === 'all' || keyOf(i) === k)).length;
  const f = (k: string) => {
    const n = openCount(k);
    return `<button type="button" class="pill fi-filter" aria-pressed="${k === 'all'}">${k === 'all' ? 'All' : shortLabel(k)}${n ? `<span class="f-count" aria-hidden="true">${n}</span>` : ''}</button>`;
  };
  const filters = ['all', 'general', 'unassigned'].map(f).join('') + '<span class="tool-sep" aria-hidden="true"></span>' + BOX_KEYS.slice(1).map(f).join('');
  const order = gridOrder();
  const favs = order.filter((k) => o.favorites.includes(k));
  const rest = order.filter((k) => !o.favorites.includes(k));
  let list = '';
  if (favs.length) list += `<p class="fi-section-label" data-flip="label:fav">즐겨찾기</p>${favs.map((k) => boxHTML(k, o)).join('')}`;
  list += `${favs.length ? '<p class="fi-section-label" data-flip="label:rest">과목</p>' : ''}${rest.map((k) => boxHTML(k, o)).join('')}<button type="button" class="fi-box fi-box-add" data-flip="box:add">+ 박스 추가</button>`;
  return `<div class="view view-future" id="view-future" style="${o.style || ''}">
    <section>
      <header class="journal-head"><h1 class="journal-heading">Future Item</h1></header>
      <p class="field-hint future-hint">실행할 행동을 적고, 과목별로 나눠 실천하고, 완료로 옮겨요. 과제 제출 상태(Assignment Manage)와는 따로 관리돼요.</p>
      ${COMPOSER()}
      <div class="am-week-nav fi-week-nav"><button type="button" class="pill">‹</button><span class="am-week-label">${weekRangeLabel(VIEW_WEEK)}</span><button type="button" class="pill" disabled>›</button></div>
      <div id="fi-top-row-slot"><div class="fi-top-row">${boxHTML('general', o, true)}${boxHTML('unassigned', o, true)}</div></div>
      <div class="fi-toolbar"><nav class="fi-filters">${filters}</nav><div class="fi-sort"><button type="button" class="pill">정렬<span class="caret" aria-hidden="true">▾</span></button></div></div>
      <div class="fi-list" id="fi-list">${list}</div>
    </section>
  </div>`;
}

/** 완료 토스트 문구 — 앱의 doneSubject: 20자에서 줄이고 받침으로 을/를 */
export function doneToast(text: string) {
  const t = text.trim();
  const last = t.charCodeAt(t.length - 1);
  const shown = [...t].length > 20 ? `${[...t].slice(0, 20).join('')}…` : t;
  const josa = last >= 0xac00 && last <= 0xd7a3 ? ((last - 0xac00) % 28 ? '을' : '를') : '을(를)';
  return `${shown}${josa} 완료했어요`;
}

/** 열린 IPS · BI 항목(위에서부터) — 장면에서 1 · 2번을 고를 때 */
export const openItems = (key: string) => boxItems(key, { favorites: [] }).open;
