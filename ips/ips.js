// IPS · Discover — interactions ported from yongzu/BI:
// scroll reveal, auto-opening dropdown, left TOC with active marker,
// paper cards with hover preview, and a side panel with ←/→ stepping.

const PAPERS = [
  {
    group: 'A',
    title: '대학생의 e-포트폴리오 제작 경험',
    cite: '조성범·한송이 (2023) · 한국교육문제연구 41(3)',
    stat: '8명',
    statLabel: '심층 면담',
    claim: '정리하지 않으면 깨달음은 흐려진다',
    method: '충북 A대 e-포트폴리오 경진대회 참가 학생 8명을 1:1 심층 면담한 질적 연구',
    findings: [
      '정리해 두지 않은 공모전·동아리 활동은 시간이 지나 기억나지 않았다 (학생3)',
      '그 순간엔 크게 깨달았는데, 지금은 흐려져 허탈했다 (학생1)',
      '오랜 기간의 기록을 한곳에 모아 보니 자신의 변화와 장단점이 처음으로 보였다 (학생5)',
      '옛 기록을 다시 읽으며 놓쳤던 부분을 발견했다 (학생2)',
      '배움은 경험하는 순간이 아니라 시간이 지난 뒤 성찰할 때 일어난다 (Dewey, 1938 인용)',
    ],
    use: '기록을 남기는 것만으로는 부족하다. 흩어진 기록을 모아서 다시 볼 때 비로소 성찰과 배움이 일어난다.',
    caution: '우수 참가자 8명의 자발적 사례라 일반화에 한계가 있다 (저자 명시).',
    url: 'https://doi.org/10.22327/kei.2023.41.3.113',
  },
  {
    group: 'A',
    title: '학습성찰도구로서 e-포트폴리오 활성화를 위한 연구',
    cite: '강인애·유승현·강연경 (2011) · 한국콘텐츠학회논문지 11(2)',
    stat: '52.92%',
    statLabel: '과목 특성과 도구가 맞지 않음',
    claim: '과목에 맞지 않는 도구는 쓰기 어렵다',
    method: '경희대 학습 포트폴리오 참여 학생 설문 289명 + 성찰저널 240편 분석',
    findings: [
      '도움이 된 점 1위는 "학업에 대한 자기성찰 향상" 66.1%',
      '성찰저널 분석에서 학습조절능력 향상 54.17%',
      '성찰저널 작성자의 52.92%가 과목·전공 특성과 기능이 맞지 않아 어려웠다',
      '설문 응답자의 51.21%가 쉬운 편집(시스템 개선)을 요구했다',
      'Kolb의 학습 사이클에서 성찰은 학습의 핵심이지만, 현장은 성찰할 환경을 주지 못한다',
    ],
    use: '성찰 기록을 모으면 3명 중 2명이 자기성찰이 늘었다고 느낀다. 그러나 과목 특성에 맞지 않는 도구는 쓰기 어렵다.',
    caution: '2011년 연구이고 자기보고식 응답이다. 논문 1과 함께 쓴다.',
    url: 'https://doi.org/10.5392/JKCA.2011.11.2.495',
  },
  {
    group: 'B',
    star: true,
    title: 'Information behaviour that keeps found things found',
    cite: 'Bruce · Jones · Dumais (2004) · Information Research 10(1)',
    stat: '4.87가지',
    statLabel: '매주 쓰는 보관 방법',
    claim: '보관은 흩어지고, 안 보이면 잊는다',
    method: '24명 관찰 · 12명 3~6개월 뒤 재검색 실험 · 214명 설문. 웹페이지를 보관하고 다시 찾는 행동을 다룬 PIM(개인 정보 관리) 연구',
    findings: [
      '보관(Keeping)과 내버려 두기(Leaving): 다시 찾기 쉬운 곳에 있다고 믿으면 그 자리에 둔다',
      '평균 7.16가지 보관 방법을 써 봤고, 매주 쓰는 방법만 4.87가지였다',
      '맥락·상기 등 10가지 기능을 모두 갖춘 보관 방법은 없었다',
      '상기하려고 내게 메일(25건), 맥락을 남기려 메모(20건): 도구 대신 사용자가 수고한다',
      '폴더에 넣은 항목은 쓸모가 지난 뒤에야 떠오른다: out of sight, out of mind (선행연구 인용)',
    ],
    use: '내버려 두기는 정보가 다시 찾기 쉬운 곳에 있을 때만 통한다. 날짜순 채널은 과목·목적으로 다시 찾기 쉬운 곳이 아니다.',
    caution: '웹 재검색은 90~100% 성공했다. 대상이 검색되는 웹이고 참가자가 주로 40~59세 전문직이라, 학습 저널 적용은 유추로 표현한다.',
    url: 'https://informationr.net/ir/10-1/paper207.html',
  },
  {
    group: 'B',
    title: '대학생들의 개인정보관리 행태에 영향을 미치는 요인에 관한 연구',
    cite: '이수연·이용정 (2020) · 정보관리학회지 37(1)',
    stat: '41.7%',
    statLabel: '저장 위치를 기억해서 다시 찾음',
    claim: '흩어지면 못 찾거나 중복된다',
    method: '서울 소재 한 대학 593명 온라인 설문 (석·박사과정 46.4% 포함)',
    findings: [
      '정보량이 늘면 필요한 정보를 찾는 데 많은 시간과 노력이 든다',
      '여러 도구에 흩어지면 찾지 못하거나 중복이 쌓인다 (Majid 외, 2013 인용)',
      '정리 체계가 없으면 다시 찾기 어렵다 (Jones의 메타 활동)',
      '도구: PC 25.2% · 스마트기기 20.4% · 클라우드 14.9% · USB 13.8%',
      '나중에 쓸 거라는 인식과 빠른 축적은 정리를 늘리고, 도구가 부담스러우면 정리를 줄인다',
    ],
    use: '대학생은 정보를 여러 도구에 흩어 두고 기억에 의존해 다시 찾는다. 매일 12과목 기록이 쌓이는 Phi 학습자는 정리 욕구가 큰 집단이다.',
    caution: '회귀 설명력이 1.8~7.9%로 낮다. "정보 분산"은 이 논문의 검증 결과가 아니라 선행연구 인용이다.',
    url: 'https://doi.org/10.3743/KOSIM.2020.37.1.107',
  },
  {
    group: 'B',
    title: '디지털 객체 생애주기에 따른 대학생의 파일관리 행태 연구',
    cite: '지윤재·이혜은 (2022) · 한국비블리아학회지 33(1)',
    stat: '20% 미만',
    statLabel: '파일명에 날짜를 적는 비율',
    claim: '학생은 날짜가 아니라 과목으로 정리한다',
    method: '두 대학 학부생 154명 설문 + 8명 심층 면담 (화면 공유·과제 수행 녹화)',
    findings: [
      '면담자 8명 중 7명이 저장 매체를 2개 이상 쓴다',
      '지난 학기 첫 과제를 찾는 데 18초~2분 (평균 약 1분)',
      '가장 빨리 찾은 학생은 "지난학기" 폴더를 만들어 둔 경우였다',
      '학기 → 과목 폴더, 파일명에는 과목명·교수명. 날짜를 적는 경우는 모든 유형에서 20% 이내',
      '폐기를 미룬 채 쌓아 두고, 골라내는 일 자체에 피로를 느낀다',
    ],
    use: '학생들은 과제 파일을 과목 기준으로 정리하고, 그렇게 정리했을 때 가장 빨리 찾는다. 디스코드 저널에는 이 과목별 정리가 없다.',
    caution: '면담자는 모두 결국 파일을 찾았다. 과목별로 정리해 두었기 때문이다.',
    url: 'https://doi.org/10.14699/kbiblia.2022.33.1.321',
  },
];

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- Paper cards ----------
document.querySelectorAll('[data-papers]').forEach((grid) => {
  PAPERS.forEach((p, i) => {
    if (p.group !== grid.dataset.papers) return;
    const card = document.createElement('article');
    card.className = 'paper-card';
    card.dataset.r = '';
    card.innerHTML = `
      <button type="button" class="paper-card__hit" data-open="${i}" aria-haspopup="dialog" aria-label="논문 ${i + 1} 정리 열기">
        <span class="paper-card__face">
          <span class="typo-label color-tertiary">논문 ${pad(i + 1)}${p.star ? ' · 핵심' : ''}</span>
          <span class="paper-card__stat">${esc(p.stat)}</span>
          <span class="typo-label color-tertiary">${esc(p.statLabel)}</span>
          <span class="paper-card__claim typo-title">${esc(p.claim)}</span>
          <span class="paper-card__cite typo-body color-secondary">${esc(p.cite)}</span>
        </span>
        <span class="paper-card__preview" aria-hidden="true">
          <span class="paper-card__preview-inner">
            <span class="typo-label color-tertiary">논문 ${pad(i + 1)} · ${esc(p.cite)}</span>
            <span class="typo-title">${esc(p.claim)}</span>
            <span class="typo-body color-secondary">${esc(p.method)}</span>
            <span class="paper-card__points">
              ${p.findings.slice(0, 2).map((f) => `<span class="typo-body color-secondary dash">${esc(f)}</span>`).join('')}
            </span>
            <span class="paper-card__more typo-label">전체 정리 보기 →</span>
          </span>
        </span>
      </button>`;
    grid.appendChild(card);
  });
});

