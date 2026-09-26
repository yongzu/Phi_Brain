// Phi Brain 앱 화면을 영상 안에서 그대로 그린다 — 앱의 실제 CSS(data/app.json)를 그림자 DOM에 넣고
// 앱과 같은 마크업(src/app/*.ts)을 1440×810 "앱 창" 크기로 배치한 뒤, 카메라(확대 · 이동)로 1920×1080에 담는다.
// 커서는 앱의 실제 커서 그림(cursor-arrow · pointer · text.svg)을 앱 크기 그대로 쓴다.
// 위치가 필요한 것(커서 · 카메라 초점 · 팝업 자리 · 순서가 바뀔 때의 움직임)은 매 프레임 DOM을 재서 정한다.
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { app } from './real';

export const VW = 1440;
export const VH = 810;
const W = 1920;
const H = 1080;
export const FIT = W / VW; // 4/3 — 앱 창 전체가 화면에 꽉 차는 배율

/** 위치: 선택자(요소 상자 안 ax·ay 비율 지점 + dx·dy) 또는 앱 창 좌표 x·y */
export type Pt = { sel?: string; x?: number; y?: number; ax?: number; ay?: number; dx?: number; dy?: number; edge?: 'start' | 'end' };
export type CamKey = { t: number; at: Pt; s: number };
export type CurKey = { t: number; at: Pt };
export type CursorKind = 'arrow' | 'pointer' | 'text';

/** 사용 장면 카메라 — 확대 없이 앱 창 전체(사용자 지시 2026-09-27). 커서가 화면 밖으로 나가지 않는다 */
export const WHOLE: CamKey[] = [{ t: 0, at: { x: VW / 2, y: VH / 2 }, s: FIT }];

type Props = {
  html: string;
  scroll?: number; // 페이지 스크롤(px)
  camera: CamKey[];
  cursor?: { path: CurKey[]; kind: CursorKind; press?: number; opacity?: number; hover?: string | null };
  /** 순서가 바뀔 때: from(바뀌기 전 마크업) 자리에서 지금 자리로 p(0→1)만큼 — data-flip 키가 같은 요소끼리 */
  flip?: { from: string; p: number };
  /** 접히며 사라지는 요소 — 높이 · 불투명도가 p(0→1)만큼 줄어든다 */
  collapse?: { sel: string; p: number }[];
  /** 마크업을 넣은 뒤 자리를 잡아야 하는 것(팝업 등) */
  place?: (root: ShadowRoot, vw: number, vh: number) => void;
  opacity?: number;
  /** 확인용: 이 선택자에 맞는 요소들의 페이지 안 위치(스크롤 0 기준)를 콘솔에 */
  debug?: string;
};

const CAM_EASE = Easing.bezier(0.65, 0, 0.35, 1);
const CUR_EASE = Easing.bezier(0.45, 0, 0.2, 1);
const HOTSPOT: Record<CursorKind, [number, number, number, number]> = { arrow: [0, 1, 13, 14], pointer: [0, 1, 13, 14], text: [0, 7, 1, 14] }; // 앱 CSS의 cursor 좌표 · 그림 크기

const SHADOW_BASE = `:host{display:block;--app-vw:${VW}px;--app-vh:${VH}px}
.phi-app{position:relative;width:${VW}px;height:${VH}px;overflow:hidden;background:#fff}`;

