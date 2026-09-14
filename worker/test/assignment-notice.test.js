// Parsing of pasted Discord 과제 공지 (design/prototypes/assignment-notice.js).
// Fixtures keep the exact shape of three real notices (line breaks lost by Discord copy,
// ■ sections, nested "* " lists); instructor names and outside links are replaced.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseNotice, renderNotice, dueLabel, dueLabelWithDow } = require('../../design/prototypes/assignment-notice.js');

const NOTICE_1 = `안녕하세요, 강사A입니다. 0주차 과제 수행하시느라 애 많이 쓰셨습니다. 제게도 소셜 미디어 외에 틈틈이 가꾸는 온라인 공간이 있습니다. 한번 참고해보시면 좋겠습니다. 참고로 강사A는... https://example.com/a 사이트B https://example.com/b 사이트C https://example.com/c 사이트D http://example.com/d 1주차 과제 안내드립니다. ■ 과제 [자기소개] 자문자답 인터뷰 ■ 산출물

* 자신이 하고 싶은 말을 꺼내주는 셀프 질문 5개를 만들고, 그에 답하는 인터뷰 글을 작성합니다. 답변이 먼저 나오고, 그에 적절한 질문을 나중에 붙여도 되고요. (참고: https://example.com/faq)
* 버전 로그

 ■ 마감 마감기한: 9/20(일) 23:59 평일 마감인 과제가 많아서 주말까지로 마감기한을 수정합니다. 다만 수업이 있는 주는 목요일 마감이니 참고해주세요. ■ 제출 방법 아래 과제 제출폼으로 제출해주세요. https://go.phi.design/si/assignment 감사합니다!
`;

const NOTICE_2 = `안녕하세요, Typography as Foundation 강사B입니다. 1주 과제를 안내드립니다. 과제 

* Typography as Foundation: Typesetting Guidelines(https://docs.example.com/guidelines#heading) 를 따라 아래 과제를 진행하고 리포트를 작성해주세요.
   * ① 게슈탈트 심리학과 그래픽디자인의 접점에 대해 '핵심만 간추려' 조사하세요.
      * ② 콤핑1을 라운드2까지 진행하세요. (라운드3은 수업시간에 진행합니다)
         * 폰트: 본고딕 Regular
            * 말뭉치: 콤핑1 말뭉치

 마감 

* 마감 기한: 9/15(화) 23:59
* 지각 마감 기한: 9/16(수) 23:59
   * 지각 마감 기한 이후에는 제출할 수 없습니다.

 제출 방법 

* https://forms.example.com/tf-week1

 수행 시 참고사항 

* 콤핑 세팅(https://sheets.example.com/comping) 에 '날짜, 시간', '메모'셀을 추가해두었어요.
* 어도비 인디자인 관련 어려운 점이 있으면, 사소한 것이라도 모두 기록해두세요. 한 번에 QnA를 진행할게요.
`;

const NOTICE_3 = `안녕하세요, 강사C입니다. 첫 수업 때, 적극적으로 질문도 많이 해주시고 참여해 주셔서 감사합니다. 같이 나눌 수 있는 것들 많이 준비해서 또 만나겠습니다. 소통하면서 재미있게 같이 작업해 봅시다! 1주차 과제 안내드립니다. ■ 과제 원하는 컷에 대한 촬영 기획안을 짜보고, 직접 시도해 보셨으면 합니다. 완성해야 한다는 무거운 마음보다는, 주변을 관찰하고 이미지를 담는 것부터 시작해보세요. 아이디어가 잘 정리되지 않을 때도 시도해 보면서 조금씩 잡아가면 좋을 것 같습니다. 과정으로 공유해주셔도 좋습니다. ■ 산출물

* 1차 촬영 결과물 1~10컷
* 촬영 전 작성한, 촬영 기획안
* 촬영 후 작성한, 촬영(관찰) 일지 : 발견한 것, 어려웠던 것, 더 시도해 볼 것 세 가지를 포함해서 작성해주세요. (느낀 점을 자유롭게 남겨도 좋습니다.) A4 1장 분량 내외

 ■ 마감 마감 기한: 9/15(화) 23:59 지각 마감 기한: 9/16(수) 23:59 *지각 마감 기한 이후에는 제출할 수 없습니다. ■ 제출 방법 http://go.phi.design/vt/assignment ■ 수행 시 참고사항 촬영 전 반드시 확인하세요. 최종 출력을 위해 카메라나 휴대폰을 최고 화질(최대 해상도)로 설정한 후 촬영해 주시기 바랍니다.
`;

