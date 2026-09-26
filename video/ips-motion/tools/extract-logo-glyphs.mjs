// Phi Brain 워드마크(Helvetica Neue Bold, 자간 -40/1000)의 글자 윤곽선을 JSON으로 뽑는다.
// B와 a는 확대 컷에서 점이 너무 많아 보여, 매끄러운 곡선을 합쳐 점 수를 줄인다(오차 4단위 이하).
// 폰트 파일은 저장소에 넣지 않는다 — 이 PC의 사용자 글꼴 폴더에서 읽는다.
//   node tools/extract-logo-glyphs.mjs [폰트 경로]
import fs from 'fs';
import opentype from 'opentype.js';

const fontPath = process.argv[2] || `${process.env.LOCALAPPDATA}/Microsoft/Windows/Fonts/HelveticaNeueBold.otf`;
const font = opentype.loadSync(fontPath);
const LINES = ['Phi', 'Brain'];

const r = (n) => Math.round(n * 10) / 10;
const pick = (c) => {
  const o = { type: c.type };
  for (const k of ['x1', 'y1', 'x2', 'y2', 'x', 'y']) if (c[k] !== undefined) o[k] = r(c[k]);
  return o;
};
// ---------- 점 줄이기: 매끄럽게 이어진 곡선 두 개를 곡선 하나로 다시 맞춘다 ----------
// 끝점과 양 끝 접선 방향은 그대로 두고 핸들 길이만 최소제곱으로 구한다(Schneider 방식).
// 원래 곡선과의 최대 오차가 TOL(폰트 단위) 이하일 때만 합친다.
const SIMPLIFY = new Set(['B', 'a']);
const TOL = 4;
const bez = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const unit = (v) => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
// segs: [{p0,p1,p2,p3}] 이어진 곡선들 → 곡선 하나(또는 null)
const fitOne = (segs) => {
  const pts = [];
  for (const s of segs) for (let k = 0; k < 24; k++) pts.push(bez(s.p0, s.p1, s.p2, s.p3, k / 24));
  const P0 = segs[0].p0, P3 = segs[segs.length - 1].p3;
  pts.push(P3);
  const t1 = unit(sub(segs[0].p1, P0)), t2 = unit(sub(segs[segs.length - 1].p2, P3));
  // 현 길이 매개변수
  const d = [0];
  for (let k = 1; k < pts.length; k++) d.push(d[k - 1] + len(sub(pts[k], pts[k - 1])));
  const u = d.map((v) => v / d[d.length - 1]);
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  pts.forEach((pt, k) => {
    const t = u[k], b0 = (1 - t) ** 3, b1 = 3 * t * (1 - t) ** 2, b2 = 3 * t * t * (1 - t), b3 = t ** 3;
    const A1 = [t1[0] * b1, t1[1] * b1], A2 = [t2[0] * b2, t2[1] * b2];
    c00 += A1[0] * A1[0] + A1[1] * A1[1]; c01 += A1[0] * A2[0] + A1[1] * A2[1]; c11 += A2[0] * A2[0] + A2[1] * A2[1];
    const tmp = [pt[0] - (P0[0] * (b0 + b1) + P3[0] * (b2 + b3)), pt[1] - (P0[1] * (b0 + b1) + P3[1] * (b2 + b3))];
    x0 += A1[0] * tmp[0] + A1[1] * tmp[1]; x1 += A2[0] * tmp[0] + A2[1] * tmp[1];
  });
  const det = c00 * c11 - c01 * c01;
  if (Math.abs(det) < 1e-9) return null;
  const a1 = (x0 * c11 - x1 * c01) / det, a2 = (c00 * x1 - c01 * x0) / det;
  if (a1 <= 0 || a2 <= 0) return null;
  const p1 = [P0[0] + t1[0] * a1, P0[1] + t1[1] * a1], p2 = [P3[0] + t2[0] * a2, P3[1] + t2[1] * a2];
  // 오차: 원래 점마다 맞춘 곡선 위 가장 가까운 점까지
  const fit = Array.from({ length: 121 }, (_, k) => bez(P0, p1, p2, P3, k / 120));
  const err = Math.max(...pts.map((pt) => Math.min(...fit.map((q) => len(sub(pt, q))))));
  return err <= TOL ? { p0: P0, p1, p2, p3: P3 } : null;
};
const smoothJoin = (a, b) => { // a 끝과 b 시작의 접선이 거의 같은 방향
  const ta = unit(sub(a.p3, a.p2)), tb = unit(sub(b.p1, b.p0));
  return ta[0] * tb[0] + ta[1] * tb[1] > Math.cos((8 * Math.PI) / 180);
};
const simplify = (cmds) => {
  // 명령 → 윤곽별 조각 목록(L은 그대로, C만 합친다)
  const out = [];
  let cur = null, contour = [];
  const flush = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (let k = 0; k + 1 < contour.length; k++) {
        const a = contour[k], b = contour[k + 1];
        if (a.type !== 'C' || b.type !== 'C' || !smoothJoin(a, b)) continue;
        const m = fitOne([...(a.src || [a]), ...(b.src || [b])]);
        if (!m) continue;
        contour.splice(k, 2, { type: 'C', ...m, src: [...(a.src || [a]), ...(b.src || [b])] });
        changed = true;
        break;
      }
    }
    for (const s of contour) out.push(s.type === 'C' ? { type: 'C', x1: s.p1[0], y1: s.p1[1], x2: s.p2[0], y2: s.p2[1], x: s.p3[0], y: s.p3[1] } : { type: s.type, x: s.p3[0], y: s.p3[1] });
    contour = [];
  };
  for (const c of cmds) {
    if (c.type === 'M') { out.push(c); cur = [c.x, c.y]; continue; }
    if (c.type === 'Z') { flush(); out.push(c); continue; }
    const p3 = [c.x, c.y];
    contour.push(c.type === 'C' ? { type: 'C', p0: cur, p1: [c.x1, c.y1], p2: [c.x2, c.y2], p3 } : { type: c.type, p0: cur, p3 });
    cur = p3;
  }
  return out;
};