function ensureRoot(hostEl: HTMLDivElement) {
  const root = hostEl.shadowRoot || hostEl.attachShadow({ mode: 'open' });
  if (!root.querySelector('.phi-app')) root.innerHTML = `<style>${app.css}\n${SHADOW_BASE}</style><div class="phi-app" data-hl="blue"></div>`;
  return { root, page: root.querySelector('.phi-app') as HTMLElement };
}

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export const AppScreen: React.FC<Props> = ({ html, scroll = 0, camera, cursor, flip, collapse, place, opacity = 1, debug }) => {
  const f = useCurrentFrame();
  const outer = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const cur = useRef<HTMLImageElement>(null);
  const last = useRef({ html: '', from: '' });

  useLayoutEffect(() => {
    const o = outer.current!, h = host.current!;
    o.style.transform = 'none';
    const { root, page } = ensureRoot(h);
    if (last.current.html !== html) { page.innerHTML = html; last.current.html = html; }
    page.querySelectorAll<HTMLElement>('[data-flip],[data-collapse]').forEach((el) => { el.style.transform = ''; el.style.opacity = ''; el.style.height = ''; el.style.overflow = ''; el.style.zIndex = ''; el.style.position = ''; el.style.background = ''; });
    page.querySelectorAll('[data-hover]').forEach((el) => el.removeAttribute('data-hover'));
    page.scrollTop = scroll;
    place?.(root, VW, VH);
    const base = h.getBoundingClientRect();
    if (debug) console.log('POS', JSON.stringify(Array.from(root.querySelectorAll<HTMLElement>(debug)).map((el) => { const r = el.getBoundingClientRect(); return [el.dataset.flip || el.className, Math.round(r.top - base.top + page.scrollTop), Math.round(r.height), Math.round(r.left - base.left), Math.round(r.width)]; })));

    // 접히며 사라지기
    collapse?.forEach(({ sel, p }) => {
      const el = page.querySelector<HTMLElement>(sel);
      if (!el || p <= 0) return;
      const full = el.offsetHeight;
      el.setAttribute('data-collapse', '');
      el.style.overflow = 'hidden';
      el.style.height = `${full * (1 - CAM_EASE(Math.min(1, p)))}px`;
      el.style.opacity = String(1 - Math.min(1, p * 1.4));
    });

    // FLIP: 같은 키의 요소가 바뀌기 전 자리에서 지금 자리로(가장 가까운 data-flip 조상 기준 — 안에 든 것은 부모와 함께 움직인다)
    if (flip && flip.p < 1) {
      const g = ensureRoot(ghost.current!);
      if (last.current.from !== flip.from) { g.page.innerHTML = flip.from; last.current.from = flip.from; }
      g.page.scrollTop = scroll;
      place?.(g.root, VW, VH);
      const gBase = ghost.current!.getBoundingClientRect();
      const rel = (el: HTMLElement, b: DOMRect, pg: HTMLElement) => {
        const r = el.getBoundingClientRect();
        const parent = el.parentElement?.closest<HTMLElement>('[data-flip]');
        if (parent) { const pr = parent.getBoundingClientRect(); return [r.left - pr.left, r.top - pr.top]; }
        return [r.left - b.left, r.top - b.top + pg.scrollTop];
      };
      const before = new Map<string, number[]>();
      g.page.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => before.set(el.dataset.flip!, rel(el, gBase, g.page)));
      const p = CAM_EASE(Math.max(0, flip.p));
      page.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => {
        const b = before.get(el.dataset.flip!);
        if (!b) { el.style.opacity = String(p); return; }
        const a = rel(el, base, page);
        const dx = (b[0] - a[0]) * (1 - p), dy = (b[1] - a[1]) * (1 - p);
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          // 멀리 움직이는 것이 위로, 흰 바탕으로 — 지나가는 동안 아래 글자가 비치지 않게
          el.style.zIndex = String(1 + Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
          if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
          el.style.background = '#fff';
        }
      });
    }

    // 좌표 풀기(앱 창 기준)
    const resolve = (pt: Pt): [number, number] | null => {
      if (pt.sel) {
        const el = root.querySelector<HTMLElement>(pt.sel);
        if (!el) return null;
        // 여러 줄에 걸친 글자: 시작 = 첫 줄 상자의 왼쪽, 끝 = 마지막 줄 상자의 오른쪽
        if (pt.edge) {
          const rects = el.getClientRects();
          const q = pt.edge === 'start' ? rects[0] : rects[rects.length - 1];
          if (q) return [(pt.edge === 'start' ? q.left : q.right) - base.left + (pt.dx || 0), q.top - base.top + q.height * (pt.ay ?? 0.5) + (pt.dy || 0)];
        }
        const r = el.getBoundingClientRect();
        // x를 함께 주면 가로는 그 값(세로만 요소를 따라간다)
        return [pt.x ?? r.left - base.left + r.width * (pt.ax ?? 0.5) + (pt.dx || 0), r.top - base.top + r.height * (pt.ay ?? 0.5) + (pt.dy || 0)];
      }
      return [(pt.x ?? VW / 2) + (pt.dx || 0), (pt.y ?? VH / 2) + (pt.dy || 0)];
    };
    const along = <K extends { t: number; at: Pt }>(keys: K[], ease: (n: number) => number) => {
      let i = keys.findIndex((k) => k.t > f);
      if (i === -1) i = keys.length;
      const a = keys[Math.max(0, i - 1)], b = keys[Math.min(keys.length - 1, i)];
      const pa = resolve(a.at), pb = resolve(b.at) || pa;
      const pA = pa || pb || [VW / 2, VH / 2], pB = pb || pA;
      const p = a === b ? 1 : ease(interpolate(f, [a.t, b.t], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
      return { x: lerp(pA[0], pB[0], p), y: lerp(pA[1], pB[1], p), p, a, b };
    };

    // 호버 — 커서가 올라간 요소는 앱의 :hover 모양
    if (cursor?.hover) root.querySelector(cursor.hover)?.setAttribute('data-hover', '');

    // 커서
    const c = cur.current!;
    if (cursor && cursor.path.length) {
      const { x, y } = along(cursor.path, CUR_EASE);
      const [hx, hy, w, hh] = HOTSPOT[cursor.kind];
      const press = cursor.press || 0;
      c.src = app.cursors[cursor.kind];
      c.style.display = 'block';
      c.style.width = `${w}px`;
      c.style.height = `${hh}px`;
      c.style.left = `${x - hx}px`;
      c.style.top = `${y - hy}px`;
      c.style.transformOrigin = `${hx}px ${hy}px`;
      c.style.transform = `scale(${1 - Math.sin(Math.min(1, press) * Math.PI) * 0.16})`;
      c.style.opacity = String(cursor.opacity ?? 1);
    } else c.style.display = 'none';

    // 카메라 — 초점을 화면 가운데로, 앱 창 밖(빈 곳)은 보이지 않게
    const cam = along(camera, CAM_EASE);
    const s = lerp(cam.a.s, cam.b.s, cam.p);
    const clampAxis = (t: number, size: number, screen: number) => (size * s >= screen ? Math.min(0, Math.max(screen - size * s, t)) : (screen - size * s) / 2);
    const tx = clampAxis(W / 2 - cam.x * s, VW, W), ty = clampAxis(H / 2 - cam.y * s, VH, H);
    o.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  });

  return (
    <AbsoluteFill style={{ background: '#fff', opacity }}>
      <div ref={outer} style={{ position: 'absolute', left: 0, top: 0, width: VW, height: VH, transformOrigin: '0 0' }}>
        <div ref={ghost} style={{ position: 'absolute', inset: 0, visibility: 'hidden', transform: 'translateZ(0)' }} />
        <div ref={host} style={{ position: 'absolute', inset: 0, transform: 'translateZ(0)', overflow: 'hidden' }} />
        <img ref={cur} alt="" style={{ position: 'absolute', display: 'none', pointerEvents: 'none', zIndex: 5 }} />
      </div>
    </AbsoluteFill>
  );
};
