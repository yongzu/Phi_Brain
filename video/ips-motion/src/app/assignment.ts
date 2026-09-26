// Assignment Manage — 앱(design/prototypes/assignment.js)과 같은 표 · 과제 내용 팝업을 실제 3주차 데이터로 그린다.
// 과제 공지 정리는 앱의 모듈(design/prototypes/assignment-notice.js)을 그대로 불러 쓴다.
import notice from '../../../../design/prototypes/assignment-notice.js';
import { esc } from './courses';
import { real, TODAY, type Note, type Target } from './real';

type Status = 'unconfirmed' | 'confirmed_mail' | 'confirmed_manual' | 'not_applicable' | 'conflict';
type Cell = { status: Status; confirmedAt: string | null };
type NoteView = { raw: string; dueAt: string | null; lateDueAt: string | null } | null;
export type Row = { courseId: string; code: string; name: string; note: NoteView; assignment: Cell; selfFeedback: Cell };

const STATUS_LABEL: Record<string, string> = { unconfirmed: '미확인', confirmed_mail: '제출 확인', confirmed_manual: '직접 확인', not_applicable: '해당 없음', conflict: '확인 필요' };
const resolveStatus = (manual: string | null, evidence: number): Status => {
  if (manual === 'not_applicable') return evidence > 0 ? 'conflict' : 'not_applicable';
  if (evidence > 0) return 'confirmed_mail';
  if (manual === 'confirmed_manual') return 'confirmed_manual';
  return 'unconfirmed';
};
const toNote = (n?: Note): NoteView => (n ? { raw: n.raw, dueAt: n.due_at, lateDueAt: n.late_due_at } : null);

/** 3주차 표 — 서버(getWeekMatrix)와 같은 규칙. confirmOverride: 영상에서 새로 확인된 칸 */
export function weekRows(confirm: string[] = []): Row[] {
  const byCourse = new Map<string, Row>();
  const course = (id: string) => real.courses.find((c) => c.id === id)!;
  [...real.targets].sort((a, b) => course(a.course_id).code.localeCompare(course(b.course_id).code)).forEach((t: Target) => {
    const c = course(t.course_id);
    if (!byCourse.has(c.id)) {
      byCourse.set(c.id, {
        courseId: c.id, code: c.code, name: c.name, note: toNote(real.notes.find((n) => n.course_id === c.id)),
        assignment: { status: 'unconfirmed', confirmedAt: null }, selfFeedback: { status: 'unconfirmed', confirmedAt: null },
      });
    }
    const key = `${c.id}:${t.kind}`;
    const cell = byCourse.get(c.id)![t.kind === 'assignment' ? 'assignment' : 'selfFeedback'];
    cell.status = confirm.includes(key) ? 'confirmed_mail' : resolveStatus(t.manual, t.evidence);
    cell.confirmedAt = confirm.includes(key) ? new Date(TODAY).toISOString() : t.first_at;
  });
  return [...byCourse.values()];
}

const kstMs = (at: string) => { const [d, t = '23:59'] = at.split('T'); const [y, m, dd] = d.split('-').map(Number); const [hh, mm] = t.split(':').map(Number); return Date.UTC(y, m - 1, dd, hh - 9, mm); };
function lateness(cell: Cell, note: NoteView) {
  if (cell.status !== 'confirmed_mail' || !cell.confirmedAt || !note?.dueAt) return null;
  const at = Date.parse(cell.confirmedAt);
  if (note.lateDueAt && at > kstMs(note.lateDueAt)) return 'missed';
  return at > kstMs(note.dueAt) ? 'late' : null;
}
const LATENESS_LABEL: Record<string, string> = { late: '지각 제출', missed: '미제출' };
const confirmedClass = (s: string) => (s === 'confirmed_mail' || s === 'confirmed_manual' ? ' is-confirmed' : '');