// Footer sources
document.getElementById('sources').innerHTML = PAPERS.map(
  (p, i) => `<li>${pad(i + 1)} · ${esc(p.cite)} — <a class="link" href="${p.url}" target="_blank" rel="noreferrer">${esc(p.title)}</a></li>`,
).join('');

// ---------- Side panel ----------
const panel = document.querySelector('.panel');
const panelBody = panel.querySelector('.panel__body');
const panelScroll = panel.querySelector('.panel__scroll');
const panelCount = panel.querySelector('[data-panel-count]');
let current = null;
let lastTrigger = null;

function renderPanel(i) {
  const p = PAPERS[i];
  panelCount.textContent = `Research · ${pad(i + 1)} / ${pad(PAPERS.length)}`;
  panelBody.innerHTML = `
    <div class="panel__grid">
      <aside class="panel__identity">
        <span class="panel__number">${pad(i + 1)}</span>
        <h2 id="panel-title" class="typo-subheading">${esc(p.claim)}</h2>
        <p class="typo-body color-secondary">${esc(p.title)}</p>
        <span class="panel__stat">${esc(p.stat)}</span>
        <span class="typo-label color-tertiary">${esc(p.statLabel)}</span>
        <dl class="panel__facts">
          <div><dt class="typo-label color-tertiary">출처</dt><dd class="typo-body">${esc(p.cite)}</dd></div>
          <div><dt class="typo-label color-tertiary">대상·방법</dt><dd class="typo-body">${esc(p.method)}</dd></div>
          <div><dt class="typo-label color-tertiary">Discover 역할</dt><dd class="typo-body">${p.group === 'A' ? 'A · 다시 봐야 하는 이유' : 'B · 다시 보기 어려운 이유'}</dd></div>
        </dl>
      </aside>
      <div class="panel__content">
        <section class="panel__section">
          <h3 class="typo-title">핵심 발견</h3>
          <ul class="panel__findings">${p.findings.map((f) => `<li class="typo-body color-secondary dash">${esc(f)}</li>`).join('')}</ul>
        </section>
        <section class="panel__section">
          <h3 class="typo-title">Discover 활용</h3>
          <p class="panel__quote typo-lead">${esc(p.use)}</p>
        </section>
        <section class="panel__section">
          <h3 class="typo-title">주의</h3>
          <p class="typo-body color-secondary">${esc(p.caution)}</p>
        </section>
        <a class="link typo-label" href="${p.url}" target="_blank" rel="noreferrer">원문 보기 →</a>
      </div>
    </div>`;
  panelScroll.scrollTo({ top: 0 });
}

