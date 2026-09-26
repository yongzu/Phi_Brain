// IPS 페이지(ips/ips.css)와 같은 문법: 잉크 한 가지 + 흰색, 위계는 투명도(100·70·20%)로만.
// 사용 장면(9~12)은 이 토큰이 아니라 앱의 실제 CSS(data/app.json — design/prototypes/phi-brain.css)로 그린다.
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
  // 잉크 바탕 위(7·8번 D 화면) — 같은 위계 70·20%를 흰색에. 로고 인트로 어두운 구간과 같은 값(새 색 아님)
  onInk2: 'rgba(255, 255, 255, 0.7)',
  onInk3: 'rgba(255, 255, 255, 0.2)',
  black: '#000000', // 7·8번 D 화면 — 뒤에 오는 로고 인트로의 검정 바탕과 같게(사용자 지시)
};

export const FONT = "'Pretendard', 'Pretendard Variable', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

// 페이지 등장 모션과 같은 곡선 (cubic-bezier(0.22, 1, 0.36, 1))
export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_OUT = Easing.bezier(0.4, 0, 1, 1);

export const sec = (s: number) => Math.round(s * FPS);
