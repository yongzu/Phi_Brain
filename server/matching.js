// Rule-based matching of a Gmail "Forms receipt" email to a submission target.
// Pure function, no I/O — this is what section 9's verification is written against.
'use strict';

const FORMS_SENDER = 'forms-receipts-noreply@google.com';

// Only these (course, kind) pairs have had their actual email/field structure
// checked against a real sample. Everything else — including every course's
// self-feedback format — is unverified, so a parse that "looks" successful
// still goes to the review queue instead of auto-confirming (spec §6, §9).
const VERIFIED_FORMATS = new Set(['ewa:assignment']);

const EXAMPLE_MARKERS = ['예:', '(예', '예시', '예)'];
const isExampleLine = line => EXAMPLE_MARKERS.some(m => line.includes(m));

function findCourseByBracketText(bracketText, courses) {
  const needle = bracketText.trim().toLowerCase();
  for (const c of courses) {
    if (c.name.trim().toLowerCase() === needle) return c;
    if (c.code && c.code.trim().toLowerCase() === needle) return c;
    const aliases = JSON.parse(c.aliases || '[]');
    if (aliases.some(a => a.toLowerCase() === needle)) return c;
  }
  return null;
}

function extractKind(text) {
  if (/셀프\s*피드백/.test(text)) return 'self_feedback';
  if (/과제/.test(text)) return 'assignment';
  return null;
}

// first non-example "N주차" in the body — spec: go by the body's stated week,
// never the mail's received date, and never mistake an instructional example
// ("(예: 0주차)") for the actual answer.
function extractWeekNo(bodyText) {
  const lines = bodyText.split('\n');
  for (const line of lines) {
    if (isExampleLine(line)) continue;
    const m = line.match(/(\d+)\s*주차/);
    if (m) return Number(m[1]);
  }
  return null;
}

function extractTrack(bodyText) {
  const lines = bodyText.split('\n');
  for (const line of lines) {
    if (isExampleLine(line)) continue;
    const m = line.match(/트랙\s*[:\-]?\s*([A-Za-z0-9가-힣]+)/);
    if (m) return m[1];
  }
  return null;
}

// EWA's verified answer labels only — a field that isn't present in the body
// is simply omitted from the result (spec §7: don't show a link a course
// doesn't have).
const EWA_LINK_LABELS = [
  ['workingArtifact', '작동하는 작업'],
  ['tilReport', 'TIL 리포트'],
  ['aiConversation', 'AI 대화'],
];
function extractLinks(bodyText) {
  const links = {};
  // Google Forms receipts list "질문: <label>" then "답변: <value>" on the
  // next line — split into question blocks so the label and its answer
  // don't have to be on the same line.
  const blocks = bodyText.split(/(?=질문\s*:)/);
  for (const [key, label] of EWA_LINK_LABELS) {
    const block = blocks.find(b => b.includes(label));
    if (!block) continue;
    const m = block.match(/(https?:\/\/\S+)/);
    if (m) links[key] = m[1];
  }
  return links;
}

/**
 * @param {{from:string, subject:string, receivedAt:string, bodyText:string, messageId:string, threadId?:string}} email
 * @param {{courses: Array<{id:string,name:string,aliases:string}>, semesterStart:string, semesterEnd:string}} ctx
 * @returns {{status:'unrelated'}|{status:'ambiguous',reason:string}|{status:'matched',courseId:string,kind:string,weekNo:number,track:string|null,links:object}}
 */
function matchEmail(email, ctx) {
  if (!email.from || !email.from.toLowerCase().includes(FORMS_SENDER)) {
    return { status: 'unrelated' };
  }

  const receivedAt = email.receivedAt.slice(0, 10);
  if (receivedAt < ctx.semesterStart || receivedAt > ctx.semesterEnd) {
    // A forms receipt outside this cohort's date range — most likely a
    // different semester's mail; never let it bleed into this one's weeks.
    return { status: 'unrelated' };
  }

  const bracketMatch = email.subject.match(/\[([^\]]+)\]/) || email.bodyText.match(/\[([^\]]+)\]\s*(?:과제|셀프\s*피드백)\s*제출/);
  if (!bracketMatch) return { status: 'ambiguous', reason: 'no_course_tag' };

  const course = findCourseByBracketText(bracketMatch[1], ctx.courses);
  if (!course) return { status: 'ambiguous', reason: 'unknown_course' };

  const kind = extractKind(email.subject) || extractKind(email.bodyText);
  if (!kind) return { status: 'ambiguous', reason: 'unknown_kind' };

  if (!VERIFIED_FORMATS.has(`${course.id}:${kind}`)) {
    return { status: 'ambiguous', reason: 'unverified_format' };
  }

  const weekNo = extractWeekNo(email.bodyText);
  if (weekNo === null) return { status: 'ambiguous', reason: 'no_week_found' };

  return {
    status: 'matched',
    courseId: course.id,
    kind,
    weekNo,
    track: extractTrack(email.bodyText),
    links: extractLinks(email.bodyText),
  };
}

module.exports = { matchEmail, VERIFIED_FORMATS, FORMS_SENDER };