function openPanel(i, trigger) {
  current = i;
  lastTrigger = trigger || lastTrigger;
  renderPanel(i);
  panel.dataset.open = 'true';
  panel.inert = false;
  document.documentElement.style.overflow = 'hidden';
  panel.querySelector('[data-close].panel__icon').focus({ preventScroll: true });
}
function closePanel() {
  if (current === null) return;
  current = null;
  panel.dataset.open = 'false';
  panel.inert = true;
  document.documentElement.style.overflow = '';
  lastTrigger?.focus({ preventScroll: true });
}
const step = (dir) => openPanel((current + dir + PAPERS.length) % PAPERS.length);

document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-open]');
  if (opener && opener.classList.contains('paper-card__hit')) return openPanel(Number(opener.dataset.open), opener);
  if (e.target.closest('[data-close]')) return closePanel();
  const stepper = e.target.closest('[data-step]');
  if (stepper) step(Number(stepper.dataset.step));
});
document.addEventListener('keydown', (e) => {
  if (current === null) return;
  if (e.key === 'Escape') closePanel();
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowLeft') step(-1);
});

// ---------- Double diamond: hover / focus a phase to see what happens inside ----------
const PHASES = [
  {
    label: '01 · 발산 · 지금 단계',
    name: 'Discover',
    lead: '불편을 넓게 관찰하고, 나만의 문제가 아닌지 근거로 확인한다.',
    items: ['서비스 블루프린트: 기록이 쌓이고 흩어지는 자리', '직접 겪은 불편: 저널링 A1~A3 · 과제 제출 B1~B3', '정량 조사: 논문 5편과 서비스 사례', '정성 조사: 동료 학습자 심층 인터뷰', '근거를 숫자로: 내 기록 · 연구 · 인터뷰 수치'],
  },
  {
    label: '02 · 수렴 · 다음 단계',
    name: 'Define',
    lead: 'Discover에서 모은 현상을 하나의 진짜 문제로 좁힌다.',
    items: ['인터뷰와 하루 기록 시나리오 정리', '반복되는 불편의 우선순위 정하기', '5 Whys로 근본 원인 좁히기', '인사이트 문장과 HMW 질문 확정'],
  },
  {
    label: '03 · 발산',
    name: 'Develop',
    lead: '해법을 여러 번 시도하고 고친다.',
    items: ['저널 시스템과 제출 시스템을 따로 설계', '개입 시점 정하기: 저널을 저장하는 순간, 마감 전', 'Phi Brain 프로토타입 반복'],
  },
  {
    label: '04 · 수렴',
    name: 'Deliver',
    lead: '하나의 제품으로 완성하고 검증한다.',
    items: ['Phi Brain 배포', '제출 데이터로 누락이 줄었는지 확인', '동료 사용 테스트'],
  },
];
const dd = document.querySelector('.dd');
if (dd) {
  const phases = [...dd.querySelectorAll('.dd__phase')];
  const detail = dd.querySelector('.dd__detail');
  let shown = -1;
  const show = (i) => {
    if (i === shown) return;
    shown = i;
    phases.forEach((g, k) => {
      g.classList.toggle('is-active', k === i);
      g.classList.toggle('is-later', k > 0 && k !== i);
    });
    const p = PHASES[i];
    detail.innerHTML = `
      <span class="typo-label color-tertiary">${esc(p.label)}</span>
      <h3 class="typo-subheading">${esc(p.name)}</h3>
      <p class="typo-body color-secondary">${esc(p.lead)}</p>
      <ul class="typo-body color-secondary">${p.items.map((t) => `<li class="dash">${esc(t)}</li>`).join('')}</ul>`;
  };
  phases.forEach((g, i) => {
    g.addEventListener('mouseenter', () => show(i));
    g.addEventListener('focus', () => show(i));
    g.addEventListener('click', () => show(i));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i); } });
  });
  dd.querySelector('.dd__svg').addEventListener('mouseleave', () => show(0));
  show(0);
}

