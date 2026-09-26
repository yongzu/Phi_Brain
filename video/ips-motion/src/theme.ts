// IPS 페이지(ips/ips.css)와 같은 문법: 잉크 한 가지 + 흰색, 위계는 투명도(100·70·20%)로만.
// 형광펜 노랑만 예외 — Phi Brain 사용 장면에서 제품의 하이라이트를 보여줄 때만 쓴다.
import { Easing } from 'remotion';

export const FPS = 60;
export const W = 1920;
export const H = 1080;

export const C = {
  ink: '#333333',
  white: '#ffffff',
  secondary: 'rgba(51, 51, 51, 0.7)',
  tertiary: 'rgba(51, 51, 51, 0.2)',
  soft: 'rgba(51, 51, 51, 0.04)',
  rule: '#e3e3e3',
  mark: '#fff1a6', // Phi Brain 하이라이터(노랑) — design/prototypes/phi-brain.css --mark
};

export const FONT = "'Pretendard', 'Pretendard Variable', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

// 페이지 등장 모션과 같은 곡선 (cubic-bezier(0.22, 1, 0.36, 1))
export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_OUT = Easing.bezier(0.4, 0, 1, 1);

export const sec = (s: number) => Math.round(s * FPS);
