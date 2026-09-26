// 7 · 해법 후보 (0:51–0:55) — 네 갈래를 잠깐 보여주고, A~C는 빠지며 D만 가운데로
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Reveal, Scene, Tag } from '../motion';
import { C, EASE, sec } from '../theme';

export const S07_DURATION = sec(4);

const GROUPS = [
  { key: 'A', name: '수업 루틴', items: ['주간 회고 시간에 지난주 Findings를 다시 읽는다', '세션을 시작할 때 지난 Finding 하나를 공유한다'] },
  { key: 'B', name: '디스코드 안에서', items: ['과목 태그를 붙이는 작성 규칙을 정한다', '봇이 지난주 Findings를 다시 보내 준다'] },
  { key: 'C', name: '기존 앱 활용', items: ['노션·옵시디언에 과목별 저널 템플릿을 만든다', '외부 앱의 기록을 디스코드로 옮기는 과정을 자동화한다'] },
  { key: 'D', name: '새 도구 (Phi Brain)', items: ['쓰는 곳에서 과목별로 저절로 모이게 한다', '중요한 문장만 표시해 모아 보여 준다'] },
];
const CARD_W = 380;
const GAP = 28;
const LEAVE = sec(1.9); // A~C start leaving

export const S07Ideas: React.FC = () => {
  const f = useCurrentFrame();
  const out = interpolate(f, [LEAVE, LEAVE + sec(0.6)], [0, 1], { easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const slide = interpolate(f, [LEAVE + sec(0.3), LEAVE + sec(1.2)], [0, 1], { easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const total = CARD_W * 4 + GAP * 3;
  const left0 = (1920 - total) / 2;
  // D moves from the 4th slot to the centre
  const dFrom = left0 + 3 * (CARD_W + GAP);
  const dTo = (1920 - CARD_W) / 2;
  return (
    <Scene duration={S07_DURATION}>
      <AbsoluteFill>
        <Reveal at={0} style={{ position: 'absolute', top: 330, left: left0, opacity: 1 - out }}>
          <Tag>해법 후보 · 네 갈래</Tag>
        </Reveal>
        {GROUPS.map((g, i) => {
          const isD = g.key === 'D';
          const x = isD ? dFrom + (dTo - dFrom) * slide : left0 + i * (CARD_W + GAP);
          return (
            <Reveal key={g.key} at={sec(0.1 + i * 0.12)} style={{ position: 'absolute', top: 390, left: x, width: CARD_W, opacity: isD ? 1 : 1 - out, filter: isD ? undefined : `blur(${out * 8}px)` }}>
              <div style={{ padding: '26px 26px 12px', borderRadius: 24, border: isD ? `2px solid transparent` : `2px solid ${C.rule}`, background: isD ? C.soft : C.white, transform: `scale(${isD ? 1 + slide * 0.12 : 1})`, transformOrigin: 'center top' }}>
                <div style={{ marginBottom: 16 }}><Tag variant={isD ? 'ink' : 'soft'} size={22}>{g.key} · {g.name}</Tag></div>
                {g.items.map((t, k) => (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 12, padding: '16px 0', borderTop: `2px solid ${C.rule}` }}>
                    <span style={{ height: 30, borderRadius: 10, background: isD ? C.white : C.soft, fontSize: 17, fontWeight: 700, lineHeight: '30px', textAlign: 'center' }}>{g.key}{k + 1}</span>
                    <p style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.45, letterSpacing: '-0.02em' }}>{t}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          );
        })}
      </AbsoluteFill>
    </Scene>
  );
};
