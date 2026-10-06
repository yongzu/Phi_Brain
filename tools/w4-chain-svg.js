// IPS 4주차 가설 체인 → 붙여넣기용 정적 SVG(ips/w4/hypothesis-chain.svg).
// 브라우저에서 그려진 박스 위치와 글자 줄을 그대로 재서 만든다. CHAIN 글을 바꾸면 다시 뽑는다.
// 글자 색·크기·굵기는 그려진 스타일(getComputedStyle)을 읽고, 반투명 색은 박스 바탕과 섞어 단색으로 쓴다.
// 쓰는 법: node tools/dev-server.js . 5511 → 1440 폭 창에서 http://localhost:5511/ips/w4/ 를 열고
//   콘솔에서 `await import('/tools/w4-chain-svg.js').then(m => m.default())` → 나온 문자열을 hypothesis-chain.svg로 저장.
//   미니멀 버전은 `m.default('#tree-min')` → hypothesis-chain-min.svg.
export default async function chainSVG(selector = '#tree-detail') {
  await document.fonts.ready;
  const PAD = 24;
  const wrap = document.querySelector(selector);
  const nodes = [...wrap.querySelectorAll('.node')];
  // 강조·hover 이동(translateX)이 없는 상태에서 잰다
  wrap.classList.remove('is-tracing');
  nodes.forEach(n => n.classList.remove('is-on'));
  const rects = new Map(nodes.map(n => [n.dataset.node, n.getBoundingClientRect()]));
  const all = [...rects.values()];
  const ox = Math.min(...all.map(r => r.left)) - PAD;
  const oy = Math.min(...all.map(r => r.top)) - PAD;
  const W = Math.ceil(Math.max(...all.map(r => r.right)) - ox + PAD);
  const H = Math.ceil(Math.max(...all.map(r => r.bottom)) - oy + PAD);
  const f = v => +v.toFixed(1);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const rgba = c => { const m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] ?? 1]; };
  const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const solid = (c, bg) => { const [r, g, b, a] = rgba(c), [br, bgg, bb] = rgba(bg); return hex([r * a + br * (1 - a), g * a + bgg * (1 - a), b * a + bb * (1 - a)]); };

  // 글꼴 ascent: 글자 Range 사각형의 위 + ascent = 기준선
  const ctx = document.createElement('canvas').getContext('2d');
  const family = getComputedStyle(document.body).fontFamily;
  const ascent = (px, weight) => { ctx.font = `${weight} ${px}px ${family}`; return ctx.measureText('가').fontBoundingBoxAscent; };

  // 박스 안 글자를 줄 → 같은 스타일 조각(run)으로 묶는다
  function textLines(node, bg) {
    const out = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let t; (t = walker.nextNode());) {
      const cs = getComputedStyle(t.parentElement);
      const style = { size: parseFloat(cs.fontSize), weight: cs.fontWeight, fill: solid(cs.color, bg) };
      const key = `${style.size}|${style.weight}|${style.fill}`;
      for (let i = 0; i < t.length; i++) {
        const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1);
        const box = r.getClientRects()[0];
        if (!box || !box.width) continue;
        let line = out.find(l => Math.abs(l.top - box.top) < 4);
        if (!line) out.push(line = { top: box.top, runs: [] });
        const run = line.runs[line.runs.length - 1];
        if (run && run.key === key) run.text += t.data[i];
        else line.runs.push({ key, style, left: box.left, text: t.data[i] });
      }
    }
    out.sort((a, b) => a.top - b.top);
    for (const l of out) { l.runs[0].text = l.runs[0].text.trimStart(); l.runs[l.runs.length - 1].text = l.runs[l.runs.length - 1].text.trimEnd(); }
    return out;
  }

  const parentOf = new Map();
  (function walk(ul, parent) {
    for (const li of ul.children) {
      const id = li.querySelector(':scope > .node').dataset.node;
      if (parent) parentOf.set(id, parent);
      const sub = li.querySelector(':scope > ul');
      if (sub) walk(sub, id);
    }
  })(wrap.querySelector('.tree'), null);
  const isPicked = id => wrap.querySelector(`[data-node="${CSS.escape(id)}"]`).classList.contains('is-picked');

  const paths = [...parentOf].map(([c, p]) => {
    const a = rects.get(p), b = rects.get(c);
    const x1 = f(a.right - ox), y1 = f(a.top - oy + a.height / 2), x2 = f(b.left - ox), y2 = f(b.top - oy + b.height / 2), dx = (x2 - x1) / 2;
    const on = isPicked(c) && isPicked(p);
    return `<path d="M${x1} ${y1} C${f(x1 + dx)} ${y1} ${f(x2 - dx)} ${y2} ${x2} ${y2}" stroke="${on ? '#333333' : '#dcdcdc'}" stroke-width="${on ? 1.6 : 1.2}"/>`;
  });

  const groups = nodes.map(n => {
    const id = n.dataset.node, r = rects.get(id);
    const picked = n.classList.contains('is-picked'), infer = n.classList.contains('is-infer');
    const bg = getComputedStyle(n).backgroundColor;
    const x = r.left - ox, y = r.top - oy;
    const rect = infer
      ? `<rect x="${f(x + .5)}" y="${f(y + .5)}" width="${f(r.width - 1)}" height="${f(r.height - 1)}" rx="10" fill="#ffffff" stroke="#999999" stroke-dasharray="4 3"/>`
      : `<rect x="${f(x)}" y="${f(y)}" width="${f(r.width)}" height="${f(r.height)}" rx="10" fill="${solid(bg, 'rgb(255,255,255)')}" filter="url(#${picked ? 'shadow-dark' : 'shadow'})"/>`;
    // 본문과 메모 사이 구분선
    const notes = n.querySelector('.node-notes');
    let rule = '';
    if (notes) {
      const nr = notes.getBoundingClientRect(), cs = getComputedStyle(notes);
      rule = `<line x1="${f(nr.left - ox)}" y1="${f(nr.top - oy + .5)}" x2="${f(nr.right - ox)}" y2="${f(nr.top - oy + .5)}" stroke="${solid(cs.borderTopColor, bg)}" stroke-width="1"/>`;
    }
    const texts = textLines(n, bg).map(l => {
      const base = f(l.top - oy + ascent(l.runs[0].style.size, l.runs[0].style.weight));
      const spans = l.runs.filter(run => run.text).map(run => `<tspan x="${f(run.left - ox)}" font-size="${run.style.size.toFixed(2)}" font-weight="${run.style.weight}" fill="${run.style.fill}">${esc(run.text)}</tspan>`).join('');
      return `<text y="${base}">${spans}</text>`;
    }).join('');
    return `<g id="${esc(id)}">${rect}${rule}${texts}</g>`;
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Pretendard, 'Pretendard Variable', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif">`,
    `<defs><filter id="shadow" x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="#000" flood-opacity="0.06"/><feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.03"/></filter><filter id="shadow-dark" x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="#000" flood-opacity="0.12"/></filter></defs>`,
    `<rect width="${W}" height="${H}" fill="#ffffff"/>`,
    `<g fill="none" stroke-linecap="round">`, ...paths, `</g>`,
    ...groups,
    `</svg>`, '',
  ].join('\n');
}
