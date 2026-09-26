// 8 · 평가 D 한 줄 ●●◐ → 선택 문장 → 더블 다이아몬드가 펼쳐지며 Phi Brain (0:55–1:00)
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Reveal, Scene, Tag } from '../motion';
import { C, EASE, sec } from '../theme';

export const S08_DURATION = sec(5);

const COLS = [
  { head: '찾을 수 있게 되는가', sub: 'Why 1·2', mark: 'full' },
  { head: '이중 작성이 사라지는가', sub: 'Why 3', mark: 'full' },
  { head: '다시 돌아올 이유가 생기는가', sub: 'Why 4·5', mark: 'half' },
] as const;

const Dot: React.FC<{ at: number; mark: 'full' | 'half' }> = ({ at, mark }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + sec(0.35)], [0, 1], { easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="19" fill="none" stroke={C.ink} strokeWidth="3" />
      {mark === 'full'
        ? <circle cx="22" cy="22" r={19 * p} fill={C.ink} />
        : <path d="M22 3 A19 19 0 0 0 22 41 Z" fill={C.ink} opacity={p} />}
    </svg>
  );
};

export const S08Choose: React.FC = () => {
  const f = useCurrentFrame();
  const DIAMOND = sec(3.2);
  const open = interpolate(f, [DIAMOND, DIAMOND + sec(0.9)], [0, 1], { easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const table = 1 - open;
  return (
    <Scene duration={S08_DURATION}>
      <AbsoluteFill style={{ justifyContent: 'center', padding: '0 160px', opacity: table, filter: `blur(${open * 10}px)` }}>
        <Reveal at={0}>
          <div style={{ display: 'grid', gridTemplateColumns: '360px repeat(3, 1fr)', padding: '26px 36px', borderRadius: '20px 20px 0 0', background: C.soft, fontSize: 24, fontWeight: 700, color: C.secondary }}>
            <span>후보</span>
            {COLS.map((c) => <span key={c.head}>{c.head}<span style={{ display: 'block', marginTop: 8 }}><Tag variant="soft" size={18}>{c.sub}</Tag></span></span>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '360px repeat(3, 1fr)', alignItems: 'center', padding: '28px 36px', background: C.soft, borderTop: `2px solid ${C.rule}` }}>
            <span style={{ fontSize: 32, fontWeight: 700 }}>D · Phi Brain</span>
            {COLS.map((c, i) => <Dot key={c.head} at={sec(0.6 + i * 0.3)} mark={c.mark} />)}
          </div>
        </Reveal>
        <Reveal at={sec(1.7)} style={{ marginTop: 56 }}>
          <div style={{ marginBottom: 16 }}><Tag>선택</Tag></div>
          <p style={{ fontSize: 58, fontWeight: 700, letterSpacing: '-0.035em' }}>쓰는 곳이 곧 과목별로 다시 보는 곳이 되게 한다.</p>
        </Reveal>
      </AbsoluteFill>
      {/* double diamond opens into the Phi Brain title */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: open }}>
        <svg width="960" height="480" viewBox="0 0 960 480" style={{ position: 'absolute', transform: `scale(${0.6 + open * 0.4})`, opacity: 0.12 }}>
          <polygon points="0,240 240,0 480,240 240,480" fill="none" stroke={C.ink} strokeWidth="3" />
          <polygon points="480,240 720,0 960,240 720,480" fill="none" stroke={C.ink} strokeWidth="3" />
        </svg>
        <p style={{ fontSize: 150, fontWeight: 700, letterSpacing: '-0.05em', color: C.ink, transform: `translateY(${(1 - open) * 30}px)` }}>Phi Brain</p>
      </AbsoluteFill>
    </Scene>
  );
};