// ---------- Blueprint: hovering a stage column dims the others ----------
const bp = document.querySelector('.bp');
if (bp) {
  bp.addEventListener('mouseover', (e) => {
    const col = e.target.closest('[data-col]');
    if (col) bp.dataset.active = col.dataset.col;
  });
  bp.addEventListener('mouseleave', () => delete bp.dataset.active);
}

// ---------- Qualitative research: fill these after the interviews ----------
// INTERVIEWS: { who: '학습자 1 · 2학기', quote: '한 줄 인용', points: ['발견 1', '발견 2'] }
// INTERVIEW_STATS: { num: '3/5명', title: '지난주 저널을 다시 보지 않았다', body: '설명' }
const INTERVIEW_DATE = '9월 21일';
const INTERVIEWS = [];
const INTERVIEW_STATS = [];

document.querySelector('[data-interview-status]').textContent = INTERVIEWS.length
  ? `${INTERVIEWS.length}명 완료`
  : `${INTERVIEW_DATE} 진행 예정`;

const interviewGrid = document.querySelector('[data-interviews]');
interviewGrid.innerHTML = (INTERVIEWS.length ? INTERVIEWS : [null, null, null])
  .map((iv, i) => iv
    ? `<article class="note-card" data-r>
        <span class="typo-label color-tertiary">${esc(iv.who)}</span>
        <p class="note-card__quote typo-title">${esc(iv.quote)}</p>
        <ul class="typo-body color-secondary">${iv.points.map((t) => `<li class="dash">${esc(t)}</li>`).join('')}</ul>
      </article>`
    : `<article class="note-card note-card--empty" data-r>
        <span class="typo-label color-tertiary">인터뷰 ${pad(i + 1)}</span>
        <p class="typo-title color-tertiary">결과 추가 예정</p>
        <p class="typo-body color-tertiary">${INTERVIEW_DATE} 인터뷰 후 핵심 인용과 발견을 채웁니다.</p>
      </article>`)
  .join('');

