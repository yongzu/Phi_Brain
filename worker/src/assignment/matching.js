// Rule-based matching of a Gmail "Forms receipt" email to a submission target.
// Pure function, no I/O. ESM port of server/matching.js (M1 rules, 2026-09-14) —
// the reasoning behind each rule is documented there and in docs/STATUS.md "M1".
//   subject: "[<course name or code>] 과제|셀프피드백 제출 양식을 작성해 주셔서 감사합니다"

export const FORMS_SENDER = 'forms-receipts-noreply@google.com';

// "[Self-Introduction]" vs the registered "Self Introduction"
export const normalize = s => s.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

function findCourse(tag, courses) {
  const needle = normalize(tag);
  if (!needle) return null;
  return courses.find(c =>
    normalize(c.name) === needle
    || (c.code && normalize(c.code) === needle)
    || JSON.parse(c.aliases || '[]').some(a => normalize(a) === needle)) || null;
}

// a bracketed form that isn't a 과제/셀프피드백 submission ("[Phi] … 환급 계좌") is unrelated
const TITLE_RE = /^\s*\[([^\]]+)\]\s*(과제|셀프\s*피드백)\s*제출/;
function parseTitle(email) {
  const m = email.subject.match(TITLE_RE)
    || email.bodyText.split(/\r?\n/).map(l => l.match(TITLE_RE)).find(Boolean);
  if (!m) return null;
  return { tag: m[1], kind: /셀프/.test(m[2]) ? 'self_feedback' : 'assignment' };
}

const EXAMPLE_MARKERS = ['예:', '(예', '예시', '예)'];
const isExampleLine = line => EXAMPLE_MARKERS.some(m => line.includes(m));

// the answer to "주차 *" — only a line that is *just* a week ("2주차", "Image 0주차"),
// never a number inside the question's description
const WEEK_ANSWER_RE = /^(?:[A-Za-z가-힣][A-Za-z가-힣 ]{0,20}\s)?(\d{1,2})\s*주차$/;
export function extractWeekNo(bodyText) {
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

// submitted links keyed by question title; a URL counts only when it is the block's last line
const QUESTION_RE = /^(.+?)\s\*$/;
const URL_LINE_RE = /^https?:\/\/\S+$/;
export function extractLinks(bodyText) {
  const links = {};
  let title = null, lastLine = '';
  const flush = () => { if (title && URL_LINE_RE.test(lastLine) && !(title in links)) links[title] = lastLine; };
  for (const raw of bodyText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('나만의 Google Forms')) break; // receipt footer
    const q = line.match(QUESTION_RE);
    if (q) { flush(); title = q[1]; lastLine = ''; continue; }
    lastLine = line;
  }
  flush();
  delete links['학번']; delete links['트랙']; delete links['주차'];
  return links;
}

/**
 * @returns {{status:'unrelated'}|{status:'ambiguous',reason:string}|{status:'matched',courseId:string,kind:string,weekNo:number,track:null,links:object}}
 */
export function matchEmail(email, ctx) {
  if (!email.from || !email.from.toLowerCase().includes(FORMS_SENDER)) return { status: 'unrelated' };

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
