// 공통 모션: 페이지의 "흐림 → 선명 + 살짝 위로" 등장과, 장면 끝의 "선명 → 흐림" 퇴장.
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C, EASE, EASE_OUT, sec } from './theme';

type RevealProps = {
  at?: number; // 등장 시작 프레임(장면 기준)
  dur?: number; // 등장 길이
  y?: number; // 아래에서 올라오는 거리(px)
  blur?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/** 흐림 → 선명 + 아래에서 위로. 페이지의 [data-reveal] · cp-surface와 같은 곡선. */
export const Reveal: React.FC<RevealProps> = ({ at = 0, dur = sec(0.7), y = 24, blur = 14, style, children }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + dur], [0, 1], { easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity: p, filter: `blur(${(1 - p) * blur}px)`, transform: `translateY(${(1 - p) * y}px)`, ...style }}>
      {children}
    </div>
  );
};

/** 장면 전체를 감싼다. 끝나기 exit 프레임 전부터 흐려지며 사라진다. */
export const Scene: React.FC<{ duration: number; exit?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  duration, exit = sec(0.4), style, children,
}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [duration - exit, duration], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - p, filter: `blur(${p * 10}px)`, transform: `translateY(${-p * 12}px)`, ...style }}>
      {children}
    </div>
  );
};

/** 0→1 진행값 (구간 밖은 고정) */
export const useProgress = (from: number, to: number, easing = EASE) => {
  const f = useCurrentFrame();
  return interpolate(f, [from, to], [0, 1], { easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

/** 작은 라벨은 옅은 글씨 대신 박스로(사용자 지시 — 20% 글씨는 영상에서 안 보인다).
 *  ink = 잉크 박스 + 흰 글씨(섹션 라벨), soft = 흰 박스 + 테두리(표 안 보조 표기) */
export const Tag: React.FC<{ children: React.ReactNode; variant?: 'ink' | 'soft'; size?: number; style?: React.CSSProperties }> = ({
  children, variant = 'ink', size = 26, style,
}) => (
  <span style={{
    display: 'inline-block', padding: `${Math.round(size * 0.3)}px ${Math.round(size * 0.65)}px`, borderRadius: Math.round(size * 0.5),
    fontSize: size, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    ...(variant === 'ink'
      ? { background: C.ink, color: C.white }
      : { background: C.white, color: C.secondary, boxShadow: `inset 0 0 0 2px ${C.rule}` }),
    ...style,
  }}>{children}</span>
);
