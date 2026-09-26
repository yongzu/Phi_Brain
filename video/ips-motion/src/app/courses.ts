// 앱과 같은 과목 목록(design/prototypes/future.js COURSES)
export const COURSES: [string, string][] = [
  ['AL', 'Aesthetic Literacy'], ['AOR', 'Art of Reading'], ['BI', 'Beautiful Interface'],
  ['EWA', 'Engaging with AI'], ['IAE', 'Interviewing as Exploration'], ['IPS', 'Iterative Problem Solving'],
  ['PC', 'Peer Coaching'], ['RW', 'Readable Writing'], ['SI', 'Self Introduction'],
  ['TF', 'Typography as Foundation'], ['VT', 'Visual Translation'], ['WI', 'What If'],
];
export const ALIASES: Record<string, string> = { EAI: 'EWA' };
export const JOURNAL_SCOPES: [string, string][] = [['general', 'General'], ...COURSES];
export const courseName = (code: string) => (code === 'general' ? 'General' : COURSES.find((c) => c[0] === code)?.[1] || '');
export const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
export const monthDay = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${m}월 ${d}일`; };
