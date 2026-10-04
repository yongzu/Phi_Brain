/* IPS 4주차 가설 체인: 데이터(CHAIN) → 중첩 목록 → 박스 사이 선(SVG).
   picked = 선택한 체인, cause = 체인 끝의 근본 원인, infer = 관찰 근거 없이 추론한 가설.
   note는 박스에 올리거나 눌렀을 때 뜨는 말풍선(근거 · 확인 방법). */
(() => {
  const CHAIN = {
    id: '현상', top: true, picked: true,
    text: '디자이너는 저장한 레퍼런스를 필요할 때 다시 찾지 못한다',
    note: { 근거: "모션그래픽 레퍼런스 하나를 찾으려고 '디자인' 컬렉션을 처음부터 스크롤하며 하나씩 눌러 본다(장면 2)." },
    children: [
      {
        id: 'A', picked: true, text: '컬렉션 안이 섞여 있다',
        note: { 근거: "내 '디자인' 컬렉션에 모션그래픽, 산업, 시각 그래픽 디자인이 모두 섞여 있다.", 확인: '동료의 가장 큰 컬렉션 하나를 열어 분야가 몇 개 섞여 있는지 센다.' },
        children: [
          {
            id: 'A-1', text: '저장하는 순간 세부 분야까지 고르기 번거로워 큰 컬렉션에 넣는다',
            note: { 근거: '컬렉션은 큰 이름 몇 개에서 멈춘다.', 확인: '컬렉션을 더 잘게 나누지 않는 이유를 묻는다.' },
            children: [
              { id: 'A-1-a', text: '컬렉션을 잘게 만들수록 고를 목록이 길어져 저장 흐름이 끊긴다', note: { 근거: '저장은 피드를 넘기는 도중에 한다. 고르는 단계가 길어지면 그냥 넘어간다.', 확인: '동료의 컬렉션 개수와 마지막으로 컬렉션을 만든 때를 묻는다.' } },
            ],
          },
          {
            id: 'A-2', picked: true, text: '한 번 넣으면 컬렉션 안에서 다시 나눌 방법이 없다',
            note: { 근거: '컬렉션 안에는 태그나 하위 분류가 없고, 순서도 바꿀 수 없다. 저장한 순서대로 쌓인다.', 확인: '컬렉션 안을 정리하려다 포기한 경험이 있는지 묻는다(장면 4).' },
            children: [
              { id: 'A-2-a', picked: true, cause: true, text: "분류가 '저장하는 순간, 컬렉션 한 단계'에서만 일어나도록 짜여 있다", note: { 근거: '저장한 뒤에는 분야나 이유를 덧붙이거나, 비슷한 것끼리 다시 묶을 방법이 없다. 장면 1~4가 모두 여기서 막힌다.', 확인: '저장 후에 다시 분류할 수 있다면 쓰겠는지, 지금은 어디서 대신하는지(노션, 핀터레스트 등) 묻는다.' } },
            ],
          },
        ],
      },
      {
        id: 'B', text: '저장한 이유가 남지 않는다',
        note: { 근거: "다시 찾을 때 기억나는 것은 '그때 본 화면 전환이 좋았던 작업'인데, 저장물에는 그 이유가 없다(장면 1)." },
        children: [
          {
            id: 'B-1', text: '저장은 한 번 탭으로 끝나 메모할 자리가 없다',
            note: { 근거: '저장 버튼에는 컬렉션 고르기만 있고 글을 남길 칸이 없다.' },
            children: [
              { id: 'B-1-a', infer: true, text: '인스타그램에게 저장은 기록이 아니라 추천에 쓰는 관심 신호다', note: { 근거: '추론 — 관찰 근거는 없다. 저장을 다시 찾기 위한 기능보다 반응 지표로 다룬다면, 정리 기능이 뒤로 밀린 이유가 설명된다.' } },
            ],
          },
          {
            id: 'B-2', text: '저장하는 순간엔 나중에 기억날 거라 생각한다',
            note: { 확인: '저장할 때 이유를 따로 적어 두는지, 다시 볼 때 이유가 기억나는지 묻는다.' },
            children: [
              { id: 'B-2-a', text: '저장과 다시 찾는 사이가 길어 맥락이 잊힌다', note: { 근거: '레퍼런스는 과제나 작업을 시작할 때, 저장하고 한참 뒤에 다시 찾는다.' } },
            ],
          },
        ],
      },
      {
        id: 'C', text: '찾는 방법이 스크롤뿐이다',
        note: { 근거: '원하는 것을 찾으려면 처음부터 스크롤한다(장면 2).' },
        children: [
          {
            id: 'C-1', text: '저장물 안에서 검색할 수 없다',
            note: { 확인: '저장 화면에서 검색이 되는지 다시 확인한다.' },
            children: [
              { id: 'C-1-a', text: '검색이 생겨도 저장물에 검색할 단서(분야·이유)가 없다', note: { 근거: '단서는 저장하는 순간 머릿속에만 있다(B와 같은 뿌리).' } },
            ],
          },
          { id: 'C-2', text: '저장한 순서로만 보인다', note: { 근거: '자주 쓰는 것을 앞으로 옮기거나 비슷한 것끼리 붙여 둘 수 없다(장면 3).' } },
        ],
      },
      {
        id: 'D', text: '썸네일만으로는 알아볼 수 없다',
        note: { 근거: '썸네일만으로는 어떤 작업이었는지 기억나지 않아 하나씩 눌러 본다(장면 2).' },
        children: [
          { id: 'D-1', text: '릴스는 커버 한 장으로만 보여 움직임이 보이지 않는다', note: { 근거: '모션그래픽은 움직임이 핵심인데, 격자에서는 멈춘 한 장면이다.' } },
          { id: 'D-2', text: '격자 썸네일은 잘려 있어 작업 전체가 보이지 않는다', note: { 확인: '포스터·레이아웃 작업을 썸네일만 보고 알아보는지 묻는다.' } },
        ],
      },
      {
        id: 'E', text: '저장한 것이 너무 많다',
        note: { 근거: '저장물이 수백 개를 넘는다.' },
        children: [
          {
            id: 'E-1', text: '저장하는 비용은 거의 없는데 정리하는 비용은 크다',
            note: { 근거: '저장은 한 번 탭, 정리는 하나씩 옮기기다.' },
            children: [
              { id: 'E-1-a', text: '이미 쌓인 것을 한 번에 다시 묶을 방법이 없다', note: { 근거: '정리하려다 포기하고 다시 저장만 한다(장면 4) — A-2-a와 같은 뿌리.' } },
            ],
          },
        ],
      },
    ],
  };

  const wrap = document.getElementById('tree-wrap');
  const treeEl = document.getElementById('tree');
  const svg = document.getElementById('tree-lines');
  const tip = document.getElementById('tip');
  if (!wrap || !treeEl || !svg || !tip) return;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const parentOf = new Map();
  const byId = new Map();

  function nodeHTML(n, parent) {
    byId.set(n.id, n);
    if (parent) parentOf.set(n.id, parent.id);
    const cls = ['node', n.top && 'is-top', n.picked && 'is-picked', n.cause && 'is-cause', n.infer && 'is-infer'].filter(Boolean).join(' ');
    const kids = n.children?.length ? `<ul>${n.children.map(c => nodeHTML(c, n)).join('')}</ul>` : '';
    return `<li><button type="button" class="${cls}" data-node="${esc(n.id)}" aria-describedby="tip">
      <span class="node-id">${n.top ? '현상' : esc(n.id)}${n.infer ? ' · 추론' : ''}</span><span>${esc(n.text)}</span></button>${kids}</li>`;
  }
  treeEl.innerHTML = nodeHTML(CHAIN, null);

  const box = id => treeEl.querySelector(`[data-node="${CSS.escape(id)}"]`);
  const vertical = () => matchMedia('(max-width:940px)').matches;

  // 부모 → 자식 선: 가로 트리는 오른쪽 가운데 → 왼쪽 가운데 곡선, 세로 트리는 왼쪽 아래로 내려와 꺾는 선
  function drawLines() {
    const base = wrap.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${wrap.clientWidth} ${wrap.clientHeight}`);
    const paths = [];
    for (const [child, parent] of parentOf) {
      const a = box(parent).getBoundingClientRect(), b = box(child).getBoundingClientRect();
      let d;
      if (vertical()) {
        const x = a.left - base.left + 12, y1 = a.bottom - base.top, y2 = b.top - base.top + b.height / 2, x2 = b.left - base.left;
        d = `M${x} ${y1} V${y2 - 8} Q${x} ${y2} ${x + 8} ${y2} H${x2}`;
      } else {
        const x1 = a.right - base.left, y1 = a.top - base.top + a.height / 2, x2 = b.left - base.left, y2 = b.top - base.top + b.height / 2;
        const dx = (x2 - x1) / 2;
        d = `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
      }
      const picked = byId.get(child).picked && byId.get(parent).picked;
      paths.push(`<path d="${d}" data-edge="${esc(child)}"${picked ? ' class="is-picked"' : ''}/>`);
    }
    svg.innerHTML = paths.join('');
  }

  // 한 박스를 고르면 현상까지 올라가는 경로와 그 아래 가지를 함께 켠다
  function trace(id) {
    const on = new Set();
    for (let cur = id; cur; cur = parentOf.get(cur)) on.add(cur);
    (function down(n) { on.add(n.id); n.children?.forEach(down); })(byId.get(id));
    wrap.classList.add('is-tracing');
    treeEl.querySelectorAll('.node').forEach(el => el.classList.toggle('is-on', on.has(el.dataset.node)));
    svg.querySelectorAll('path').forEach(p => p.classList.toggle('is-on', on.has(p.dataset.edge) && on.has(parentOf.get(p.dataset.edge))));
    showTip(id);
  }
  function untrace() {
    wrap.classList.remove('is-tracing');
    treeEl.querySelectorAll('.is-on').forEach(el => el.classList.remove('is-on'));
    svg.querySelectorAll('.is-on').forEach(el => el.classList.remove('is-on'));
    tip.hidden = true;
  }
  function showTip(id) {
    const n = byId.get(id);
    const lines = Object.entries(n.note || {}).map(([k, v]) => `<p><b>${esc(k)}</b> ${esc(v)}</p>`).join('');
    if (!lines) { tip.hidden = true; return; }
    tip.innerHTML = lines;
    tip.hidden = false;
    const base = wrap.getBoundingClientRect(), r = box(id).getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = r.left - base.left, top = r.bottom - base.top + 8;
    if (left + tw > wrap.clientWidth) left = Math.max(0, wrap.clientWidth - tw);
    if (r.bottom + 8 + th > innerHeight && r.top - th - 8 > 0) top = r.top - base.top - th - 8; // 화면 아래가 모자라면 위로
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  let pinned = null; // 누른 박스는 다른 박스를 누르거나 바깥을 누를 때까지 켜 둔다(터치 화면)
  treeEl.addEventListener('pointerover', e => { const b = e.target.closest('.node'); if (b && !pinned) trace(b.dataset.node); });
  treeEl.addEventListener('pointerleave', () => { if (!pinned) untrace(); });
  treeEl.addEventListener('focusin', e => { const b = e.target.closest('.node'); if (b) trace(b.dataset.node); });
  treeEl.addEventListener('focusout', e => { if (!treeEl.contains(e.relatedTarget) && !pinned) untrace(); });
  treeEl.addEventListener('click', e => {
    const b = e.target.closest('.node');
    if (!b) return;
    pinned = pinned === b.dataset.node ? null : b.dataset.node;
    pinned ? trace(pinned) : untrace();
  });
  document.addEventListener('click', e => { if (pinned && !e.target.closest('.node')) { pinned = null; untrace(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && wrap.classList.contains('is-tracing')) { pinned = null; untrace(); document.activeElement?.blur(); } });

  drawLines();
  new ResizeObserver(() => { drawLines(); if (pinned) trace(pinned); }).observe(wrap);
  document.fonts?.ready.then(drawLines);
})();
