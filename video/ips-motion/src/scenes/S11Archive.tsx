// 11 · 사용 ③ Archive (1:15–1:21) — BI 칩을 누르면 다른 과목은 빠지고, BI 저널이 날짜순 한 줄로 모인다
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Reveal, Scene } from '../motion';
import { Card, Chip4F, Cursor, Mark, StepLabel, mix, ramp, useClick, useCursorPath } from '../phi';
import { C, sec } from '../theme';

export const S11_DURATION = sec(6);

// 실제 저널 문장(Findings · Archive 캡처와 같은 문장) — 보관함 기본 순서는 최신순
const CARDS = [
  { course: 'IPS', date: '9월 22일', pre: '', key: '문제정의 - 사용자의 문제를 한 문장으로, 핵심을 직관적으로 이해할 수 있게끔 하는 것이 중요' },
  { course: 'BI', date: '9월 21일', pre: '', key: '다양한 옵션들이 있지만 결국 근본은 묶고, 블록을 쌓는 것이라는 점.' },
  { course: 'BI', date: '9월 16일', pre: '', key: '양쪽정렬은 절대 안쓴다.' },
  { course: 'BI', date: '9월 9일', pre: '> Attitude : 프로세스 중 ', key: '사고과정을 정돈하고 판단하는 습관(언어화, 시각화)' },
];
const BI_ORDER = [3, 2, 1]; // 필터 뒤: 9/9 → 9/16 → 9/21 (이어 읽기)

const CW = 500;
const CH = 300;
const GAP = 32;
const X0 = (1920 - (CW * 3 + GAP * 2)) / 2;
const Y0 = 360;
const gridPos = (i: number) => ({ x: X0 + (i % 3) * (CW + GAP), y: Y0 + Math.floor(i / 3) * (CH + GAP) });
const rowPos = (k: number) => ({ x: X0 + k * (CW + GAP), y: Y0 + 90 });

const CHIPS: [string, number][] = [['All', 4], ['BI', 3], ['IPS', 1]];
const CHIP_BI = { x: X0 + 185, y: 256 }; // BI 칩 가운데쯤
const CLICK = sec(1.15);

export const S11Archive: React.FC = () => {
  const f = useCurrentFrame();
  const cursor = useCursorPath([[sec(0.4), 1500, 900], [CLICK - 4, CHIP_BI.x, CHIP_BI.y], [CLICK + 12, CHIP_BI.x, CHIP_BI.y], [sec(2.2), CHIP_BI.x + 20, CHIP_BI.y + 30], [sec(3.0), 1700, 980]]);
  const press = useClick(CLICK);
  const picked = f >= CLICK;
  const leave = ramp(f, sec(1.25), sec(1.8));
  const gather = ramp(f, sec(1.7), sec(2.7));
  return (
    <Scene duration={S11_DURATION}>
      <AbsoluteFill>
        <StepLabel num="③" verb="다시 본다" name="Archive" />

        {/* 과목 필터 칩 */}
        <Reveal at={sec(0.1)} style={{ position: 'absolute', left: X0, top: 230, display: 'flex', gap: 14 }}>
          {CHIPS.map(([name, n]) => {
            const on = picked ? name === 'BI' : name === 'All';
            return (
              <span key={name} style={{ padding: '12px 24px', borderRadius: 18, background: on ? C.soft : 'transparent', fontSize: 30, fontWeight: on ? 700 : 500, color: on ? C.ink : C.secondary }}>
                {name}<span style={{ marginLeft: 12, fontWeight: 500, color: C.secondary }}>{n}</span>
              </span>
            );
          })}
        </Reveal>

        {/* 저널 카드 */}
        {CARDS.map((c, i) => {
          const isBI = c.course === 'BI';
          const from = gridPos(i);
          const to = isBI ? rowPos(BI_ORDER.indexOf(i)) : from;
          const x = mix(from.x, to.x, gather);
          const y = mix(from.y, to.y, gather);
          return (
            <Reveal key={i} at={sec(0.2 + i * 0.08)} style={{ position: 'absolute', left: x, top: y, width: CW, height: CH, opacity: isBI ? 1 : 1 - leave, filter: isBI ? undefined : `blur(${leave * 10}px)`, transform: isBI ? undefined : `scale(${1 - leave * 0.05})` }}>
              <Card style={{ height: '100%', padding: '32px 36px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>{c.date} 저널</span>
                  <span style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 10, boxShadow: `inset 0 0 0 2px ${C.rule}`, fontSize: 20, fontWeight: 700, color: C.secondary }}>{c.course}</span>
                </div>
                <div style={{ marginTop: 22 }}><Chip4F size={20}>Finding</Chip4F></div>
                <p style={{ marginTop: 22, fontSize: 25, lineHeight: 1.65, letterSpacing: '-0.015em', color: C.ink }}>
                  {c.pre}<Mark p={1}>{c.key}</Mark>
                </p>
              </Card>
            </Reveal>
          );
        })}

        {/* 모인 뒤: 흐름 화살표 */}
        <Reveal at={sec(2.8)} style={{ position: 'absolute', left: X0, top: Y0 + 90 + CH + 44, width: CW * 3 + GAP * 2, display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap' }}>BI만 날짜순으로 이어 읽기</span>
          <svg height="24" style={{ flex: 1 }} viewBox="0 0 1000 24" preserveAspectRatio="none">
            <line x1="0" y1="12" x2={980 * ramp(f, sec(2.9), sec(3.6))} y2="12" stroke={C.ink} strokeWidth="3" />
          </svg>
        </Reveal>

        <Cursor x={cursor.x} y={cursor.y} press={press} pointer={f > CLICK - sec(0.4) && f < sec(2.2)} opacity={ramp(f, sec(0.3), sec(0.6)) * (1 - ramp(f, sec(2.8), sec(3.2)))} />
      </AbsoluteFill>
    </Scene>
  );
};
