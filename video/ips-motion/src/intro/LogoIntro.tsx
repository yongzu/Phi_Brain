// 로고 인트로 (약 8초) — 본편 앞에 따로 붙이는 영상. 검정 바탕에 흰 윤곽선 · 옅은 흰 핸들과 가이드 → 조합 단계에서 흰 바탕으로 서서히 반전.
// 1) 글자 확대: 원형에 가까운 모양에서 굵기 · 너비 · 획 길이가 제자리로 온다 (P → B → n, 하드 컷)
// 2) 워드마크: 검정 화면에서 카메라가 뒤로 빠지며 글자가 드러나고, 가이드가 서서히 사라진다
// 3) 워드마크가 크기 그대로 오른쪽으로 가며, 왼쪽에 로고 마크 칸이 가운데부터 채워져 헤더와 같은 조합(마크 + 워드마크)으로 선다
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, EASE, H, W, sec } from '../theme';
import GLYPHS from './logo-glyphs.json';

type Cmd = { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };
type Glyph = { char: string; x: number; advance: number; commands: Cmd[] };
type Pt = [number, number];

const LINES = GLYPHS.lines as Glyph[][];
const CAP = GLYPHS.capHeight;
const XH = GLYPHS.xHeight;
const TRACK = GLYPHS.tracking;
const GAP = GLYPHS.lineGap;
const INK_LEFT = 68; // B의 왼쪽 여백(P는 70) — 워드마크 잉크의 왼쪽 끝

