// 5 · 근본 원인 (0:38–0:43)
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Reveal, Scene, Tag } from '../motion';
import { C, sec } from '../theme';

export const S05_DURATION = sec(5);

export const S05RootCause: React.FC = () => (
  <Scene duration={S05_DURATION}>
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 200px' }}>
      <Reveal at={sec(0.1)}>
        <div style={{ marginBottom: 32 }}><Tag size={30}>근본 원인</Tag></div>
      </Reveal>
      <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.04em' }}>
        <Reveal at={sec(0.3)} dur={sec(0.9)} y={32}><span style={{ color: C.ink }}>저널링은 쓰는 데서 끝나도록 짜여 있어,</span></Reveal>
        <Reveal at={sec(0.9)} dur={sec(0.9)} y={32}><span style={{ color: C.secondary }}>배운 것을 다시 꺼내 보는 단계가 없다.</span></Reveal>
      </div>
    </AbsoluteFill>
  </Scene>
);