function cellHTML(cell: Cell, note: NoteView, id: string, style = '') {
  const late = lateness(cell, note);
  const shown = late === 'missed' ? 'unconfirmed' : cell.status;
  const label = (late && LATENESS_LABEL[late]) || STATUS_LABEL[cell.status] || cell.status;
  return `<td><span class="am-cell">
      <button type="button" class="am-status${confirmedClass(shown)}" data-cell="${id}" style="${style}"><span class="am-dot am-dot-${shown}" aria-hidden="true"></span><span>${label}</span></button>
      <a class="am-shortcut">↗</a>
    </span></td>`;
}
function dueBadge(note: NoteView, status: string) {
  if (!note?.dueAt) return '';
  const pastDue = TODAY > kstMs(note.dueAt);
  const late = pastDue && note.lateDueAt;
  const overdue = pastDue && (status === 'unconfirmed' || status === 'conflict');
  return `<span class="fi-due am-note-due${overdue ? ' is-overdue' : ''}">${late ? '지각 마감' : '마감'} ${notice.dueLabel(late ? note.lateDueAt : note.dueAt)}</span>`;
}

export type AmOpts = {
  confirm?: string[]; // 새로 확인된 칸 'ips:assignment'
  flash?: Record<string, number>; // 바뀐 칸 강조(영상 표시) 0→1→0
  refreshing?: boolean;
  detail?: '' | 'note' | 'expanded';
  menu?: boolean; // 팝업의 ⋯ 메뉴
  detailStyle?: string;
  style?: string;
};

export function assignmentViewHTML(o: AmOpts) {
  const rows = weekRows(o.confirm);
  const all = rows.flatMap((r) => [r.assignment.status, r.selfFeedback.status]);
  const missed = rows.reduce((n, r) => n + (lateness(r.assignment, r.note) === 'missed' ? 1 : 0) + (lateness(r.selfFeedback, r.note) === 'missed' ? 1 : 0), 0);
  const done = all.filter((s) => s === 'confirmed_mail' || s === 'confirmed_manual').length - missed;
  const total = all.filter((s) => s !== 'not_applicable').length;
  const flash = (id: string) => { const p = o.flash?.[id] || 0; return p > 0 ? `background:rgba(207,228,255,${p});` : ''; };
  const tbody = rows.map((r) => `<tr data-am-row="${r.code}:${real.week}">
        <td><span class="am-cell">
          <button type="button" class="fi-box-fav am-fav" aria-pressed="false"></button>
          <span class="am-course-name"><b>${esc(r.code)}</b>_${esc(r.name)}</span>
          <span class="am-week-tag">WK${String(real.week).padStart(2, '0')}</span>
          <a class="am-shortcut">↗</a>
        </span></td>
        ${cellHTML(r.assignment, r.note, `${r.courseId}:assignment`, flash(`${r.courseId}:assignment`))}
        <td><span class="am-note-cell"><button type="button" class="am-note-btn${r.note ? ' is-set' : ''}" data-note-course="${r.courseId}">자세히보기</button>${dueBadge(r.note, r.assignment.status)}</span></td>
        ${cellHTML(r.selfFeedback, r.note, `${r.courseId}:self_feedback`)}
      </tr>`).join('');
  const email = real.gmail?.email;
  return `<div class="view view-assignment" id="view-assignment" style="${o.style || ''}">
    <section>
      <header class="journal-head"><h1 class="journal-heading">Assignment Manage</h1></header>
      <div class="am-toolbar">
        <div class="am-week-nav"><button type="button" class="pill">‹</button><span class="am-week-label">${real.week}주차</span><button type="button" class="pill">›</button></div>
        <div class="am-status-line">
          <span class="am-gmail-status">${email ? `Gmail 연결됨 · ${esc(email)}` : 'Gmail 연결됨'}</span>
          <button type="button" class="pill" id="am-refresh"${o.refreshing ? ' disabled' : ''}>${o.refreshing ? '새로고침 중…' : '제출 상태 새로고침'}</button>
        </div>
      </div>
      <p class="am-progress">완료 ${done} / ${total}</p>
      <table class="am-table"><thead><tr><th>Course(Figma)</th><th>Assignment</th><th>과제 내용</th><th>Self-Feedback</th></tr></thead><tbody>${tbody}</tbody></table>
    </section>
    ${o.detail ? noteDetailHTML('ips', o) : ''}
  </div>`;
}