const ramp = (f: number, a: number, b: number, easing = EASE) =>
  interpolate(f, [a, b], [0, 1], { easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const mix = (a: number, b: number, p: number) => a + (b - a) * p;

// 색: 베지어 구간은 검정 바탕 + 흰 선, 워드마크가 오른쪽으로 갈 때 흰 바탕 + 잉크로 서서히 반전.
// 위계는 영상 전체와 같은 투명도 100 · 70 · 20% — 어두운 바탕에서는 흰색에 같은 비율을 쓴다.
type Pal = { bg: string; line: string; handle: string; guide: string };
const DARK: Pal = { bg: '#000000', line: C.white, handle: 'rgba(255, 255, 255, 0.7)', guide: 'rgba(255, 255, 255, 0.2)' };
const LIGHT: Pal = { bg: C.white, line: C.ink, handle: C.secondary, guide: C.tertiary };
/** #rrggbb 두 색 사이 */
const mixHex = (a: string, b: string, p: number) => {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(mix(ch(a, i), ch(b, i), p))).join(', ')})`;
};

/** 한 줄 안에서 i번째 글자의 원점(자간 반영, 폰트 단위) */
const glyphX = (g: Glyph, i: number, track: number) => g.x + i * track;

/** 워드마크 잉크 오른쪽 끝(폰트 단위) — 두 줄 중 긴 쪽 */
const inkRight = (track: number) =>
  Math.max(...LINES.map((line) => {
    const i = line.length - 1;
    const g = line[i];
    const xs = g.commands.flatMap((c) => [c.x, c.x1, c.x2].filter((v): v is number => v !== undefined));
    return glyphX(g, i, track) + Math.max(...xs);
  }));

// ---------- 글자 조정: 원형에서 시작해 굵기 · 너비 · 곡선 장력 · 획 길이가 제자리로 온다 ----------
const key = (x: number, y: number) => `${x},${y}`;
type Part = { d: number; from: number; to: number }; // 옮길 거리(폰트 단위)와 컷 안에서 움직이는 구간(프레임)
type Adjust = { kind: 'weight-p' } | { kind: 'bowls'; from: number; split: number; lower: Part; upper: Part } | { kind: 'thin-arch'; d: number; drop: number };

/** 모든 좌표(앵커·핸들)에 같은 함수 */
const mapPts = (cmds: Cmd[], fn: (x: number, y: number) => Pt): Cmd[] => cmds.map((c) => {
  const o: Cmd = { ...c };
  if (c.x !== undefined) [o.x, o.y] = fn(c.x, c.y!);
  if (c.x1 !== undefined) [o.x1, o.y1] = fn(c.x1, c.y1!);
  if (c.x2 !== undefined) [o.x2, o.y2] = fn(c.x2, c.y2!);
  return o;
});

const norm = (v: Pt): Pt => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

/** 획 굵기 바꾸기: 앵커를 윤곽선 바깥쪽(진행 방향 오른쪽 — CFF 윤곽은 바깥이 반시계)으로 d만큼. 핸들은 자기 앵커를 따라 평행 이동 */
const embolden = (cmds: Cmd[], d: number): Cmd[] => {
  if (!d) return cmds;
  const out = cmds.map((c) => ({ ...c }));
  // 윤곽(M … Z)마다
  let i = 0;
  while (i < cmds.length) {
    if (cmds[i].type !== 'M') { i++; continue; }
    const idx: number[] = [];
    let j = i;
    for (; j < cmds.length && cmds[j].type !== 'Z'; j++) idx.push(j);
    const pt = (k: number): Pt => [cmds[k].x!, cmds[k].y!];
    const last = idx[idx.length - 1];
    const dup = idx.length > 1 && key(...pt(last)) === key(...pt(i)); // 마지막 점이 시작점과 같다
    const nodes = dup ? idx.slice(0, -1) : idx;
    const n = nodes.length;
    const inDir = (a: number): Pt => { // a = nodes 안 위치
      const k = a === 0 ? (dup ? last : -1) : nodes[a];
      if (k >= 0 && cmds[k].type === 'C') {
        const v: Pt = [cmds[k].x! - cmds[k].x2!, cmds[k].y! - cmds[k].y2!];
        if (Math.hypot(...v) > 0.5) return norm(v);
      }
      const p0 = pt(nodes[(a - 1 + n) % n]);
      const p1 = pt(nodes[a]);
      return norm([p1[0] - p0[0], p1[1] - p0[1]]);
    };
    const outDir = (a: number): Pt => {
      const nk = a + 1 < n ? nodes[a + 1] : (dup ? last : -1); // 다음 명령
      if (nk >= 0 && cmds[nk].type === 'C') {
        const p = pt(nodes[a]);
        const v: Pt = [cmds[nk].x1! - p[0], cmds[nk].y1! - p[1]];
        if (Math.hypot(...v) > 0.5) return norm(v);
      }
      const p0 = pt(nodes[a]);
      const p1 = pt(nodes[(a + 1) % n]);
      return norm([p1[0] - p0[0], p1[1] - p0[1]]);
    };
    const off: Pt[] = nodes.map((_, a) => {
      const ti = inDir(a), to = outDir(a);
      const ni: Pt = [ti[1], -ti[0]], no: Pt = [to[1], -to[0]];
      const m = norm([ni[0] + no[0], ni[1] + no[1]]);
      const miter = 1 / Math.max(0.5, m[0] * ni[0] + m[1] * ni[1]);
      return [m[0] * d * miter, m[1] * d * miter];
    });
    const offOf = (k: number): Pt => { const a = nodes.indexOf(k); return a >= 0 ? off[a] : off[0]; };
    idx.forEach((k, a) => {
      const o = offOf(k);
      out[k].x = cmds[k].x! + o[0];
      out[k].y = cmds[k].y! + o[1];
      if (cmds[k].type === 'C') {
        const po = offOf(idx[a - 1]);
        out[k].x1 = cmds[k].x1! + po[0];
        out[k].y1 = cmds[k].y1! + po[1];
        out[k].x2 = cmds[k].x2! + o[0];
        out[k].y2 = cmds[k].y2! + o[1];
      }
    });
    i = j + 1;
  }
  return out;
};

/** 앵커마다 옮길 양을 정하고, 핸들은 자기 앵커를 따라 평행 이동 */
const moveAnchors = (cmds: Cmd[], off: (x: number, y: number) => Pt): Cmd[] => {
  let prevOff: Pt = [0, 0];
  return cmds.map((c) => {
    if (c.x === undefined) return c;
    const o = off(c.x, c.y!);
    const out: Cmd = { ...c, x: c.x + o[0], y: c.y! + o[1] };
    if (c.type === 'C') {
      out.x1 = c.x1! + prevOff[0]; out.y1 = c.y1! + prevOff[1];
      out.x2 = c.x2! + o[0]; out.y2 = c.y2! + o[1];
    }
    prevOff = o;
    return out;
  });
};

/** 컷 안 프레임 f에서의 모양. 조정은 처음(f = 0)에 가장 크고 끝에서 원형이 된다 */
const adjust = (cmds: Cmd[], a: Adjust, f: number): Cmd[] => {
  if (a.kind === 'bowls') {
    // Figma에서 볼의 점만 골라 옮기듯: 세로 획은 그대로, 아래 볼과 위 볼이 시차를 두고 각자 다른 길이만큼 — 가로 직선만 늘어난다
    const qL = 1 - ramp(f, a.lower.from, a.lower.to, SHOT_EASE);
    const qU = 1 - ramp(f, a.upper.from, a.upper.to, SHOT_EASE);
    return moveAnchors(cmds, (x, y) => {
      if (x <= a.from) return [0, 0];
      const lo = -a.lower.d * qL, up = -a.upper.d * qU;
      return [Math.abs(y - a.split) < 1 ? (lo + up) / 2 : y < a.split ? lo : up, 0]; // 가운데 이음 점은 둘의 중간
    });
  }
  const q = 1 - ramp(f, 0, SHOT_LEN + sec(0.1), SHOT_EASE);
  if (q <= 0) return cmds;
  switch (a.kind) {
    case 'weight-p': { // 실제 Medium → Bold 보간(Medium보다 조금 더 가는 쪽에서 출발)
      const from = GLYPHS.variants.mediumP as Cmd[];
      const t = 1 - q * 1.4;
      return cmds.map((c, k) => {
        const m = from[k];
        const o: Cmd = { ...c };
        for (const f of ['x', 'y', 'x1', 'y1', 'x2', 'y2'] as const) if (c[f] !== undefined) o[f] = mix(m[f]!, c[f]!, t);
        return o;
      });
    }
    case 'thin-arch': { // 획이 가늘고 어깨가 낮은 데서 → 굵어지며 어깨가 올라온다
      const thin = embolden(cmds, a.d * q);
      const lift = (y: number) => a.drop * q * interpolate(y, [260, 520], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      return mapPts(thin, (x, y) => [x, y - lift(y)]);
    }
  }
};

/** 조정으로 가장 많이 움직이는 앵커(초점 근처) — 가이드가 이 점들을 따라간다 */
const moverIdx = (cmds: Cmd[], moved: Cmd[], focus: Pt, n = 3) =>
  cmds.map((c, k) => ({ k, c, d: c.x === undefined ? 0 : Math.hypot(moved[k].x! - c.x, moved[k].y! - c.y!) }))
    .filter(({ c, d }) => d > 2 && Math.hypot(c.x! - focus[0], c.y! - focus[1]) < 420)
    .sort((a, b) => b.d - a.d)
    .filter((m, i, arr) => arr.findIndex((o) => Math.abs(o.c.x! - m.c.x!) < 30 && Math.abs(o.c.y! - m.c.y!) < 30) === i)
    .slice(0, n)
    .map(({ k }) => k);

// ---------- 그리기 ----------
type View = { ox: number; oy: number; s: number }; // 원점(기준선 왼쪽)의 화면 좌표와 배율(px/단위)
const toScreen = (v: View, gx: number) => (x: number, y: number): Pt => [v.ox + (gx + x) * v.s, v.oy - y * v.s];

const pathD = (cmds: Cmd[], t: (x: number, y: number) => Pt) =>
  cmds.map((c) => {
    if (c.type === 'Z') return 'Z';
    const [x, y] = t(c.x!, c.y!);
    if (c.type === 'C') {
      const [a, b] = t(c.x1!, c.y1!);
      const [d, e] = t(c.x2!, c.y2!);
      return `C${a.toFixed(1)} ${b.toFixed(1)} ${d.toFixed(1)} ${e.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return `${c.type}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join('');

/** 윤곽선 + (detail만큼) 핸들 · 조절점 · 앵커. fill은 0→1로 선 색 채움 */
const GlyphDraw: React.FC<{ cmds: Cmd[]; t: (x: number, y: number) => Pt; pal: Pal; detail: number; fill?: number; stroke?: number }> = ({ cmds, t, pal, detail, fill = 0, stroke = 3 }) => {
  const handles: [Pt, Pt][] = [];
  const ctrls: Pt[] = [];
  const anchors = new Map<string, Pt>();
  let prev: Pt = [0, 0];
  for (const c of cmds) {
    if (c.x === undefined) continue;
    const p = t(c.x, c.y!);
    if (c.type === 'C') {
      const a = t(c.x1!, c.y1!);
      const b = t(c.x2!, c.y2!);
      handles.push([prev, a], [b, p]);
      ctrls.push(a, b);
    }
    anchors.set(key(Math.round(p[0]), Math.round(p[1])), p);
    prev = p;
  }
  return (
    <g>
      <path d={pathD(cmds, t)} fill={pal.line} fillOpacity={fill} fillRule="nonzero" stroke={pal.line} strokeWidth={stroke} strokeOpacity={1 - fill * 0.999} strokeLinejoin="round" />
      {detail > 0 && (
        <g opacity={detail}>
          {handles.map(([a, b], i) => <line key={`h${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={pal.handle} strokeWidth={2} />)}
          {ctrls.map((p, i) => <circle key={`c${i}`} cx={p[0]} cy={p[1]} r={6} fill={pal.bg} stroke={pal.handle} strokeWidth={2} />)}
          {[...anchors.values()].map((p, i) => <rect key={`a${i}`} x={p[0] - 6.5} y={p[1] - 6.5} width={13} height={13} fill={pal.line} />)}
        </g>
      )}
    </g>
  );
};