const STAT_SLOTS = [
  { num: 'N/5명', title: '지난주 저널을 다시 보지 않았다', body: '저널을 다시 보는 빈도 · 질문 1' },
  { num: 'N/5명', title: '셀프 피드백을 놓친 적이 있다', body: '놓친 경험과 알게 된 시점 · 질문 4' },
  { num: 'N/5명', title: '할 일을 다른 곳에 다시 적는다', body: '할 일을 챙기는 방법 · 질문 3' },
];
document.querySelector('[data-interview-stats]').innerHTML = (INTERVIEW_STATS.length ? INTERVIEW_STATS : STAT_SLOTS)
  .map((s) => `<div class="stat${INTERVIEW_STATS.length ? '' : ' stat--todo'}" data-r>
      <span class="stat__num">${esc(s.num)}</span><span class="typo-title">${esc(s.title)}</span><span class="typo-body color-secondary">${esc(s.body)}</span>
    </div>`)
  .join('');

// ---------- Dropdown (auto-open on scroll, click toggles) ----------
document.querySelectorAll('.dropdown').forEach((dd) => {
  const trigger = dd.querySelector('.dropdown__trigger');
  const region = dd.querySelector('.dropdown__panel');
  let auto = false;
  let manual = null;
  const apply = () => {
    const open = manual ?? auto;
    dd.dataset.open = open;
    trigger.setAttribute('aria-expanded', open);
    region.inert = !open;
  };
  trigger.addEventListener('click', () => {
    manual = !(manual ?? auto);
    apply();
  });
  if ('autoOpen' in dd.dataset) {
    const update = () => {
      if (window.scrollY <= 8) { auto = false; manual = null; }
      else if (dd.getBoundingClientRect().top < window.innerHeight * 0.75) auto = true;
      apply();
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  } else apply();
});

// ---------- TOC active marker ----------
const tocLinks = [...document.querySelectorAll('.toc a')];
const tocIds = tocLinks.map((a) => a.getAttribute('href').slice(1));
function updateToc() {
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  let active = atBottom ? tocIds[tocIds.length - 1] : null;
  if (!atBottom) {
    let best = -Infinity;
    for (const id of tocIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      if (top <= 160 && top >= best) { best = top; active = id; }
    }
  }
  tocLinks.forEach((a) => {
    const on = a.getAttribute('href') === `#${active}`;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  });
}
window.addEventListener('scroll', updateToc, { passive: true });
window.addEventListener('resize', updateToc);
updateToc();

// ---------- Scroll reveal (rise + fade in, staggered among siblings) ----------
// ?static shows everything at once (for captures and printing).
const still = new URLSearchParams(location.search).has('static');
if (!still && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const els = [...document.querySelectorAll('[data-r]')];
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.dataset.reveal = 'in';
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.1 },
  );
  els.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute('data-r'));
    el.style.setProperty('--reveal-delay', `${Math.max(0, siblings.indexOf(el)) * 90}ms`);
    el.dataset.reveal = 'pending';
    io.observe(el);
  });
}