const lines = LINES.map((text) => {
  const glyphs = font.stringToGlyphs(text);
  let x = 0;
  return glyphs.map((g, i) => {
    const kern = i > 0 ? font.getKerningValue(glyphs[i - 1], g) : 0;
    x += kern;
    const out = {
      char: text[i],
      x: r(x), // 자간을 넣기 전 위치(커닝 포함), 폰트 단위
      advance: r(g.advanceWidth),
      // y는 위가 + (폰트 좌표). 그릴 때 뒤집는다.
      commands: (SIMPLIFY.has(text[i]) ? simplify(g.path.commands) : g.path.commands).map(pick),
    };
    x += g.advanceWidth;
    return out;
  });
});

// 인트로 P 컷의 굵기 보간용 — Medium의 P는 Bold와 점 구조가 같다(다른 글자는 다르다)
const medium = opentype.loadSync(fontPath.replace('Bold', 'Medium'));
const mediumP = medium.charToGlyph('P').path.commands.map(pick);
if (mediumP.map((c) => c.type).join('') !== lines[0][0].commands.map((c) => c.type).join('')) throw new Error('Medium P 점 구조가 Bold와 다르다');

const data = {
  source: 'Helvetica Neue Bold',
  unitsPerEm: font.unitsPerEm,
  capHeight: r(font.charToGlyph('H').getBoundingBox().y2), // 실제 평평한 윗변(OS/2 값은 700으로 12 낮다)
  xHeight: r(font.charToGlyph('x').getBoundingBox().y2),
  tracking: -40, // 첨부 워드마크에서 잰 값
  lineGap: 809, // 두 줄 기준선 간격(폰트 단위) — 첨부 워드마크에서 잰 값
  lines,
  variants: { mediumP },
};
fs.writeFileSync(new URL('../src/intro/logo-glyphs.json', import.meta.url), JSON.stringify(data));
console.log('glyphs', lines.flat().map((g) => `${g.char}:${g.commands.length}`).join(' '), 'cap', data.capHeight, 'x', data.xHeight);
