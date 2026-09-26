// 1 · 질문 (0:00–0:05) — 히어로 제목
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Reveal, Scene, Tag } from '../motion';
import { C, sec } from '../theme';

export const S01_DURATION = sec(5);

export const S01Question: React.FC = () => (
  <Scene duration={S01_DURATION}>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Reveal at={sec(0.3)}>
        <div style={{ marginBottom: 40 }}><Tag>Iterative Problem Solving · Phi Brain</Tag></div>
      </Reveal>
      <div style={{ fontSize: 104, fontWeight: 700, lineHeight: 1.19, letterSpacing: '-0.04em', color: C.ink }}>
        <Reveal at={sec(0.5)} dur={sec(0.9)} y={32}>Phi에서 배운 인사이트를</Reveal>
        <Reveal at={sec(1.0)} dur={sec(0.9)} y={32}>자신의 디자인에 적용하고 있나요?</Reveal>
      </div>
    </AbsoluteFill>
  </Scene>
);
