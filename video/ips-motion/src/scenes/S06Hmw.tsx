// 6 · 인사이트(POV) → 핵심 HMW (0:43–0:51)
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Reveal, Scene, useProgress, Tag } from '../motion';
import { C, sec } from '../theme';

export const S06_DURATION = sec(8);

export const S06Hmw: React.FC = () => {
  const grow = useProgress(sec(2.6), sec(3.4)); // the HMW box opens up under the POV
  return (
    <Scene duration={S06_DURATION}>
      <AbsoluteFill style={{ justifyContent: 'center', padding: '0 160px' }}>
        <Reveal at={sec(0.1)}><div style={{ marginBottom: 24 }}><Tag size={30}>인사이트 (POV)</Tag></div></Reveal>
        <div style={{ fontSize: 48, lineHeight: 1.45, letterSpacing: '-0.025em', color: C.ink, fontWeight: 500 }}>
          <Reveal at={sec(0.3)}>Phi 학습자는 <strong style={{ color: C.ink, fontWeight: 700 }}>배운 것을 과목별로 다시 꺼내 보는 자리</strong>가 필요하다.</Reveal>
          <Reveal at={sec(0.8)}>저널이 날짜순 사본으로 쌓여, 쓰고 나면 돌아올 이유도 방법도 없기 때문이다.</Reveal>
        </div>
        <div style={{ marginTop: 64, padding: '56px 64px', borderRadius: 36, background: C.soft, opacity: grow, transform: `scale(${0.96 + grow * 0.04})`, transformOrigin: 'left top' }}>
          <Reveal at={sec(3.0)}><div style={{ marginBottom: 24 }}><Tag size={30}>핵심 HMW · 문제 1</Tag></div></Reveal>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.035em', color: C.ink }}>
            <Reveal at={sec(3.2)} dur={sec(0.9)} y={28}>어떻게 하면 Phi 학습자가 저널에 쓴 Findings를 다시 꺼내 보고,</Reveal>
            <Reveal at={sec(3.7)} dur={sec(0.9)} y={28}>자신의 디자인에 적용하게 할 수 있을까?</Reveal>
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};
