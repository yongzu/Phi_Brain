// IPS · Discover — interactions ported from yongzu/BI:
// scroll reveal, auto-opening dropdown, left TOC with active marker,
// paper cards with hover preview, and a side panel with ←/→ stepping.

// Paper summaries. `points` items may use <b> for emphasis (trusted, authored here).
// `flow` is the diagram: each row is a chain of steps; the last step of a row is highlighted.
const PAPERS = [
  {
    group: 'A',
    title: '대학생의 e-포트폴리오 제작 경험',
    cite: '조성범·한송이 (2023) · 한국교육문제연구 41(3)',
    method: '충북 A대 e-포트폴리오 경진대회 참가 학생 8명 1:1 심층 면담 (질적 연구)',
    claim: '정리하지 않으면 깨달음은 흐려진다',
    points: [
      {
        title: '모아서 다시 봐야 성찰이 일어난다 (제작 성과)',
        items: [
          '오랜 기간의 <b>기록을 한곳에 모아 보니 자신의 변화와 장단점이 처음으로 보였다</b>(학생5).',
          '<b>옛 기록을 다시 읽으며 놓쳤던 부분을 발견하고 반성</b>할 수 있었다(학생2).',
          '성과로 도출된 주제는 성찰을 통한 자기 이해, 진로 확신, 소속감이다.',
        ],
      },
      {
        title: '정리하지 않으면 경험은 흐려진다 (제작 동기)',
        items: [
          '공모전·동아리 활동을 따로 <b>정리해 두지 않았더니 시간이 지나 기억나지 않았다</b>(학생3).',
          '<b>그 순간엔 크게 깨달았는데 지금은 흐릿해져 허탈했다</b>(학생1).',
        ],
      },
    ],
    insight: '기록을 남기는 것만으로는 부족하다. 흩어진 기록을 모아서 다시 볼 때 비로소 성찰과 배움이 일어난다.',
    flow: [
      ['경험', '기록만 남김', '시간이 지나 흐려짐'],
      ['경험', '기록', '모아서 다시 보기', '성찰 · 배움'],
    ],
    url: 'https://doi.org/10.22327/kei.2023.41.3.113',
  },
  {
    group: 'A',
    title: '학습성찰도구로서 e-포트폴리오 활성화를 위한 연구',
    cite: '강인애·유승현·강연경 (2011) · 한국콘텐츠학회논문지 11(2)',
    method: '경희대 학습 포트폴리오 참여 학생 설문 289명 + 성찰저널 240편 분석',
    claim: '성찰은 배움을 키우지만, 도구가 쉬워야 이어진다',
    points: [
      {
        title: '성찰 기록이 학습을 키운다 (성찰저널 240편)',
        items: [
          '성찰저널 분석에서 <b>학습조절능력 향상 54.17%</b>가 가장 큰 효과로 나왔다.',
          '다음으로 <b>학습과정 강화 27.08%</b>가 뒤를 이었다.',
          '설문에서도 도움이 된 점 1위는 <b>학업에 대한 자기성찰 향상 66.1%</b>였다.',
        ],
      },
      {
        title: '이를 쉽게 하려면 시스템 개선이 필요했다',
        items: [
          '설문 응답자의 <b>51.21%가 시스템 개선(쉬운 편집 및 관리)</b>을 요구했다.',
          '성찰저널 작성자의 <b>52.92%는 과목·전공 특성과 포트폴리오 기능이 맞지 않아 어려웠다</b>고 답했다.',
        ],
      },
    ],
    insight: '설문 응답자의 51.21%가 시스템 개선(쉬운 편집 및 관리)을 요구했습니다.',
    flow: [
      ['성찰저널 작성', '편집 및 관리 어려움', '개선'],
    ],
    url: 'https://doi.org/10.5392/JKCA.2011.11.2.495',
  },
  {
    group: 'B',
    star: true,
    title: 'Information behaviour that keeps found things found',
    cite: 'Bruce · Jones · Dumais (2004) · Information Research 10(1)',
    method: '24명 관찰 · 12명 3~6개월 뒤 재검색 실험 · 214명 설문. 웹페이지를 보관하고 다시 찾는 행동을 다룬 PIM(개인 정보 관리) 연구',
    claim: '보관은 흩어지고,\n안 보이면 잊는다',
    points: [
      {
        title: '보관 방법은 흩어지고, 완벽한 방법은 없다',
        items: [
          '한 사람이 평균 <b>7.16가지</b> 보관 방법을 써 봤고, 매주 쓰는 방법만 <b>4.87가지</b>였다.',
          '맥락·상기 등 <b>10가지 기능을 모두 갖춘 보관 방법은 없었다</b>.',
        ],
      },
      {
        title: '상기와 맥락은 사용자가 직접 만든다',
        items: [
          '나중에 하려고 스스로 상기시키려고 <b>내게 메일을 보낸 경우 25건</b>.',
          '메모를 덧붙여 맥락을 남기려고 <b>문서에 URL을 붙인 경우 20건</b>.',
          '<b>상기와 맥락은 도구가 해주지 않아 사용자가 직접 수고해서 만들고 있었다</b>.',
        ],
      },
      {
        title: '안 보이면 잊는다',
        items: [
          '폴더에 넣어 둔 항목은 <b>쓸모가 지난 뒤에야 다시 떠오른다</b> — out of sight, out of mind (선행연구 인용).',
          '내버려 두기(Leaving)는 정보가 <b>다시 찾기 쉬운 곳에 있을 때만</b> 통한다. 웹은 검색이 돼서 재검색이 90~100% 성공했다.',
        ],
      },
    ],
    insight: '내버려 두기는 정보가 다시 찾기 쉬운 곳에 있을 때만 통한다. 날짜순 채널은 과목·목적으로 다시 찾기 쉬운 곳이 아니다.',
    flow: [
      ['유용한 정보', '보관 방법 4.87가지로 흩어짐', '안 보이면 잊음'],
      ['유용한 정보', '내버려 두기', '찾기 쉬운 곳이면 다시 찾음'],
    ],
    url: 'https://informationr.net/ir/10-1/paper207.html',
  },
  {
    group: 'B',
    title: '대학생들의 개인정보관리 행태에 영향을 미치는 요인에 관한 연구',
    cite: '이수연·이용정 (2020) · 정보관리학회지 37(1)',
    method: '서울 소재 한 대학 593명 온라인 설문 (석·박사과정 46.4% 포함)',
    claim: '흩어지면 못 찾거나 중복된다',
    points: [
      {
        title: '정보가 많아질수록 찾는 데 수고가 든다',
        items: [
          '정보량이 늘면서 <b>필요한 정보를 찾는 데 많은 시간과 노력이 든다</b>.',
          '여러 도구에 흩어지면 <b>찾지 못하거나 중복이 쌓인다</b> (Majid 외, 2013 인용).',
          '<b>정리 체계가 없으면 다시 찾기 어렵다</b> (Jones의 메타 활동).',
        ],
      },
      {
        title: '실제 행태 (593명)',
        items: [
          '사용 도구가 PC 25.2% · 스마트기기 20.4% · 클라우드 14.9% · USB 13.8%로 흩어져 있다.',
          '다시 찾는 방법 1위는 <b>저장 위치를 기억해서 41.7%</b>, 검색은 24.8%.',
        ],
      },
      {
        title: '무엇이 정리를 움직이는가 (회귀분석)',
        items: [
          '<b>나중에 쓸 거라는 인식</b>이 정리와 유지를 모두 높였다.',
          '<b>정보가 빨리 쌓일수록</b> 정리 활동이 늘었다.',
          '<b>정보기술 사용이 부담스러울수록</b> 정리와 유지가 줄었다.',
        ],
      },
    ],
    insight: '대학생은 정보를 여러 도구에 흩어 두고 기억에 의존해 다시 찾는다. 매일 12과목 기록이 쌓이는 Phi 학습자는 정리 욕구가 큰 집단이다.',
    flow: [
      ['정보가 빠르게 쌓임', '여러 도구에 분산', '못 찾거나 중복'],
      ['나중에 쓸 거라는 인식', '정리 ↑'],
      ['도구 사용 부담', '정리 ↓'],
    ],
    url: 'https://doi.org/10.3743/KOSIM.2020.37.1.107',
  },
  {
    group: 'B',
    title: '디지털 객체 생애주기에 따른 대학생의 파일관리 행태 연구',
    cite: '지윤재·이혜은 (2022) · 한국비블리아학회지 33(1)',
    method: '두 대학 학부생 154명 설문 + 8명 심층 면담 (화면 공유·과제 수행 녹화)',
    claim: '학생은 날짜가 아니라 과목으로 정리한다',
    points: [
      {
        title: '저장 장소가 흩어져 있다',
        items: [
          '면담자 <b>8명 중 7명</b>이 저장 매체를 2개 이상 썼다.',
          '지난 학기 첫 과제를 찾는 데 <b>18초~2분</b>(평균 약 1분)이 걸렸다.',
        ],
      },
      {
        title: '과목 기준으로 정리하면 빨리 찾는다',
        items: [
          '가장 빨리 찾은 학생은 바탕화면에 <b>"지난학기" 폴더</b>를 만들어 둔 경우였다.',
          '학생들은 대체로 <b>학기 → 과목 폴더</b>를 만들고, 파일명에는 과목명·교수명을 적었다.',
          '파일명에 날짜를 적는 경우는 <b>모든 파일 유형에서 20% 이내</b>였다.',
        ],
      },
      {
        title: '쌓기만 하고 돌아보지 않는다',
        items: [
          '보관할지 평가하는 단계가 거의 없고, <b>폐기를 미룬 채 모두 쌓아 두는 모습</b>이 확인됐다.',
          '백업을 하지 않는 경우가 30.5%였고, <b>골라내는 일 자체에 피로감</b>을 느꼈다.',
        ],
      },
    ],
    insight: '학생들은 과제 파일을 과목 기준으로 정리하고, 그렇게 정리했을 때 가장 빨리 찾는다. 디스코드 저널에는 이 과목별 정리가 없다.',
    flow: [
      ['학기 폴더', '과목 폴더', '과목명 파일', '가장 빨리 찾음'],
      ['날짜로 이름 붙이기', '20% 미만'],
    ],
    url: 'https://doi.org/10.14699/kbiblia.2022.33.1.321',
  },
];

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- Paper cards: number · claim · paper title; hover lists the key-content headings ----------
document.querySelectorAll('[data-papers]').forEach((grid) => {
  PAPERS.forEach((p, i) => {
    if (p.group !== grid.dataset.papers) return;
    const card = document.createElement('article');
    card.className = 'paper-card';
    card.dataset.r = '';
    card.innerHTML = `
      <button type="button" class="paper-card__hit" data-open="${i}" aria-haspopup="dialog" aria-label="논문 ${i + 1} 전체 보기">
        <span class="paper-card__face">
          <span class="paper-card__num">${pad(i + 1)}</span>
          <span class="paper-card__claim typo-subheading">${esc(p.claim)}</span>
          <span class="paper-card__title typo-body color-secondary" title="${esc(p.title)}">${esc(p.title)}</span>
        </span>
        <span class="paper-card__preview" aria-hidden="true">
          <span class="paper-card__preview-inner">
            <span class="typo-label color-tertiary">${pad(i + 1)} · 핵심 내용</span>
            <span class="typo-title">${esc(p.claim)}</span>
            ${p.points.map((g) => `<span class="typo-body color-secondary dash">${esc(g.title)}</span>`).join('')}
            <span class="paper-card__more typo-label">전체 보기 →</span>
          </span>
        </span>
      </button>`;
    grid.appendChild(card);
  });
});

