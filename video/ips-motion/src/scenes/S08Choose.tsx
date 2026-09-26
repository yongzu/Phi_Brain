// 8 · 7번의 D 화면(검정 #000 바탕)에서 그대로 — D가 위로 올라가며 아래에 평가 표 ●●◐와 선택 문장이 흰 글씨로 나온다
//     → 충분히 머문 뒤 글씨만 흐려지고 → 로고 인트로(같은 검정에서 시작)
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Reveal, Tag } from '../motion';
import { ramp } from '../phi';
import { C, sec } from '../theme';
import { DPanel, D_GROUP_H, D_ROW_W, D_ROW_X, D_TOP_LIFT } from './S07Ideas';

export const S08_DURATION = sec(7.4);

const COLS = [
  { head: '찾을 수 있게 되는가', sub: 'Why 1·2', mark: 'full' },
  { head: '이중 작성이 사라지는가', sub: 'Why 3', mark: 'full' },
  { head: '다시 돌아올 이유가 생기는가', sub: 'Why 4·5', mark: 'half' },
] as const;

const TABLE_Y = D_TOP_LIFT + D_GROUP_H + 64;
const TABLE_H = 206;
const CHOOSE_Y = TABLE_Y + TABLE_H + 56;
const LIFT_AT = sec(0.2);
const TABLE_AT = sec(0.7);
const CHOOSE_AT = sec(2.3);
const OUT_AT = S08_DURATION - sec(0.8); // 선택 문장이 나온 뒤 약 3.5초 머문다

const Dot: React.FC<{ at: number; mark: 'full' | 'half' }> = ({ at, mark }) => {
  const f = useCurrentFrame();
  const p = ramp(f, at, at + sec(0.35));
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="19" fill="none" stroke={C.white} strokeWidth="3" />
      {mark === 'full'
        ? <circle cx="22" cy="22" r={19 * p} fill={C.white} />
        : <path d="M22 3 A19 19 0 0 0 22 41 Z" fill={C.white} opacity={p} />}
    </svg>
  );
};

const GRID = '280px repeat(3, 1fr)';

export const S08Choose: React.FC = () => {
  const f = useCurrentFrame();
  const lift = ramp(f, LIFT_AT, LIFT_AT + sec(0.9));
  const out = ramp(f, OUT_AT, OUT_AT + sec(0.6));
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <AbsoluteFill style={{ opacity: 1 - out, filter: `blur(${out * 8}px)` }}>
        <DPanel slide={1} grow={1} lift={lift} box={false} />
        <Reveal at={TABLE_AT} style={{ position: 'absolute', left: D_ROW_X, top: TABLE_Y, width: D_ROW_W }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '26px 32px', borderTop: `2px solid ${C.onInk3}`, fontSize: 24, fontWeight: 700, color: C.onInk2 }}>
            <span>후보</span>
            {COLS.map((c) => <span key={c.head}>{c.head}<span style={{ display: 'block', marginTop: 8, fontSize: 18 }}>{c.sub}</span></span>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', padding: '28px 32px', borderTop: `2px solid ${C.onInk3}`, borderBottom: `2px solid ${C.onInk3}` }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: C.white }}>D · Phi Brain</span>
            {COLS.map((c, i) => <Dot key={c.head} at={TABLE_AT + sec(0.6 + i * 0.3)} mark={c.mark} />)}
          </div>
        </Reveal>
        <Reveal at={CHOOSE_AT} style={{ position: 'absolute', left: D_ROW_X, top: CHOOSE_Y }}>
          <div style={{ marginBottom: 16 }}><Tag style={{ color: C.onInk2 }}>선택</Tag></div>
          <p style={{ fontSize: 58, fontWeight: 700, letterSpacing: '-0.035em', color: C.white }}>쓰는 곳이 곧 과목별로 다시 보는 곳이 되게 한다.</p>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