test('notice 1: deadline, no late deadline, week 1 (not the earlier "0주차 과제"), SI from the link, title', () => {
  assert.deepEqual(parseNotice(NOTICE_1), {
    dueAt: '2026-09-20T23:59', lateDueAt: null, weekdayMismatch: false, week: 1, course: 'SI', title: '[자기소개] 자문자답 인터뷰',
  });
});

test('notice 2: "마감 기한" vs "지각 마감 기한" kept apart, "1주 과제", TF from the course name, title without the link', () => {
  const r = parseNotice(NOTICE_2);
  assert.equal(r.dueAt, '2026-09-15T23:59');
  assert.equal(r.lateDueAt, '2026-09-16T23:59');
  assert.equal(r.week, 1);
  assert.equal(r.course, 'TF');
  assert.equal(r.weekdayMismatch, false);
  assert.match(r.title, /^Typography as Foundation: Typesetting Guidelines/);
  assert.equal(r.title.includes('http'), false);
});

test('notice 3: both deadlines on one line, VT from the link, title = first sentence', () => {
  const r = parseNotice(NOTICE_3);
  assert.deepEqual([r.dueAt, r.lateDueAt, r.week, r.course], ['2026-09-15T23:59', '2026-09-16T23:59', 1, 'VT']);
  assert.equal(r.title, '원하는 컷에 대한 촬영 기획안을 짜보고, 직접 시도해 보셨으면 합니다.');
});

test('a sentence about a weekday without a date is not a deadline; no date at all → no badge', () => {
  const r = parseNotice('다만 수업이 있는 주는 목요일 마감이니 참고해주세요. 2주차 과제 안내드립니다.');
  assert.deepEqual([r.dueAt, r.lateDueAt, r.week, r.course, r.title], [null, null, 2, null, null]);
});

test('year, missing time and a weekday that does not match are handled', () => {
  assert.equal(parseNotice('마감 기한: 1/5(화) 18:00').dueAt, '2027-01-05T18:00'); // January belongs to 2027 in this cohort
  assert.equal(parseNotice('마감기한 : 10/3').dueAt, '2026-10-03T23:59');
  assert.equal(parseNotice('마감 기한: 9/15(수) 23:59').weekdayMismatch, true); // 2026-09-15 is a Tuesday
  assert.equal(parseNotice('마감 기한: 2/30 23:59').dueAt, null);
});

test('the tidied view: sections as headings, nested lists, links, nothing unescaped', () => {
  const html = renderNotice(NOTICE_3);
  assert.match(html, /<h4 class="am-note-section">과제<\/h4><p>원하는 컷에/);
  assert.match(html, /<h4 class="am-note-section">마감<\/h4><p>마감 기한: 9\/15/);
  assert.match(html, /<a href="http:\/\/go\.phi\.design\/vt\/assignment" target="_blank" rel="noopener">/);
  const nested = renderNotice(NOTICE_2);
  assert.match(nested, /<ul class="am-note-list"><li>Typography as Foundation[^<]*<a href="https:\/\/docs\.example\.com\/guidelines#heading"/);
  assert.match(nested, /<ul class="am-note-list"><li>① 게슈탈트/); // one level deeper
  assert.equal(renderNotice('<img src=x onerror=alert(1)> ■ 과제 <b>x</b>').includes('<img'), false);
});

test('labels match Future Item\'s due badge wording', () => {
  assert.equal(dueLabel('2026-09-20T23:59'), '9월 20일 23:59');
  assert.equal(dueLabelWithDow('2026-09-15T23:59'), '9월 15일(화) 23:59');
});
