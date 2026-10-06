// IPS 4주차 가설 체인 → 붙여넣기용 정적 SVG(ips/w4/hypothesis-chain.svg).
// 브라우저에서 그려진 박스 위치와 글자 줄을 그대로 재서 만든다. CHAIN 글을 바꾸면 다시 뽑는다.
// 쓰는 법: node tools/dev-server.js . 5511 → 1440 폭 창에서 http://localhost:5511/ips/w4/ 를 열고
//   콘솔에서 `await import('/tools/w4-chain-svg.js').then(m => m.default())` → 나온 문자열을 hypothesis-chain.svg로 저장.
export default async function chainSVG() {
  await document.fonts.ready;
  const PAD = 24, ID_PT = 13.33, BODY_PT = 16;
  const wrap = document.getElementById('tree-wrap');
  const nodes = [...wrap.querySelectorAll('.node')];
  const rects = new Map(nodes.map(n => [n.dataset.node, n.getBoundingClientRect()]));
  const ox = Math.min(...[...rects.values()].map(r => r.left)) - PAD;
  const oy = Math.min(...[...rects.values()].map(r => r.top)) - PAD;
  const W = Math.ceil(Math.max(...[...rects.values()].map(r => r.right)) - ox + PAD);
  const H = Math.ceil(Math.max(...[...rects.values()].map(r => r.bottom)) - oy + PAD);
  const f = v => +v.toFixed(1);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 글꼴 윗선(ascent): Range 사각형의 위 + ascent = 기준선
  const ctx = document.createElement('canvas').getContext('2d');
  const ascent = (px, weight) => { ctx.font = `${weight} ${px}px ${getComputedStyle(document.body).fontFamily}`; return ctx.measureText('가').fontBoundingBoxAscent; };

  // 한 span 안의 글자를 줄별로 묶는다
  function lines(span) {
    const out = [];
    const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    for (let t; (t = walker.nextNode());) {
      for (let i = 0; i < t.length; i++) {
        const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1);
        const box = r.getClientRects()[0];
        if (!box) continue;
        const last = out[out.length - 1];
        if (last && Math.abs(last.top - box.top) < 4) last.text += t.data[i];
        else out.push({ top: box.top, left: box.left, text: t.data[i] });
      }
    }
    return out.map(l => ({ ...l, text: l.text.trim() })).filter(l => l.text);
  }

  const parentOf = new Map();
  (function walk(ul, parent) {
    for (const li of ul.children) {
      const id = li.querySelector(':scope > .node').dataset.node;
      if (parent) parentOf.set(id, parent);
      const sub = li.querySelector(':scope > ul');
      if (sub) walk(sub, id);
    }
  })(document.getElementById('tree'), null);
  const isPicked = id => wrap.querySelector(`[data-node="${CSS.escape(id)}"]`).classList.contains('is-picked');

  const paths = [...parentOf].map(([c, p]) => {
    const a = rects.get(p), b = rects.get(c);
    const x1 = f(a.right - ox), y1 = f(a.top - oy + a.height / 2), x2 = f(b.left - ox), y2 = f(b.top - oy + b.height / 2), dx = (x2 - x1) / 2;
    const on = isPicked(c) && isPicked(p);
    return `<path d="M${x1} ${y1} C${f(x1 + dx)} ${y1} ${f(x2 - dx)} ${y2} ${x2} ${y2}" stroke="${on ? '#333333' : '#dcdcdc'}" stroke-width="${on ? 1.6 : 1.2}"/>`;
  });

  const groups = nodes.map(n => {
    const id = n.dataset.node, r = rects.get(id), cls = n.classList;
    const picked = cls.contains('is-picked'), infer = cls.contains('is-infer');
    const x = r.left - ox, y = r.top - oy;
    const rect = infer
      ? `<rect x="${f(x + .5)}" y="${f(y + .5)}" width="${f(r.width - 1)}" height="${f(r.height - 1)}" rx="10" fill="#ffffff" stroke="#999999" stroke-dasharray="4 3"/>`
      : `<rect x="${f(x)}" y="${f(y)}" width="${f(r.width)}" height="${f(r.height)}" rx="10" fill="${picked ? '#333333' : '#ffffff'}" filter="url(#${picked ? 'shadow-dark' : 'shadow'})"/>`;
    const [idSpan, bodySpan] = n.children;
    const weight = cls.contains('is-top') ? 600 : 400;
    const idLines = lines(idSpan);
    if (cls.contains('is-cause') && idLines.length) idLines[idLines.length - 1].text += ' · 근본 원인'; // ::after는 Range에 잡히지 않는다
    const text = (ls, px, w, fill, attrW) => ls.map(l => `<text x="${f(l.left - ox)}" y="${f(l.top - oy + ascent(px, w))}" font-size="${px.toFixed(2)}"${attrW ? ` font-weight="${w}"` : ''} fill="${fill}">${esc(l.text)}</text>`).join('');
    return `<g id="${esc(id)}">${rect}${text(idLines, ID_PT, 400, picked ? '#a8a8a8' : '#999999', false)}${text(lines(bodySpan), BODY_PT, weight, picked ? '#ffffff' : '#555555', true)}</g>`;
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
