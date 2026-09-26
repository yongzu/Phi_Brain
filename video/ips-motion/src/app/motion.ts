// 사용 장면(9~12) 공통 — 클릭 눌림 · 구간 진행 · 타이핑
import { Easing, interpolate } from 'remotion';

export const ramp = (f: number, a: number, b: number, easing = Easing.bezier(0.22, 1, 0.36, 1)) =>
  interpolate(f, [a, b], [0, 1], { easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** 클릭 순간 t의 눌림 0→1→0 */
export const press = (f: number, ...ts: number[]) =>
  ts.reduce((m, t) => Math.max(m, interpolate(f, [t - 4, t, t + 6], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })), 0);

/** 구간 [a, b]에서 글자를 n개까지 — 글자 수 기준 */
export const typed = (text: string, f: number, a: number, cpf: number) => {
  const chars = Array.from(text);
  const n = Math.max(0, Math.min(chars.length, Math.floor((f - a) * cpf)));
  return { text: chars.slice(0, n).join(''), done: n >= chars.length, end: a + Math.ceil(chars.length / cpf) };
};

/** 앱의 텍스트 커서(깜빡임) — 편집 중 caret 자리 표시. f = 멈춘 뒤 지난 프레임 */
export const caret = (f: number, blink = true) =>
  `<span class="v-caret" style="display:inline-block;width:1px;height:1.2em;margin:0 -1px 0 0;vertical-align:-0.2em;background:${!blink || Math.floor(Math.max(0, f) / 30) % 2 === 0 ? '#333' : 'transparent'}"></span>`;

/** 커서 경로 한 점 — k = 그 지점에 닿았을 때의 커서 모양 */
export type Step = { t: number; sel?: string; x?: number; y?: number; ax?: number; ay?: number; dx?: number; dy?: number; edge?: 'start' | 'end'; k?: 'arrow' | 'pointer' | 'text' };

/** 지금 커서 모양 — 다음 지점까지 65% 넘게 왔으면 다음 지점의 모양 */
export function cursorKindAt(steps: Step[], f: number) {
  const i = steps.findIndex((s) => s.t > f);
  if (i === -1) return steps[steps.length - 1].k || 'arrow';
  if (i === 0) return steps[0].k || 'arrow';
  const a = steps[i - 1], b = steps[i];
  const p = (f - a.t) / Math.max(1, b.t - a.t);
  return (p > 0.65 ? b.k : a.k) || 'arrow';
}

/** 커서가 멈춰 있는(또는 거의 닿은) 버튼 — 앱의 호버 모양을 낸다 */
export function hoverAt(steps: Step[], f: number) {
  let i = steps.findIndex((s) => s.t > f);
  if (i === -1) i = steps.length;
  const a = steps[Math.max(0, i - 1)], b = steps[Math.min(steps.length - 1, i)];
  const p = a === b ? 1 : (f - a.t) / Math.max(1, b.t - a.t);
  const s = p > 0.85 ? b : a;
  return s.k === 'pointer' && s.sel ? s.sel : null;
}

/** 장면의 커서 경로 → AppScreen 커서 설정 */
export const cursorProps = (steps: Step[], f: number, clicks: number[], opacity = 1) => ({
  path: steps.map((s) => ({ t: s.t, at: s })),
  kind: cursorKindAt(steps, f),
  press: press(f, ...clicks),
  hover: hoverAt(steps, f),
  opacity,
});

/** 화면 전환(흐림 → 선명) 스타일 — 다 나타나면 빈 값. filter가 남아 있으면 고정 위치 팝업의 기준 상자가 바뀐다 */
export const fadeStyle = (p: number) => (p >= 1 ? '' : `opacity:${p};filter:blur(${(1 - p) * 6}px)`);
