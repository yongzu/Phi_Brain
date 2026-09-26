// 1 · 질문 (0:08–0:13) — 히어로 제목. 등장은 원래대로(흐림 → 선명 + 위로), 화면 전체에 카메라 줌 0.75 → 1배
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Reveal, Scene, Tag } from '../motion';
import { mix, ramp } from '../phi';
import { C, sec } from '../theme';

export const S01_DURATION = sec(5);

const ZOOM_LEN = sec(3); // 페이지 곡선(EASE)으로 다가가다 멈춘다

export const S01Question: React.FC = () => {
  const f = useCurrentFrame();
  const zoom = mix(0.75, 1, ramp(f, 0, ZOOM_LEN));
  return (
    <Scene duration={S01_DURATION}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', transform: `scale(${zoom})` }}>
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
};
