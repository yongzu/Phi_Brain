// Phi Brain 사용 장면(9~14)이 함께 쓰는 화면 부품 — design/prototypes/phi-brain.css 모양을 영상 크기로 다시 그린다.
// 색은 theme.ts 그대로: 잉크 · 흰색 · secondary(회색 글씨) · soft(채움) · rule(선) + 형광펜 mark.
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Reveal, Tag } from './motion';
import { C, EASE, sec } from './theme';

/** 구간 [from, to]에서 0→1 (구간 밖은 고정) */
export const ramp = (f: number, from: number, to: number, easing = EASE) =>
  interpolate(f, [from, to], [0, 1], { easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/** 흰 카드 + 얇은 선 (저널 카드 · Findings 카드 · 보드 박스) */
export const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ background: C.white, borderRadius: 32, boxShadow: `inset 0 0 0 2px ${C.rule}`, ...style }}>{children}</div>
);

/** 4F 소제목 — 채움 알약 (Finding · Future Item) */
export const Chip4F: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 30 }) => (
  <span style={{ display: 'inline-block', padding: `${Math.round(size * 0.45)}px ${Math.round(size * 0.8)}px`, borderRadius: Math.round(size * 0.55), background: C.soft, fontSize: size, lineHeight: 1.2, color: C.ink }}>{children}</span>
);

/** 과목 박스 — 테두리 알약 `BI_Beautiful Interface ▾` */
export const CourseBox: React.FC<{ code: string; name: string; size?: number }> = ({ code, name, size = 30 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.6), padding: `${Math.round(size * 0.45)}px ${Math.round(size * 0.8)}px`, borderRadius: Math.round(size * 0.55), boxShadow: `inset 0 0 0 2px ${C.rule}`, fontSize: size, lineHeight: 1.2, color: C.ink, whiteSpace: 'nowrap' }}>
    <span><b style={{ fontWeight: 700 }}>{code}</b>_{name}</span>
    <span style={{ fontSize: size * 0.55, color: C.secondary }}>▼</span>
  </span>
);

/** 형광펜 — p(0→1)만큼 왼쪽에서 오른쪽으로 칠해진다. 굵게 표시와 함께 쓴다. */
export const Mark: React.FC<{ p: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ p, children, style }) => (
  <span style={{
    fontWeight: 700, borderRadius: 4, padding: '0 2px',
    background: `linear-gradient(90deg, ${C.mark} ${p * 100}%, transparent ${p * 100}%)`,
    WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone', ...style,
  }}>{children}</span>
);

/** 별 — 비었으면 옅은 회색, 채우면 잉크 */
export const Star: React.FC<{ p?: number; size?: number }> = ({ p = 0, size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `scale(${1 + Math.sin(p * Math.PI) * 0.35})` }}>
    <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" fill={p > 0.5 ? C.ink : C.tertiary} />
  </svg>
);

/** 동그라미 체크 (Future Item 완료 · 제출 확인 점) */
export const Dot: React.FC<{ p: number; size?: number }> = ({ p, size = 24 }) => (
  <span style={{ display: 'inline-block', flex: `0 0 ${size}px`, width: size, height: size, borderRadius: '50%', boxShadow: `inset 0 0 0 2px ${p > 0 ? C.ink : C.secondary}`, background: C.white, position: 'relative' }}>
    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: C.ink, transform: `scale(${p})` }} />
  </span>
);

/** Phi Brain 커서(ips/cursor-arrow.svg · cursor-pointer.svg) — x·y는 화살 끝. press(0→1)면 살짝 눌린다. */
export const Cursor: React.FC<{ x: number; y: number; press?: number; pointer?: boolean; opacity?: number }> = ({ x, y, press = 0, pointer = false, opacity = 1 }) => (
  <svg width={39} height={42} viewBox="0 0 13 14" style={{ position: 'absolute', left: x, top: y, opacity, transform: `scale(${1 - Math.sin(press * Math.PI) * 0.18})`, transformOrigin: '0 0', overflow: 'visible', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.12))' }}>
    <path d="M0.458521 1.45762C0.309685 0.746272 1.07153 0.192759 1.70207 0.55413L11.4088 6.11718C12.0557 6.4882 11.9368 7.45567 11.2191 7.65881L7.38738 8.74315C6.9921 8.85504 6.64953 9.10449 6.42229 9.44674L4.27268 12.6852C3.8592 13.308 2.8992 13.1234 2.7461 12.3917L0.458521 1.45762Z" fill={pointer ? C.ink : C.white} stroke={C.ink} strokeWidth="0.878219" />
  </svg>
);

/** 커서 경로: 점들 사이를 곡선으로 이동. keys = [프레임, x, y] */
export const useCursorPath = (keys: [number, number, number][]) => {
  const f = useCurrentFrame();
  if (f <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1, y1] = keys[i];
    const [t0, x0, y0] = keys[i - 1];
    if (f <= t1) {
      const p = ramp(f, t0, t1);
      return { x: mix(x0, x1, p), y: mix(y0, y1, p) };
    }
  }
  const last = keys[keys.length - 1];
  return { x: last[1], y: last[2] };
};

/** 클릭 순간(at)의 눌림 0→1→0 */
export const useClick = (at: number) => {
  const f = useCurrentFrame();
  return interpolate(f, [at - 4, at + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

/** 장면 아래 왼쪽의 사용 단계 라벨 — ① 쓴다 · 표시한다 — Journaling */
export const StepLabel: React.FC<{ num: string; verb: string; name: string; at?: number }> = ({ num, verb, name, at = sec(0.2) }) => (
  <Reveal at={at} style={{ position: 'absolute', left: 120, top: 72, display: 'flex', alignItems: 'center', gap: 16 }}>
    <Tag size={30}>{num} {verb}</Tag>
    <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: C.ink }}>{name}</span>
  </Reveal>
);

/** 키캡 (Ctrl + H) — 누를 때 살짝 가라앉는다 */
export const Keycap: React.FC<{ keys: string[]; press?: number }> = ({ keys, press = 0 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
    {keys.map((k, i) => (
      <React.Fragment key={k}>
        {i > 0 && <span style={{ fontSize: 28, fontWeight: 700, color: C.secondary }}>+</span>}
        <span style={{
          display: 'inline-block', minWidth: 72, padding: '14px 20px', borderRadius: 16, textAlign: 'center',
          fontSize: 30, fontWeight: 700, color: C.ink, background: C.white,
          boxShadow: `inset 0 0 0 2px ${C.rule}, 0 ${6 - press * 4}px 0 ${C.rule}`,
          transform: `translateY(${press * 4}px)`,
        }}>{k}</span>
      </React.Fragment>
    ))}
  </span>
);
