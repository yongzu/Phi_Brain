// 공통 모션: 페이지의 "흐림 → 선명 + 살짝 위로" 등장과, 장면 끝의 "선명 → 흐림" 퇴장.
import React, { createContext, useContext } from 'react';
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

/** 다음 장면이 슬라이드로 밀고 들어오면 Video가 'none'을 넣어 준다 — 그때는 흐려지는 퇴장을 하지 않는다. */
export const SceneExit = createContext<'fade' | 'none'>('fade');

/** 장면 전체를 감싼다. 끝나기 exit 프레임 전부터 흐려지며 사라진다(exit 0 = 퇴장 없음). */
export const Scene: React.FC<{ duration: number; exit?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  duration, exit = sec(0.4), style, children,
}) => {
  const f = useCurrentFrame();
  const len = useContext(SceneExit) === 'none' ? 0 : exit;
  const p = len > 0 ? interpolate(f, [duration - len, duration], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
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

/** 작은 라벨. text = 박스 없는 회색(70%) 굵은 글씨(섹션 라벨 — 사용자 지시로 잉크 박스를 없앰),
 *  soft = 흰 박스 + 테두리(표 안 보조 표기). 20% 글씨는 영상에서 안 보여 쓰지 않는다. */
export const Tag: React.FC<{ children: React.ReactNode; variant?: 'text' | 'soft'; size?: number; style?: React.CSSProperties }> = ({
  children, variant = 'text', size = 26, style,
}) => (
  <span style={{
    display: 'inline-block', fontSize: size, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    ...(variant === 'text'
      ? { color: C.secondary }
      : { padding: `${Math.round(size * 0.3)}px ${Math.round(size * 0.65)}px`, borderRadius: Math.round(size * 0.5), background: C.white, color: C.secondary, boxShadow: `inset 0 0 0 2px ${C.rule}` }),
    ...style,
  }}>{children}</span>
);

// 한글 타이핑: 음절을 초성 → 초성 + 중성 → 받침까지 순서로 찍는다(겹모음 · 겹받침은 한 번에).
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const typeSteps = (ch: string): string[] => {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return [ch];
  const cho = Math.floor(code / 588);
  const open = String.fromCharCode(0xac00 + cho * 588 + Math.floor((code % 588) / 28) * 28);
  return code % 28 ? [CHO[cho], open, ch] : [CHO[cho], ch];
};

/** 타이핑 + 커서. 남은 글자는 투명하게 미리 자리를 잡아, 가운데 정렬이어도 줄이 흔들리지 않는다.
 *  speed = 프레임당 타자 수. 다 치면 커서가 몇 번 깜빡이고 사라진다. */
export const Typewriter: React.FC<{ text: string; at: number; speed?: number; caret?: string }> = ({ text, at, speed = 0.6, caret = C.ink }) => {
  const f = useCurrentFrame();
  const chars = Array.from(text);
  const steps = chars.map(typeSteps);
  const total = steps.reduce((n, s) => n + s.length, 0);
  const end = at + total / speed;
  let left = Math.max(0, Math.floor((f - at) * speed));
  let i = 0;
  let partial = ''; // i번째 글자를 치는 중이면 그 중간 모양
  for (; i < chars.length; i++) {
    if (left >= steps[i].length) { left -= steps[i].length; continue; }
    partial = left > 0 ? steps[i][left - 1] : '';
    break;
  }
  const caretOn = f >= at && f < end + sec(1.2) && (f < end || Math.floor((f - end) / 18) % 2 === 0);
  return (
    <>
      {chars.slice(0, i).join('')}
      {partial && (
        <span style={{ position: 'relative' }}>
          <span style={{ color: 'transparent' }}>{chars[i]}</span>
          <span style={{ position: 'absolute', left: 0, top: 0 }}>{partial}</span>
        </span>
      )}
      <span style={{ position: 'relative', display: 'inline-block', width: 0, height: '1em', verticalAlign: '-0.12em' }}>
        {caretOn && <span style={{ position: 'absolute', left: '0.03em', top: 0, bottom: 0, width: '0.06em', background: caret }} />}
      </span>
      <span style={{ color: 'transparent' }}>{chars.slice(partial ? i + 1 : i).join('')}</span>
    </>
  );
};
