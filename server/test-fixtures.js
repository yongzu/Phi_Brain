// Test fixtures shaped like real Google Forms receipts (structure taken from the
// user's actual 2026-09 receipts; name, student number and links are fake).
// A receipt lists each question as "Title *", its description, then the answer.
'use strict';

const receiptBody = ({ tag = 'Iterative Problem Solving', kind = '과제', week = '1주차', weekDescription, extra = '' } = {}) => `Google Forms


[${tag}] ${kind} 제출 양식을 작성해 주셔서 감사합니다
수신한 내용은 다음과 같습니다


[${tag}] ${kind} 제출

제출 전 각 섹션 상단의 안내를 읽어주세요.

이 양식을 제출했을 때 내 이메일 주소(student@example.com)가 기록되었습니다.


학번 *

본인 학번을 고르세요.


0000000 홍길동



트랙 *


a


b


주차 *

${weekDescription ?? '전문가가 디스코드에 공지한 주차를 고르세요. 제출한 산출물은 다음 수업\n보드에 올라갑니다.'}


${week}



0~11주차 산출물

파일은 반드시 for Learners 폴더 안에 만들어 주세요.
https://drive.google.com/drive/folders/example-folder

링크 항목 하나에는 파일 하나만 넣어 주세요.


1 Pager docs ver. *

1 Pager guideline을 복제하고 양식에 맞춰 작성한 구글독스 탭 링크를
입력해주세요.

- 탭명: [주차] 1 Pager


https://docs.google.com/document/d/example-doc


프로토타입 링크 *

프로토타입이 동작하는 모습이 녹화된 영상의 유튜브 링크를 입력해주세요.


https://www.youtube.com/watch?v=example
${extra}

나만의 Google Forms 만들기
`;

const receipt = ({ tag = 'Iterative Problem Solving', kind = '과제', ...bodyOpts } = {}, overrides = {}) => ({
  from: 'Google Forms <forms-receipts-noreply@google.com>',
  subject: `[${tag}] ${kind} 제출 양식을 작성해 주셔서 감사합니다`,
  receivedAt: '2026-09-13T14:47:38.000Z',
  bodyText: receiptBody({ tag, kind, ...bodyOpts }),
  messageId: 'msg-1',
  threadId: 'thread-1',
  ...overrides,
});

// the self-feedback form's week description mentions two other week numbers
// before the real answer — the case that broke the old "first N주차 line" parser
const SELF_FEEDBACK_WEEK_DESCRIPTION = 'Warm-up 기간에는 0주차를, 매주 수업이 끝난 뒤에는 그 주차를, 코스 말미에는\n16주차를 고르세요.';

module.exports = { receipt, receiptBody, SELF_FEEDBACK_WEEK_DESCRIPTION };
