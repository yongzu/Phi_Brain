/*
  Assignment notice parsing (사용자 요구사항 2026-09-14): a Discord 과제 공지 pasted as-is →
  deadline, late deadline, week, course, title, and a tidied view of the text.
  Pure functions, no DOM — loaded by home.html (window.PhiAssignmentNotice) and by
  worker/test/assignment-notice.test.js (module.exports).

  Built from three real notices. Copying from Discord drops some line breaks, so
  "■ 과제 … ■ 산출물 …" can arrive on one line; sections are recognized either by
  a ■ mark or by a known section name standing alone on its line.
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PhiAssignmentNotice = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const COURSES = [
    ['AL', 'Aesthetic Literacy'], ['AOR', 'Art of Reading'], ['BI', 'Beautiful Interface'],
    ['EWA', 'Engaging with AI'], ['IAE', 'Interviewing as Exploration'], ['IPS', 'Iterative Problem Solving'],
    ['PC', 'Peer Coaching'], ['RW', 'Readable Writing'], ['SI', 'Self Introduction'],
    ['TF', 'Typography as Foundation'], ['VT', 'Visual Translation'], ['WI', 'What If'],
  ];
  const SECTION_NAMES = ['과제', '산출물', '마감', '제출 방법', '수행 시 참고사항'];
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const pad = n => String(n).padStart(2, '0');

  // this cohort runs 2026-08 … 2027-02: a month from August on is 2026, earlier months 2027
  const yearFor = month => (month >= 8 ? 2026 : 2027);

  // "9/20(일) 23:59" right after a label → "2026-09-20T23:59" (+ whether the written weekday agrees)
  const DATE_AFTER = String.raw`\s*[:：]?\s*(\d{1,2})\s*/\s*(\d{1,2})\s*(?:\(\s*([월화수목금토일])\s*\))?\s*(?:(\d{1,2})\s*:\s*(\d{2}))?`;
  const DUE_RE = new RegExp(String.raw`(?<!지각\s*)마감\s*기한` + DATE_AFTER);
  const LATE_RE = new RegExp(String.raw`지각\s*마감\s*기한` + DATE_AFTER);
  function toDue(m) {
    if (!m) return null;
    const month = Number(m[1]), day = Number(m[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const year = yearFor(month);
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1) return null; // 2/30 and the like
    const hh = m[4] != null ? Number(m[4]) : 23, mm = m[5] != null ? Number(m[5]) : 59; // no time → 23:59
    if (hh > 23 || mm > 59) return null;
    return {
      at: `${year}-${pad(month)}-${pad(day)}T${pad(hh)}:${pad(mm)}`,
      weekdayMismatch: !!m[3] && DOW[date.getDay()] !== m[3],
    };
  }

  // "N주차 과제" / "N주 과제": the one next to "안내" wins ("0주차 과제 수행하시느라…" is not the announcement)
  function findWeek(text) {
    const hits = [...text.matchAll(/(\d{1,2})\s*주\s*(?:차)?\s*과제/g)];
    if (!hits.length) return null;
    const nearNotice = hits.find(h => {
      const from = Math.max(0, h.index - 20), to = h.index + h[0].length + 20;
      return text.slice(from, to).includes('안내');
    });
    const week = Number((nearNotice || hits[hits.length - 1])[1]);
    return week >= 0 && week <= 16 ? week : null;
  }

  // the submission link says it (go.phi.design/si/assignment); otherwise a course's full name in the text
  function findCourse(text) {
    const link = text.match(/go\.phi\.design\/([a-z]{2,4})\//i);
    if (link) {
      const code = link[1].toUpperCase();
      if (COURSES.some(c => c[0] === code)) return code;
    }
    const lower = text.toLowerCase();
    const named = COURSES.find(([, name]) => lower.includes(name.toLowerCase()));
    return named ? named[0] : null;
  }

  // ---- sections ----
  // Break the text into lines where Discord lost them: before every ■, and around a ■ section name.
  function normalizeLines(raw) {
    const text = String(raw || '').replace(/\r\n?/g, '\n');
    const names = SECTION_NAMES.map(n => n.replace(/ /g, '\\s*')).join('|');
    return text
      .replace(/\s*■\s*/g, '\n■ ')
      .replace(new RegExp(String.raw`^■ (${names})\s+(?=\S)`, 'gm'), '■ $1\n')
      // "…안내드립니다. 과제⏎" — a section name left at the end of the greeting line
      .replace(new RegExp(String.raw`([.!?])\s+(${names})[ \t]*$`, 'gm'), '$1\n$2')
      .split('\n');
  }
  const sectionName = line => {
    const t = line.trim().replace(/^■\s*/, '').replace(/\s+/g, ' ');
    return SECTION_NAMES.includes(t) ? t : null;
  };

  // → [{ name|null, lines: [...] }] — text before the first section has name null
  function sections(raw) {
    const out = [{ name: null, lines: [] }];
    for (const line of normalizeLines(raw)) {
      const name = sectionName(line);
      if (name) out.push({ name, lines: [] });
      else out[out.length - 1].lines.push(line);
    }
    return out;
  }

  // title = the 과제 section's first list line or first sentence, links in parentheses dropped
  function findTitle(raw) {
    const task = sections(raw).find(s => s.name === '과제');
    if (!task) return null;
    const lines = task.lines.map(l => l.trim()).filter(Boolean);
    if (!lines.length) return null;
    let first = lines[0].replace(/^[*•-]\s+/, '');
    first = first.replace(/\(\s*https?:\/\/[^)\s]+\s*\)/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
    const sentence = first.match(/^.*?(?:[.!?](?=\s|$)|다\.(?=\s|$))/);
    return (sentence ? sentence[0] : first).trim() || null;
  }

  function parseNotice(raw) {
    const text = String(raw || '');
    const due = toDue(text.match(DUE_RE));
    const late = toDue(text.match(LATE_RE));
    return {
      dueAt: due ? due.at : null,
      lateDueAt: late ? late.at : null,
      weekdayMismatch: !!(due?.weekdayMismatch || late?.weekdayMismatch),
      week: findWeek(text),
      course: findCourse(text),
      title: findTitle(text),
    };
  }

  // ---- tidied view (HTML string, everything escaped; links open in a new tab) ----
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const linkify = s => esc(s).replace(/https?:\/\/[^\s<>"()]+/g, url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
  function renderNotice(raw) {
    let html = '', depth = -1;
    const closeLists = to => { while (depth > to) { html += '</ul>'; depth--; } };
    for (const line of normalizeLines(raw)) {
      const name = sectionName(line);
      if (name) { closeLists(-1); html += `<h4 class="am-note-section">${esc(name)}</h4>`; continue; }
      const bullet = line.match(/^(\s*)[*•-]\s+(.*)$/);
      if (bullet) {
        const level = Math.floor(bullet[1].replace(/\t/g, '   ').length / 3);
        while (depth < level) { html += '<ul class="am-note-list">'; depth++; }
        closeLists(level);
        html += `<li>${linkify(bullet[2].trim())}</li>`;
        continue;
      }
      closeLists(-1);
      if (line.trim()) html += `<p>${linkify(line.trim())}</p>`;
    }
    closeLists(-1);
    return html;
  }

  // "2026-09-20T23:59" → "9월 20일 23:59" (same wording as Future Item's due badge)
  const dueLabel = at => {
    if (!at) return '';
    const [d, t] = at.split('T');
    const [, m, day] = d.split('-').map(Number);
    return `${m}월 ${day}일${t ? ` ${t.slice(0, 5)}` : ''}`;
  };
  const dueLabelWithDow = at => {
    if (!at) return '';
    const [y, m, d] = at.slice(0, 10).split('-').map(Number);
    return `${m}월 ${d}일(${DOW[new Date(y, m - 1, d).getDay()]})${at.length > 10 ? ` ${at.slice(11, 16)}` : ''}`;
  };

  return { parseNotice, renderNotice, dueLabel, dueLabelWithDow, findTitle, findWeek, findCourse, MAX_LENGTH: 20000 };
});