/** 과제 내용 팝업(보기 상태) — 칸 옆 작은 팝업 / 전체보기 */
function noteDetailHTML(courseId: string, o: AmOpts) {
  const row = weekRows(o.confirm).find((r) => r.courseId === courseId)!;
  const n = row.note!;
  const dues = [
    n.dueAt ? `<span class="fi-due">마감 ${notice.dueLabelWithDow(n.dueAt)}</span>` : '',
    n.lateDueAt ? `<span class="fi-due">지각 마감 ${notice.dueLabelWithDow(n.lateDueAt)}</span>` : '',
  ].join('');
  const expanded = o.detail === 'expanded';
  const menu = o.menu ? `<div class="am-note-menu" role="menu">
      <button type="button" class="cm-item" data-note-act="expand">${expanded ? '작게 보기' : '전체보기'}</button>
      <div class="cm-sep" role="separator"></div>
      <button type="button" class="cm-item">수정하기</button>
      <button type="button" class="cm-item">삭제하기</button></div>` : '';
  return `<div class="am-detail is-note${expanded ? ' is-expanded' : ''}" id="am-detail" role="dialog" style="${o.detailStyle || ''}">
      <button type="button" class="am-detail-close" data-note-act="close">✕</button>
      <div class="am-note-head">
        <h2 class="am-detail-title">${esc(row.code)}_${esc(row.name)} · ${real.week}주차 · 과제 내용</h2>
        <span class="am-note-more"><button type="button" class="pill pill-icon" data-note-act="menu" aria-expanded="${!!o.menu}">⋯</button>${menu}</span>
      </div>
      ${dues ? `<p class="am-note-dues">${dues}</p>` : ''}
      <div class="am-note-body">${notice.renderNotice(n.raw)}</div>
      <div class="am-note-append">
        <textarea class="am-note-append-input" rows="2" placeholder="추가된 과제 내용을 붙여넣어 주세요"></textarea>
        <button type="button" class="btn-primary" data-note-act="append" disabled>추가</button>
      </div>
    </div>`;
}

/** 앱의 placeDetail — 작은 팝업은 "자세히보기" 칸 아래(넘치면 위), 전체보기는 화면 가운데. vw·vh = 앱 화면 크기 */
export function placeNoteDetail(root: ParentNode, vw: number, vh: number) {
  const detail = root.querySelector<HTMLElement>('#am-detail');
  if (!detail) return;
  if (detail.classList.contains('is-expanded')) {
    detail.style.top = `${Math.max(0, (vh - detail.offsetHeight) / 2)}px`;
    detail.style.left = `${Math.max(0, (vw - detail.offsetWidth) / 2)}px`;
    return;
  }
  const anchor = root.querySelector<HTMLElement>('[data-note-course="ips"]');
  const host = (root as ShadowRoot).host as HTMLElement | undefined;
  if (!anchor || !host) return;
  const base = host.getBoundingClientRect();
  const r = anchor.getBoundingClientRect();
  const sc = base.width / vw || 1;
  const top0 = (r.top - base.top) / sc, bottom0 = (r.bottom - base.top) / sc, left0 = (r.left - base.left) / sc;
  const gap = 6, edge = 16, w = detail.offsetWidth, h = detail.offsetHeight;
  let top = bottom0 + gap;
  if (top + h > vh - edge && top0 - gap - h >= edge) top = top0 - gap - h;
  top = Math.max(edge, Math.min(top, vh - edge - h));
  detail.style.top = `${top}px`;
  detail.style.left = `${Math.max(edge, Math.min(left0, vw - edge - w))}px`;
}
