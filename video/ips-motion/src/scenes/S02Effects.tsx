// 2 · 저널링의 효과 (0:13–0:19) — 화살표 없이 한 문장으로 잇는다(IPS 히어로 문구와 같은 흐름):
//   [Findings]를 나의 디자인에 적용하고, / [Future Item]을 구체적인 행동으로 수행합니다.
//   키워드 박스가 먼저 서고, 뒤 문장이 박스 오른쪽 끝에서 빠져나오듯 밀려 나온다.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Reveal, Scene, useProgress } from '../motion';
import { C, sec } from '../theme';

export const S02_DURATION = sec(6);

const ROWS = [
  { at: sec(0.5), name: 'Findings', note: '배우거나 깨달은 내용, 인사이트', rest: '를 나의 디자인에 적용하고,' },
  { at: sec(1.9), name: 'Future Item', note: '투두, 액션 아이템', rest: '을 구체적인 행동으로 수행합니다.' },
];

/** 박스 뒤 문장: 왼쪽 끝을 마스크로 두고 글이 왼쪽에서 오른쪽으로 밀려 나온다 */
const Rest: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const p = useProgress(at, at + sec(0.8));
  return (
    <div style={{ overflow: 'hidden', padding: '0.1em 0', margin: '-0.1em 0' }}>
      <p style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.03em', color: C.ink, whiteSpace: 'nowrap', opacity: Math.min(1, p * 1.5), transform: `translateX(${(p - 1) * 100}%)` }}>{children}</p>
    </div>
  );
};

export const S02Effects: React.FC = () => (
  <Scene duration={S02_DURATION}>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Reveal at={sec(0.1)}>
        <p style={{ marginBottom: 64, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', color: C.ink, textAlign: 'center' }}>
          Phi의 학습 성찰 기록, 저널링의 효과는 두 가지입니다.
        </p>
      </Reveal>
      {/* 두 줄이 같은 칸을 쓰게 한 격자 — 박스 폭이 같아 뒤 문장이 같은 자리에서 시작한다 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', alignItems: 'center', columnGap: 20, rowGap: 40 }}>
        {ROWS.map((r) => (
          <React.Fragment key={r.name}>
            <Reveal at={r.at}>
              <div style={{ padding: '30px 36px', borderRadius: 24, background: C.soft }}>
                <p style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', color: C.ink }}>{r.name}</p>
                <p style={{ marginTop: 6, fontSize: 26, color: C.secondary }}>{r.note}</p>
              </div>
            </Reveal>
            <Rest at={r.at + sec(0.5)}>{r.rest}</Rest>
          </React.Fragment>
        ))}
      </div>
    </AbsoluteFill>
  </Scene>
);