const HLine: React.FC<{ y: number; c: string; o?: number }> = ({ y, c, o = 1 }) =>
  <line x1={-10} y1={y} x2={W + 10} y2={y} stroke={c} strokeWidth={1.5} opacity={o} vectorEffect="non-scaling-stroke" />;
const VLine: React.FC<{ x: number; c: string; o?: number }> = ({ x, c, o = 1 }) =>
  <line x1={x} y1={-10} x2={x} y2={H + 10} stroke={c} strokeWidth={1.5} opacity={o} vectorEffect="non-scaling-stroke" />;

// ---------- 1) 글자 확대 ----------
// pan: 컷 동안 카메라가 움직이는 방향과 거리(폰트 단위, y는 위가 +) — 줌은 그대로
const SHOTS: { line: number; i: number; focus: Pt; s: number; adj: Adjust; pan: Pt }[] = [
  { line: 0, i: 0, focus: [470, 520], s: 2.1, adj: { kind: 'weight-p' }, pan: [0, -170] }, // P: 굵기 · 카메라 위 → 아래
  { line: 1, i: 0, focus: [520, 380], s: 2.0, adj: { kind: 'bowls', from: 300, split: 386, lower: { d: 140, from: 0, to: sec(1.05) }, upper: { d: 80, from: sec(0.25), to: sec(1.05) } }, pan: [170, 0] }, // B: 아래 볼이 먼저 시작, 둘이 같이 끝남 · 카메라 왼쪽 → 오른쪽
  { line: 1, i: 4, focus: [300, 470], s: 2.3, adj: { kind: 'thin-arch', d: -24, drop: 46 }, pan: [0, 150] }, // n: 획 굵기 + 어깨 높이 · 카메라 아래 → 위
];
const SHOT_LEN = sec(0.95);
const SHOT_EASE = Easing.bezier(0.45, 0, 0.2, 1);
const WORD_AT = SHOT_LEN * SHOTS.length; // 2.85초
export const INTRO_DURATION = WORD_AT + sec(4.9);