// Footer sources
document.getElementById('sources').innerHTML = PAPERS.map(
  (p, i) => `<li data-r>${pad(i + 1)} · ${esc(p.cite)} — <a class="link" href="${p.url}" target="_blank" rel="noreferrer">${esc(p.title)}</a></li>`,
).join('');

// ---------- Side panel: identity column · 핵심 내용 · Insight · 도식화 · 원문 링크 ----------
const panel = document.querySelector('.panel');
const panelBody = panel.querySelector('.panel__body');
const panelScroll = panel.querySelector('.panel__scroll');
const panelCount = panel.querySelector('[data-panel-count]');
let current = null;
let lastTrigger = null;

const renderFlow = (rows) => rows.map((row) => `
  <div class="flow__row">${row.map((step, k) => `${k ? '<span class="flow__arrow" aria-hidden="true">→</span>' : ''}<span class="flow__step${k === row.length - 1 ? ' is-end' : ''}">${esc(step)}</span>`).join('')}</div>`).join('');

function renderPanel(i) {
  const p = PAPERS[i];
  panelCount.textContent = `Research · ${pad(i + 1)} / ${pad(PAPERS.length)}`;
  panelBody.innerHTML = `
    <div class="panel__grid">
      <aside class="panel__identity">
        <span class="panel__number">${pad(i + 1)}</span>
        <h2 id="panel-title" class="typo-subheading">${esc(p.claim)}</h2>
        <p class="typo-body color-secondary">${esc(p.title)}</p>
        <dl class="panel__facts">
          <div><dt class="typo-label color-tertiary">출처</dt><dd class="typo-body">${esc(p.cite)}</dd></div>
          <div><dt class="typo-label color-tertiary">대상·방법</dt><dd class="typo-body">${esc(p.method)}</dd></div>
          <div><dt class="typo-label color-tertiary">Discover 역할</dt><dd class="typo-body">${p.group === 'A' ? 'A · 다시 봐야 하는 이유' : 'B · 다시 보기 어려운 이유'}</dd></div>
        </dl>
      </aside>
      <div class="panel__content">
        <section class="panel__section">
          <h3 class="typo-title">핵심 내용</h3>
          ${p.points.map((g) => `
            <div class="panel__group">
              <h4 class="typo-label">${esc(g.title)}</h4>
              <ol class="panel__list typo-body color-secondary">${g.items.map((t) => `<li>${t}</li>`).join('')}</ol>
            </div>`).join('')}
        </section>
        <section class="panel__section">
          <h3 class="typo-title">Insight</h3>
          <p class="panel__quote typo-lead">${esc(p.insight)}</p>
        </section>
        <section class="panel__section">
          <h3 class="typo-title">도식화</h3>
          <div class="flow" role="img" aria-label="${esc(p.claim)} 도식">${renderFlow(p.flow)}</div>
        </section>
        <a class="link typo-label" href="${p.url}" target="_blank" rel="noreferrer">논문 원문 보기 →</a>
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
// Deep link: #paper-03 opens that paper's panel
const deepLink = location.hash.match(/^#paper-(\d+)$/);
if (deepLink && PAPERS[Number(deepLink[1]) - 1]) openPanel(Number(deepLink[1]) - 1);

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
    items: ['문제상황: 저널 활용 A · 저널링 B · 과제 제출 C', '서비스 블루프린트: 기록이 쌓이고 흩어지는 자리', '정량 조사: 논문 5편', '정성 조사: 동료 학습자 6명 인터뷰', '제출 데이터: 과제 93.9% · 셀프 피드백 56.0%'],
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

// ---------- Blueprint: a cell with problem badges shows those problems on hover, focus or click ----------
const tip = document.createElement('div');
tip.className = 'pain-tip';
tip.setAttribute('role', 'tooltip');
tip.hidden = true;
document.body.appendChild(tip);
let tipCell = null;
let tipPinned = false;
const showTip = (cellEl) => {
  const items = cellEl.dataset.pains.split(',').map((code) => {
    const li = document.querySelector(`.pain-card__list [data-pain="${code}"]`);
    if (!li) return '';
    return `<div class="pain-tip__item"><span class="pain-card__num">${code}</span><div><p class="pain-tip__title">${esc(li.querySelector('.pain-card__title').textContent)}</p><p class="pain-tip__body">${esc(li.querySelector('.pain-card__body').textContent)}</p></div></div>`;
  }).join('');
  tip.innerHTML = items;
  tip.hidden = false;
  tipCell = cellEl;
  const r = cellEl.getBoundingClientRect();
  const w = tip.offsetWidth;
  const hgt = tip.offsetHeight;
  const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
  const below = r.bottom + 12 + hgt <= window.innerHeight;
  tip.style.left = `${left}px`;
  tip.style.top = `${below ? r.bottom + 12 : r.top - hgt - 12}px`;
};
const hideTip = () => { tip.hidden = true; tipCell = null; tipPinned = false; };
document.querySelectorAll('.bp__cell[data-pains]').forEach((c) => {
  c.addEventListener('mouseenter', () => { if (!tipPinned) showTip(c); });
  c.addEventListener('mouseleave', () => { if (!tipPinned) hideTip(); });
  c.addEventListener('focus', () => showTip(c));
  c.addEventListener('blur', () => { if (!tipPinned) hideTip(); });
  c.addEventListener('click', (e) => {
    e.stopPropagation();
    if (tipPinned && tipCell === c) return hideTip();
    showTip(c);
    tipPinned = true;
  });
});
document.addEventListener('click', () => { if (tipPinned) hideTip(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !tip.hidden) hideTip(); });
window.addEventListener('scroll', () => { if (!tip.hidden) hideTip(); }, { passive: true });

// ---------- Qualitative research: 동료 학습자 인터뷰 6명 ----------
// INTERVIEW_QA: { q: '질문', a: '정리한 답변(**굵게**)', quote: '인용(선택)' }
const INTERVIEW_COUNT = 6;
const INTERVIEW_QA = [
  {
    "q": "저널링을 매일 작성하시나요? 작성 시간은?",
    "a": "**매일 쓰려 하지만 미루거나 건너뛰게 되는 경우도 있다.** 작성 내용에 대한 고민, 공개된 공간에 기록하는 부담, 세션 직후의 시간 부족이 이유였다. 작성 시간은 응답자에 따라 10~30분이었다.",
    "quote": "안 한 지 일주일이 넘었다"
  },
  {
    "q": "지난 저널을 얼마나 자주 보시나요?",
    "a": "일반적으로 주 1회 정도 다시 보는 것으로 파악됐으나, 일주일 이상 보지 않거나 과제 전 한 번 확인한 뒤 다시 보지 않는 사례도 있었다. **매일 다시 보는 응답자는 없었다.**",
    "quote": ""
  },
  {
    "q": "다시 볼 때 무엇을 찾으려고 하나요?",
    "a": "저널을 심심풀이로 훑거나 아카이빙 기록으로만 남기는 경우가 있었고, 일부는 주간 회고·인사이트 복기·내용 추가를 위해 다시 봤다. 다만 **디스코드의 날짜별 수직 구조와 하이라이트 부재 때문에 특정 내용을 찾아보는 용도로는 활용하기 어려웠다.**",
    "quote": "부분적으로 읽기 어렵다"
  },
  {
    "q": "Findings는 어디에 정리하나요?",
    "a": "**Findings와 수업 기록은 노션·옵시디언·피그마·맥북 메모 등에 정리했다.** 학습적으로 다시 볼 내용은 옵시디언 페이지에 하이라이트해 두는 등, 각자의 방식이 이미 자리 잡고 있었다.",
    "quote": ""
  },
  {
    "q": "Future Item은 어떻게 관리하나요?",
    "a": "**Future Item은 다이어리·메모 앱·문서·일정 관리 도구에서 별도로 관리했다.** 저널에는 진행도만 적거나, 아예 기록하지 않는 사례도 있었다.",
    "quote": ""
  },
  {
    "q": "과제나 셀프 피드백을 놓친 적이 있나요?",
    "a": "**과제를 놓친 경험은 드물었지만, 셀프 피드백을 놓친 사례는 반복해서 나타났다.** 세션 직후 바로 작성하지 못하고 다음 날로 밀렸을 때, 접근 링크를 다시 찾는 과정이 불편해 잊는 경우가 있었다.",
    "quote": "0주차 이후 한 번도 못 했다"
  },
  {
    "q": "제출한 걸 어떻게 확인하시나요?",
    "a": "해야 할 과제는 LMS·캘린더·문서 등에서 확인했다. 제출 직후에는 기억에 의존하고 완료 여부를 따로 확인하지 않는 사례가 반복해서 나타났다. **과목과 제출물이 쌓이면 제출 여부가 헷갈려 제출 스프레드시트를 다시 확인했다.**",
    "quote": ""
  }
];

document.querySelector('[data-interview-status]').textContent = `${INTERVIEW_COUNT}명 완료`;

const strong = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
document.querySelector('[data-interview-qa]').innerHTML = INTERVIEW_QA
  .map((item, i) => `<article class="qa" data-r>
      <span class="typo-label color-tertiary">질문 ${pad(i + 1)}</span>
      <h3 class="qa__q typo-title">${esc(item.q)}</h3>
      <p class="qa__body typo-body color-secondary">${strong(item.a)}</p>
      ${item.quote ? `<p class="qa__quote typo-body color-tertiary">&ldquo;${esc(item.quote)}&rdquo;</p>` : ''}
    </article>`)
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
// 목차 클릭: 해당 섹션을 화면 정중앙에 놓는다
tocLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const header = document.querySelector('.site-header');
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const padTop = parseFloat(getComputedStyle(el).paddingTop) || 0;
    const rect = el.getBoundingClientRect();
    const contentTop = window.scrollY + rect.top + padTop;
    const contentH = rect.height - padTop;
    const slack = Math.max(headerH + 24, (window.innerHeight - contentH) / 2);
    const target = Math.max(0, Math.round(contentTop - slack));
    window.scrollTo({ top: target, behavior: 'smooth' });
    history.replaceState(null, '', '#' + id);
  });
});

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
    { rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
  );
  els.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute('data-r'));
    el.style.setProperty('--reveal-delay', `${Math.max(0, siblings.indexOf(el)) * 90}ms`);
    el.dataset.reveal = 'pending';
    io.observe(el);
  });
}
