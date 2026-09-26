// 13 · 마무리 (2:07–2:12) — 인사이트 한 줄(회색) → Phi Brain + 주소
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Reveal, Scene } from '../motion';
import { mix, ramp } from '../phi';
import { C, sec } from '../theme';

export const S13_DURATION = sec(4.5);

export const S13Outro: React.FC = () => {
  const f = useCurrentFrame();
  const lift = ramp(f, sec(1.7), sec(2.5));
  return (
    <Scene duration={S13_DURATION} exit={sec(0.6)}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: `translateY(${mix(0, -150, lift)}px) scale(${mix(1, 0.62, lift)})` }}>
          <Reveal at={sec(0.2)} dur={sec(0.8)} y={32}>
            <p style={{ color: C.secondary, fontSize: 96, fontWeight: 700, letterSpacing: '-0.04em', textAlign: 'center' }}>
              배운 것이 다시 돌아오게.
            </p>
          </Reveal>
        </div>
        <Reveal at={sec(2.0)} dur={sec(0.8)} style={{ position: 'absolute', top: 540, textAlign: 'center' }}>
          <p style={{ fontSize: 120, fontWeight: 700, letterSpacing: '-0.05em', color: C.ink }}>Phi Brain</p>
          <p style={{ marginTop: 18, fontSize: 32, fontWeight: 500, color: C.secondary }}>yongzu.github.io/Phi_Brain/ips</p>
        </Reveal>
      </AbsoluteFill>
    </Scene>
  );
};