const CloseUp: React.FC<{ n: number; f: number }> = ({ n, f }) => {
  const shot = SHOTS[n];
  const line = LINES[shot.line];
  const g = line[shot.i];
  const p = ramp(f, 0, SHOT_LEN + sec(0.1), SHOT_EASE); // 컷 끝까지 계속 움직인다
  const s = shot.s * (1 + 0.05 * p);
  const fx = glyphX(g, shot.i, TRACK) + shot.focus[0] + shot.pan[0] * (p - 0.5); // 카메라 이동(초점이 가운데를 지나간다)
  const fy = shot.focus[1] + shot.pan[1] * (p - 0.5);
  const v: View = { ox: W / 2 - fx * s, oy: H / 2 + fy * s, s };
  const y = (u: number) => v.oy - u * s;
  const x = (u: number) => v.ox + u * s;
  const moved = adjust(g.commands, shot.adj, f);
  // 가이드가 따라갈 점: 조정이 가장 큰 앵커(처음 모양 기준으로 고정)
  const movers = moverIdx(g.commands, adjust(g.commands, shot.adj, 0), shot.focus, 4).map((k) => moved[k]);
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      {[0, XH, CAP, -15, 528].map((u, k) => <HLine key={`g${k}`} y={y(u)} c={DARK.guide} o={k < 3 ? 1 : 0.6} />)}
      {line.flatMap((q, i) => [glyphX(q, i, TRACK), glyphX(q, i, TRACK) + q.advance]).map((u, k) => <VLine key={`v${k}`} x={x(u)} c={DARK.guide} />)}
      {movers.map((c, k) => {
        const [sx, sy] = toScreen(v, glyphX(g, shot.i, TRACK))(c.x!, c.y!);
        return <g key={`m${k}`}><HLine y={sy} c={DARK.guide} o={0.9} /><VLine x={sx} c={DARK.guide} o={0.9} /></g>;
      })}
      {line.map((q, i) => (
        <GlyphDraw key={i} cmds={i === shot.i ? moved : q.commands} t={toScreen(v, glyphX(q, i, TRACK))} pal={DARK} detail={1} />
      ))}
    </svg>
  );
};

