// Rule-based matching of a Gmail "Forms receipt" email to a submission target.
// Pure function, no I/O.
//
// M1 (2026-09-14, checked against the user's 21 real receipts): every course's
// assignment and self-feedback form sends the same receipt shape —
//   subject: "[<course name or code>] 과제|셀프피드백 제출 양식을 작성해 주셔서 감사합니다"
// so the subject alone identifies course + kind for all courses (the user's
// call: "제목만 보고 판단"). The old per-course VERIFIED_FORMATS gate is gone.
// Self-feedback receipts are one course per email, so no multi-course body scan.
'use strict';

const FORMS_SENDER = 'forms-receipts-noreply@google.com';

// "[Self-Introduction]" vs the registered "Self Introduction": compare with
// case, spaces, hyphens and other punctuation stripped
const normalize = s => s.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

function findCourse(tag, courses) {
  const needle = normalize(tag);
  if (!needle) return null;
  return courses.find(c =>
    normalize(c.name) === needle
    || (c.code && normalize(c.code) === needle)
    || JSON.parse(c.aliases || '[]').some(a => normalize(a) === needle)) || null;
}

// "[AL] 과제 제출 …" / "[EWA] 셀프피드백 제출 …" — a bracketed Google Form that
// isn't a 과제/셀프피드백 submission (e.g. "[Phi] … 환급 계좌 정보 요청") has no
// match here and is treated as unrelated mail, not queued for review.
const TITLE_RE = /^\s*\[([^\]]+)\]\s*(과제|셀프\s*피드백)\s*제출/;
function parseTitle(email) {
  const m = email.subject.match(TITLE_RE)
    // same title is repeated as a line in the body — fallback if the subject was altered
    || email.bodyText.split(/\r?\n/).map(l => l.match(TITLE_RE)).find(Boolean);
  if (!m) return null;
  return { tag: m[1], kind: /셀프/.test(m[2]) ? 'self_feedback' : 'assignment' };
}

const EXAMPLE_MARKERS = ['예:', '(예', '예시', '예)'];
const isExampleLine = line => EXAMPLE_MARKERS.some(m => line.includes(m));

// The week is the answer to the form's "주차 *" question — the number the user
// picked, which is what the table is keyed by (user decision: form week
// numbers 0~16, not calendar dates). A receipt lays out a question as
//   주차 *  /  description…  /  answer
// and the description can itself mention weeks ("Warm-up 기간에는 0주차를, …
// 16주차를 고르세요"), so only a line that is *just* a week answer counts:
// "2주차", or a dropdown label + week like "Image 0주차" / "Typesetting 0주차".
const WEEK_ANSWER_RE = /^(?:[A-Za-z가-힣][A-Za-z가-힣 ]{0,20}\s)?(\d{1,2})\s*주차$/;
function extractWeekNo(bodyText) {
  const lines = bodyText.split(/\r?\n/).map(l => l.trim());
  const question = lines.findIndex(l => /^주차\s*\*?$/.test(l));
  const scan = question >= 0 ? lines.slice(question + 1) : lines;
  for (const line of scan) {
    if (isExampleLine(line)) continue;
    const m = line.match(WEEK_ANSWER_RE);
    if (m) return Number(m[1]);
  }
  return null;
}

// Submitted links, keyed by question title. A question block's answer is its
// last non-empty line; descriptions can contain URLs of their own (e.g. a
// "for Learners 폴더" link), so a URL only counts when it *is* that last line.
// Radio questions (트랙 a/b) list every option in the receipt with no mark on
// the chosen one, so track can't be read from the text and isn't extracted.
const QUESTION_RE = /^(.+?)\s\*$/;
const URL_LINE_RE = /^https?:\/\/\S+$/;
function extractLinks(bodyText) {
  const links = {};
  let title = null, lastLine = '';
  const flush = () => { if (title && URL_LINE_RE.test(lastLine) && !(title in links)) links[title] = lastLine; };
  for (const raw of bodyText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('나만의 Google Forms')) break; // receipt footer — the last answer ends here
    const q = line.match(QUESTION_RE);
    if (q) { flush(); title = q[1]; lastLine = ''; continue; }
    lastLine = line;
  }
  flush();
  delete links['학번']; delete links['트랙']; delete links['주차'];
  return links;
}

/**
 * @param {{from:string, subject:string, receivedAt:string, bodyText:string, messageId:string, threadId?:string}} email
 * @param {{courses: Array<{id:string,name:string,code:string,aliases:string}>, windowStart:string, windowEnd:string}} ctx
 * @returns {{status:'unrelated'}|{status:'ambiguous',reason:string}|{status:'matched',courseId:string,kind:string,weekNo:number,track:null,links:object}}
 */
function matchEmail(email, ctx) {
  if (!email.from || !email.from.toLowerCase().includes(FORMS_SENDER)) return { status: 'unrelated' };

  // dates only decide which mail belongs to this cohort at all — the week
  // itself always comes from the form answer, never the received date
  const receivedAt = email.receivedAt.slice(0, 10);
  if (receivedAt < ctx.windowStart || receivedAt > ctx.windowEnd) return { status: 'unrelated' };

  const title = parseTitle(email);
  if (!title) return { status: 'unrelated' };

  const course = findCourse(title.tag, ctx.courses);
  if (!course) return { status: 'ambiguous', reason: 'unknown_course' };

  const weekNo = extractWeekNo(email.bodyText);
  if (weekNo === null) return { status: 'ambiguous', reason: 'no_week_found' };

  return { status: 'matched', courseId: course.id, kind: title.kind, weekNo, track: null, links: extractLinks(email.bodyText) };
}

module.exports = { matchEmail, FORMS_SENDER, extractWeekNo, extractLinks, normalize };
