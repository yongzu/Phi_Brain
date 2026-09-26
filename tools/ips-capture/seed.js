// 가상 데이터 — IPS 페이지 Deliver 캡처용. 실제 저널이 아니다.
// tools/ips-capture/capture.js가 프로토타입(design/prototypes/home.html)을 연 브라우저에 이 값을 넣고 화면을 찍는다.
(() => {
  const FOUR_F = { Fact: 'fact', Feeling: 'feeling', Finding: 'finding', 'Future Item': 'future' };
  const courseName = { BI: 'Beautiful Interface', IPS: 'Iterative Problem Solving', TF: 'Typography as Foundation' };
  const h = (f) => `<h3 data-guide="${FOUR_F[f]}">${f}</h3>`;
  const box = (code) => `<div class="course-box" contenteditable="false" data-course="${code}"><button type="button" class="cb-btn" aria-haspopup="listbox"><span><span class="nav-code">${code}</span>_${courseName[code]}</span><span class="caret" aria-hidden="true">▾</span></button></div>`;
  const p = (t) => `<p>${t}</p>`;
  const at = (d, hh) => new Date(`${d}T${hh}:00+09:00`).getTime();

  const journals = {
    '2026-09-21': {
      title: '위계와 자간',
      courses: ['BI', 'TF'],
      html: h('Fact') + box('BI') + p('카드 UI의 위계를 색 없이 투명도와 크기만으로 나누는 실습을 했다.') + box('TF') + p('본문 서체의 자간을 −0.02em씩 바꿔 가며 비교했다.')
        + h('Feeling') + p('색을 빼니 오히려 정보의 순서가 또렷해져서 놀랐다.')
        + h('Finding') + box('BI') + p('1. <mark>위계는 색보다 투명도와 크기로 먼저 만든다.</mark>') + p('2. 강조가 두 개 이상이면 <b>아무것도 강조되지 않는다.</b>')
        + box('TF') + p('1. 한글 본문은 <mark data-hl="blue">자간을 조금 좁힐 때 덩어리로 읽힌다.</mark>')
        + h('Future Item') + box('BI') + p('포트폴리오 카드의 색을 두 가지로 줄여 보기') + box('TF') + p('본문 자간을 −0.02em으로 다시 조판하기'),
      savedAt: at('2026-09-21', '22:10'),
    },
    '2026-09-23': {
      title: '근거 없는 Why',
      courses: ['IPS', 'TF'],
      html: h('Fact') + box('IPS') + p('5 Whys로 문제의 근본 원인을 좁히는 연습을 했다.')
        + h('Feeling') + p('첫 번째 Why에서 해법을 말하고 싶어지는 걸 참기 어려웠다.')
        + h('Finding') + box('IPS') + p('1. <mark>Why마다 근거를 붙이지 못하면 그 단계는 추측이다.</mark>') + p('2. 문제 정의 문장에 <b>해법이 들어가면</b> 원인을 더 파지 않게 된다.')
        + box('TF') + p('1. 행간이 좁으면 <b>문단의 경계</b>가 흐려진다.')
        + h('Future Item') + box('IPS') + p('5 Whys 각 단계에 근거 출처 달기'),
      savedAt: at('2026-09-23', '21:40'),
    },
    '2026-09-24': {
      title: '크기 대비',
      courses: ['TF'],
      html: h('Fact') + box('TF') + p('제목과 본문의 크기 대비를 1.5배와 2배로 나눠 비교했다.')
        + h('Feeling') + p('2배 쪽이 덜 친절해 보였지만 훨씬 빨리 읽혔다.')
        + h('Finding') + box('TF') + p('1. <mark>크기 대비가 클수록 첫 시선이 빠르게 정해진다.</mark>')
        + h('Future Item') + box('TF') + p('섹션 제목과 본문의 크기 대비를 2배로 맞추기'),
      savedAt: at('2026-09-24', '23:05'),
    },
  };

  let n = 0;
  const item = (text, courseId, date, created, done) => ({
    id: `fi-demo-${++n}`, text, scope: 'course', courseId, customId: null,
    done: !!done, doneAt: done ? at(done, '20:00') : null, dueAt: null,
    createdAt: at(date, created), placedAt: at(date, created), updatedAt: at(date, created),
    source: { journalDate: date, text },
  });
  const future = {
    v: 2,
    items: [
      item('포트폴리오 카드의 색을 두 가지로 줄여 보기', 'BI', '2026-09-21', '22:11', '2026-09-22'),
      item('본문 자간을 −0.02em으로 다시 조판하기', 'TF', '2026-09-21', '22:12'),
      item('5 Whys 각 단계에 근거 출처 달기', 'IPS', '2026-09-23', '21:41'),
      item('섹션 제목과 본문의 크기 대비를 2배로 맞추기', 'TF', '2026-09-24', '23:06'),
    ],
    favorites: [], customBoxes: [], boxOrder: [],
  };

  // 별표한 Findings 박스 (키 = 날짜::과목::그 날 그 과목의 순서)
  const findingsFavorites = ['2026-09-21::BI::0', '2026-09-23::IPS::0'];

  window.__IPS_SEED__ = { journals, future, findingsFavorites };
})();
