// 4 · 5 Whys (0:24–0:38) — 질문이 먼저, 0.5초 뒤 답. 지난 줄은 흐려지며 아래로 이어진다.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Reveal, Scene, Tag } from '../motion';
import { C, EASE, sec } from '../theme';

export const S04_DURATION = sec(14);

const WHYS = [
  { q: '왜 지난 저널을 다시 보지 않는가?', a: '다시 봐도 원하는 내용을 찾기 어렵다.' },
  { q: '왜 찾기 어려운가?', a: '기록이 날짜순으로만 쌓이고, 과목이나 중요도로 모이지 않는다.' },
  { q: '왜 과목·중요도로 모이지 않는가?', a: '과목별 정리는 각자의 외부 앱에서 하고, 저널은 그것을 옮겨 쓰는 사본이 된다.' },
  { q: '왜 사본이 되는가?', a: '저널에는 쓴 뒤 다시 돌아올 이유가 없다. 다시 보는 쪽은 개인 노트다.' },
  { q: '왜 돌아올 이유가 없는가?', a: "저널링이 '쓰기'까지만 짜여 있고, 쓴 것을 다시 꺼내 보는 단계가 학습 흐름에 없다.", note: '근거를 이어 붙인 추론' },
];
const FIRST = sec(1.2);
const STEP = sec(2.1);

const Row: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const at = FIRST + i * STEP;
  // the row fades back once the next one starts, so the eye stays on the newest answer
  const dim = i < WHYS.length - 1 ? interpolate(f, [at + STEP, at + STEP + sec(0.5)], [0, 1], { easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const w = WHYS[i];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '150px 560px 1fr', columnGap: 32, alignItems: 'center', padding: '26px 32px', borderBottom: `2px solid ${C.rule}`, opacity: 1 - dim * 0.55 }}>
      <Reveal at={at}><p style={{ fontSize: 30, fontWeight: 700, color: C.ink }}>Why {i + 1}</p></Reveal>
      <Reveal at={at}><p style={{ fontSize: 28, color: C.secondary }}>{w.q}</p></Reveal>
      <Reveal at={at + sec(0.5)}>
        <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: C.ink, lineHeight: 1.4 }}>{w.a}</p>
        {w.note ? <div style={{ marginTop: 10 }}><Tag variant="soft" size={20}>{w.note}</Tag></div> : null}
      </Reveal>
    </div>
  );
};

export const S04Whys: React.FC = () => (
  <Scene duration={S04_DURATION}>
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 140px' }}>
      <Reveal at={0}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28 }}>
          <Tag>출발 · 문제 1</Tag>
          <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', color: C.ink }}>저널을 다시 보지 않아 학습 성찰이 일어나지 않는다</span>
        </div>
      </Reveal>
      <Reveal at={sec(0.4)}>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 560px 1fr', columnGap: 32, padding: '22px 32px', borderRadius: 18, background: C.soft, fontSize: 24, fontWeight: 700, color: C.secondary }}>
          <span>단계</span><span>질문</span><span>답</span>
        </div>
      </Reveal>
      {WHYS.map((_, i) => <Row key={i} i={i} />)}
    </AbsoluteFill>
  </Scene>
);