// ---------- 2) 워드마크 + 3) 로고 마크 ----------
const MARK_CELLS: [number, number][] = [ // [행, 열] — 7×7 격자, 가운데부터 채워지는 순서
  [3, 3], [2, 3], [4, 3], [3, 2], [3, 4], [1, 3], [5, 3], [0, 3], [6, 3],
  [2, 1], [2, 5], [4, 1], [4, 5], [1, 0], [1, 6], [5, 0], [5, 6],
];
const MOVE_AT = WORD_AT + sec(1.5); // 줌아웃이 거의 멈춘(약 1.24초) 뒤 잠깐 있다가 크기 그대로 오른쪽으로
const invertAt = (f: number) => ramp(f, MOVE_AT, MOVE_AT + sec(0.6)); // 검정 → 흰 바탕
const MARK_AT = MOVE_AT + sec(0.25);
const CELL_STEP = 3; // 칸 사이 프레임

const S_WORD = 200 / CAP; // 워드마크: 대문자 높이 200px (끝까지 같은 크기)
const MARK = (CAP + GAP) * S_WORD; // 마크 한 변 = 워드마크 잉크 높이(헤더 조합과 같은 기준)
const LOCK_GAP = MARK * 0.24; // 헤더와 같은 비율(25px에 6px)
// 줌아웃: 사용자가 준 After Effects 카메라(Z 위치 0 → -1081.7)를 미리보기에서 재어 맞춘 값 — 1.55초, 거리 진행도 곡선
const ZOOM_LEN = sec(1.55);
const ZOOM_EASE = Easing.bezier(0.35, 0, 0, 1);

const wordView = (track: number): View => {
  const inkW = inkRight(track) - INK_LEFT;
  return { s: S_WORD, ox: W / 2 - (INK_LEFT + inkW / 2) * S_WORD, oy: H / 2 + (CAP - (CAP + GAP) / 2) * S_WORD };
};

