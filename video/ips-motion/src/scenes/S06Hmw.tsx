// 6 · 인사이트(POV) — 단독 화면, 세로 가운데. 핵심 HMW는 7번 해법 후보 화면 위쪽으로 옮김
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Reveal, Scene, Tag } from '../motion';
import { C, sec } from '../theme';

export const S06_DURATION = sec(5);

export const S06Hmw: React.FC = () => (
  <Scene duration={S06_DURATION}>
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 160px' }}>
      <Reveal at={sec(0.3)}><div style={{ marginBottom: 24 }}><Tag size={30}>인사이트 (POV)</Tag></div></Reveal>
      <div style={{ fontSize: 48, lineHeight: 1.45, letterSpacing: '-0.025em', color: C.ink, fontWeight: 500 }}>
        <Reveal at={sec(0.5)}>Phi 학습자는 <strong style={{ color: C.ink, fontWeight: 700 }}>배운 것을 과목별로 다시 꺼내 보는 자리</strong>가 필요하다.</Reveal>
        <Reveal at={sec(1.0)}>저널이 날짜순 사본으로 쌓여, 쓰고 나면 돌아올 이유도 방법도 없기 때문이다.</Reveal>
      </div>
    </AbsoluteFill>
  </Scene>
);
