/* IPS 4주차 가설 체인: 데이터(CHAIN) → 중첩 목록 → 박스 사이 선(SVG). 페이지의 .tree-wrap마다 그린다(상세 · 미니멀).
   picked = 선택한 체인, cause = 체인 끝의 근본 원인, infer = 관찰 근거 없이 추론한 가설.
   note는 박스 안 본문 아래에 늘 펼쳐 둔다(상황 · 근거 · 추론 · 확인 방법). */
(() => {
  const CHAIN = {
    id: '현상', top: true, picked: true,
    text: '사용자는 관심사별로 쌓아 둔 저장물에서 필요한 것을 골라내지 못해, 처음부터 하나씩 눌러 확인한다',
    note: { 상황: "디자인 레퍼런스, 화장법·화장품, 패션, 아이돌, 음악처럼 관심사별로 '언젠가 쓸 것 같아서' 저장하고, 그것이 필요해진 순간 되돌아간다.", 근거: "내 경우(디자이너): 작업에 쓸 화면 전환 레퍼런스가 필요해 '디자인' 컬렉션을 열지만, 처음부터 스크롤하며 하나씩 눌러 본다(장면 2).", 확인: '디자인 외 관심사로 저장하는 사람도 같은 방식으로 찾는지 묻는다.' },
    children: [
      {
        id: 'A', picked: true, text: "저장물에 '무엇이 왜 쓸모 있었는지'가 남지 않는다",
        note: { 근거: '저장물에는 게시물과 저장한 순서만 남는다. 내 경우 분야별로 컬렉션을 따로 만들어도 저장한 맥락은 전혀 담기지 않았다.', 확인: '최근 다시 찾은 저장물 하나를 떠올리게 하고, 찾을 때 무엇이 기억났는지(장면·색·곡 같은 부분인지, 계정·전체 인상인지) 묻는다.' },
        children: [
          {
            id: 'A-1', picked: true, text: '저장은 게시물 통째로 되는데, 쓸모는 그 안의 한 부분이다',
            note: { 근거: '내 경우 쓸모 있는 것은 화면 전환 하나, 튜토리얼의 한 단계다. 화장법 영상의 한 단계, 코디 속 아이템 하나, 릴스에 깔린 곡 하나도 같은 구조일 것이다.', 확인: '관심사가 다른 사용자에게, 저장한 게시물에서 실제로 쓴 것이 전체였는지 일부였는지 묻는다.' },
            children: [
              { id: 'A-1-a', picked: true, cause: true, text: "Saved는 '보관'만 한다 — 그 부분과 맥락을 덧붙일 자리가 없다", note: { 근거: '저장 버튼에는 컬렉션 고르기만 있고, 저장한 뒤에도 메모나 표시를 남길 수 없다. 관심사와 상관없이 모두가 같은 저장 기능을 쓴다.', 추론: '인스타그램에게 저장은 다시 꺼내 쓰는 기록보다 추천에 쓰는 관심 신호일 수 있다. 그렇다면 정리 기능이 뒤로 밀린 이유가 설명된다.', 확인: '그 부분을 표시할 수 있다면 쓰겠는지, 지금은 어디서 대신하는지(스크린샷, 메모 앱, 노션, 핀터레스트 등) 묻는다.' } },
            ],
          },
          {
            id: 'A-2', text: "저장하는 순간엔 쓸 곳이 정해져 있지 않다('언젠가')",
            note: { 근거: '당장 쓰려고 저장하지 않는다. 언젠가 쓸 것 같아서 저장한다.' },
            children: [
              { id: 'A-2-a', infer: true, text: '그래서 이유를 따로 남기지 않고, 나중에 기억날 거라 여긴다', note: { 근거: '추론 — 관찰 근거는 없다. A-1-a와 겨루는 가설: 남길 자리가 있어도 남기지 않는다면 이쪽이 원인이다.', 확인: '저장할 때 이유를 따로 적어 두는지, 다시 볼 때 이유가 기억나는지 묻는다.' } },
            ],
          },
        ],
      },
      {
        id: 'B', text: '한 컬렉션에 서로 다른 주제가 함께 들어 있다',
        note: { 근거: "'섞였다'의 정의 — 내 '디자인' 컬렉션에 모션그래픽, 브랜딩 디자인, 제품 렌더링이 함께 있어 한 분야만 골라 볼 수 없다.", 확인: '가장 큰 컬렉션 하나를 열어 주제가 몇 개 섞여 있는지 센다.' },
        children: [
          { id: 'B-1', text: '저장하는 순간 세부 주제까지 고르면 흐름이 끊겨 큰 컬렉션에 넣는다', note: { 근거: '컬렉션을 잘게 만들수록 고를 목록이 길어진다. 저장은 피드를 넘기는 도중에 한다.', 확인: '컬렉션을 더 잘게 나누지 않는 이유를 묻는다.' } },
          { id: 'B-2', text: '넣은 뒤에는 컬렉션 안에서 다시 나누거나 순서를 바꿀 수 없다', note: { 근거: '컬렉션 안에는 하위 분류가 없고, 저장한 순서대로 쌓인다(장면 3·4).' } },
        ],
      },
      {
        id: 'C', text: '저장 화면의 단서(썸네일·저장 순서)로는 찾는 것을 알아볼 수 없다',
        note: { 근거: '스크롤뿐이어도 썸네일을 보고 알아보면 찾는다. 못 찾는 것은 화면에 보이는 단서와 기억하는 단서가 다를 때다.' },
        children: [
          { id: 'C-1', text: '릴스·영상은 커버 한 장이라 쓸모 있던 장면이 보이지 않는다', note: { 근거: '화면 전환, 화장 단계, 착장처럼 영상 중간의 한 장면이 핵심인데, 격자에는 멈춘 커버 한 장만 보인다.' } },
          { id: 'C-2', text: "저장 순서로 놓여 있는데, 기억나는 건 '언제'가 아니라 '무엇'이다", note: { 확인: '그 저장물을 언제 저장했는지 기억하는지 묻는다.' } },
        ],
      },
    ],
  };

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const parentOf = new Map();
  const byId = new Map();
  (function index(n, parent) {
    byId.set(n.id, n);
    if (parent) parentOf.set(n.id, parent.id);
    n.children?.forEach(c => index(c, n));
  })(CHAIN, null);

  // 같은 CHAIN을 두 번 그린다: 상세(메모 펼침)와 미니멀(번호 + 가설 문장만, data-notes="off")
  function nodeHTML(n, withNotes) {
    const cls = ['node', n.top && 'is-top', n.picked && 'is-picked', n.cause && 'is-cause', n.infer && 'is-infer'].filter(Boolean).join(' ');
    const kids = n.children?.length ? `<ul>${n.children.map(c => nodeHTML(c, withNotes)).join('')}</ul>` : '';
    const tag = [n.top ? '현상' : n.id, n.infer && '추론', n.cause && '근본 원인'].filter(Boolean).join(' · ');
    const notes = withNotes ? Object.entries(n.note || {}).map(([k, v]) => `<span class="note"><b>${esc(k)}</b> ${esc(v)}</span>`).join('') : '';
    return `<li><button type="button" class="${cls}" data-node="${esc(n.id)}"><span class="node-id">${esc(tag)}</span><span class="node-text">${esc(n.text)}</span>${notes && `<span class="node-notes">${notes}</span>`}</button>${kids}</li>`;
  }

  const vertical = () => matchMedia('(max-width:940px)').matches;
  const trees = [];

  function mount(wrap) {
    const treeEl = wrap.querySelector('.tree');
    const svg = wrap.querySelector('.tree-lines');
    if (!treeEl || !svg) return;
    treeEl.innerHTML = nodeHTML(CHAIN, wrap.dataset.notes !== 'off');
    const box = id => treeEl.querySelector(`[data-node="${CSS.escape(id)}"]`);

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
    }
    function untrace() {
      wrap.classList.remove('is-tracing');
      treeEl.querySelectorAll('.is-on').forEach(el => el.classList.remove('is-on'));
      svg.querySelectorAll('.is-on').forEach(el => el.classList.remove('is-on'));
    }
    const t = { wrap, pinned: null, trace, untrace, drawLines };
    // 누른 박스는 다른 박스를 누르거나 바깥을 누를 때까지 켜 둔다(터치 화면)
    treeEl.addEventListener('pointerover', e => { const b = e.target.closest('.node'); if (b && !t.pinned) trace(b.dataset.node); });
    treeEl.addEventListener('pointerleave', () => { if (!t.pinned) untrace(); });
    treeEl.addEventListener('focusin', e => { const b = e.target.closest('.node'); if (b) trace(b.dataset.node); });
    treeEl.addEventListener('focusout', e => { if (!treeEl.contains(e.relatedTarget) && !t.pinned) untrace(); });
    treeEl.addEventListener('click', e => {
      const b = e.target.closest('.node');
      if (!b) return;
      t.pinned = t.pinned === b.dataset.node ? null : b.dataset.node;
      t.pinned ? trace(t.pinned) : untrace();
    });

    drawLines();
    new ResizeObserver(() => { drawLines(); if (t.pinned) trace(t.pinned); }).observe(wrap);
    document.fonts?.ready.then(drawLines);
    trees.push(t);
  }

  document.querySelectorAll('.tree-wrap').forEach(mount);
  document.addEventListener('click', e => {
    trees.forEach(t => { if (t.pinned && !t.wrap.contains(e.target.closest('.node'))) { t.pinned = null; t.untrace(); } });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    trees.forEach(t => { if (t.wrap.classList.contains('is-tracing')) { t.pinned = null; t.untrace(); } });
    document.activeElement?.blur();
  });
})();