const Wordmark: React.FC<{ f: number }> = ({ f }) => {
  const lf = f - WORD_AT;
  const track = TRACK; // 처음부터 원래 자간
  const move = ramp(f, MOVE_AT, MOVE_AT + sec(1.6));
  const inv = invertAt(f); // 오른쪽으로 가기 시작하면서 흰 바탕으로 서서히 반전
  const pal: Pal = { ...DARK, line: mixHex(DARK.line, LIGHT.line, inv) };
  // 카메라가 글자 면에 붙은 데서(가운데는 두 줄 사이 빈 곳 — 검정 화면) 뒤로 빠진다. 화면 배율 = 1 / 카메라 거리 진행도
  const cam = ramp(lf, 0, ZOOM_LEN, ZOOM_EASE);
  const zoom = 1 / Math.max(0.005, cam);
  // 가이드: 처음 검정 화면에는 없고 글자가 드러날 때 나타났다가, 오른쪽으로 가기 전까지 서서히 사라진다
  const gridO = interpolate(cam, [0.2, 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * (1 - ramp(lf, 0, sec(1.4)));
  const gy = (u: number, li: number) => v.oy + li * GAP * v.s - u * v.s;

  // 가운데 워드마크 → 오른쪽(마크 자리를 비운 조합 위치). 크기는 그대로
  const vw = wordView(track);
  const lockLeft = (W - (MARK + LOCK_GAP + (inkRight(TRACK) - INK_LEFT) * S_WORD)) / 2;
  const v: View = { ...vw, ox: mix(vw.ox, lockLeft + MARK + LOCK_GAP - INK_LEFT * S_WORD, move) };

  // 마크: 칸이 가운데부터 하나씩 채워지며 전체가 불투명도 0 → 100%. 한 경로로 그려 칸 사이 틈(가는 선)이 생기지 않게
  const cell = MARK / 7;
  const mx = lockLeft;
  const my = H / 2 - MARK / 2;
  const mf = f - MARK_AT;
  const shown = MARK_CELLS.filter((_, k) => mf >= k * CELL_STEP);
  const e = 0.6; // 이웃 칸과 살짝 겹쳐 경계선을 없앤다
  const markD = shown.map(([r, c]) => {
    const x = mx + c * cell - e, y = my + r * cell - e, w = cell + e * 2;
    return `M${x} ${y}h${w}v${w}h${-w}Z`;
  }).join('');

  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <g transform={`translate(${W / 2} ${H / 2}) scale(${zoom}) translate(${-W / 2} ${-H / 2})`}>
      {gridO > 0 && [0, 1].flatMap((li) => [0, XH, CAP].map((u) => <HLine key={`wg${li}${u}`} y={gy(u, li)} c={DARK.guide} o={gridO} />))}
      {gridO > 0 && LINES.flatMap((line, li) => line.flatMap((q, i) => [glyphX(q, i, track), glyphX(q, i, track) + q.advance]
        .map((u, k) => <VLine key={`wv${li}${i}${k}`} x={v.ox + u * v.s} c={DARK.guide} o={gridO} />)))}
      {LINES.map((line, li) => line.map((q, i) => (
        <GlyphDraw key={`${li}${i}`} cmds={q.commands} t={(x, y) => [v.ox + (glyphX(q, i, track) + x) * v.s, v.oy + li * GAP * v.s - y * v.s]} pal={pal} detail={0} fill={1} stroke={0} />
      )))}
      {markD && <path d={markD} fill={LIGHT.line} opacity={ramp(f, MARK_AT, MARK_AT + sec(0.6))} />}
      </g>
    </svg>
  );
};

export const LogoIntro: React.FC = () => {
  const f = useCurrentFrame();
  const shot = Math.floor(f / SHOT_LEN);
  const out = ramp(f, INTRO_DURATION - sec(0.5), INTRO_DURATION);
  return (
    <AbsoluteFill style={{ background: C.white }}>
      <AbsoluteFill style={{ background: mixHex(DARK.bg, LIGHT.bg, invertAt(f)) }} />
      <AbsoluteFill style={{ opacity: 1 - out }}>
        {f < WORD_AT ? <CloseUp n={shot} f={f - shot * SHOT_LEN} /> : <Wordmark f={f} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
