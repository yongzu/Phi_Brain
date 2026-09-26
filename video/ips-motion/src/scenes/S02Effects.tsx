// 2 · 저널링의 효과 (0:05–0:11) — Findings → 디자인에 적용 / Future Item → 행동으로 수행
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Reveal, Scene, useProgress } from '../motion';
import { C, sec } from '../theme';

export const S02_DURATION = sec(6);

const Row: React.FC<{ at: number; name: string; note: string; result: string }> = ({ at, name, note, result }) => {
  const line = useProgress(at + sec(0.5), at + sec(1.1));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '560px 220px 1fr', alignItems: 'center', columnGap: 32 }}>
      <Reveal at={at}>
        <div style={{ padding: '30px 36px', borderRadius: 24, background: C.soft }}>
          <p style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', color: C.ink }}>{name}</p>
          <p style={{ marginTop: 6, fontSize: 26, color: C.secondary }}>{note}</p>
        </div>
      </Reveal>
      {/* arrow draws left → right */}
      <svg width="220" height="24" viewBox="0 0 220 24" style={{ overflow: 'visible' }}>
        <line x1="0" y1="12" x2={200 * line} y2="12" stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
        <path d="M188 2 L204 12 L188 22" fill="none" stroke={C.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity={line > 0.95 ? 1 : 0} />
      </svg>
      <Reveal at={at + sec(1.0)}>
        <p style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.03em', color: C.ink }}>{result}</p>
      </Reveal>
    </div>
  );
};

export const S02Effects: React.FC = () => (
  <Scene duration={S02_DURATION}>
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 200px' }}>
      <Reveal at={sec(0.1)}>
        <p style={{ fontSize: 34, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em', marginBottom: 56 }}>
          Phi의 학습 성찰 기록, 저널링의 효과는 두 가지입니다.
        </p>
      </Reveal>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        <Row at={sec(0.5)} name="Findings" note="배우거나 깨달은 내용, 인사이트" result="나의 디자인에 적용" />
        <Row at={sec(1.6)} name="Future Item" note="투두, 액션 아이템" result="구체적인 행동으로 수행" />
      </div>
    </AbsoluteFill>
  </Scene>
);
