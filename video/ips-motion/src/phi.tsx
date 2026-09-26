// 장면 공통 계산 — 구간 진행(ramp) · 사이 값(mix).
// (예전 사용 장면의 Phi Brain 화면 부품은 없앴다 — 9~12번은 src/app/이 앱의 실제 CSS · 마크업으로 그린다)
import { interpolate } from 'remotion';
import { EASE } from './theme';

/** 구간 [from, to]에서 0→1 (구간 밖은 고정) */
export const ramp = (f: number, from: number, to: number, easing = EASE) =>
  interpolate(f, [from, to], [0, 1], { easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
