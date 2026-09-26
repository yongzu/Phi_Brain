// 9 · 사용 ① Journaling (1:00–1:08) — 9월 16일 BI 저널을 쓰고, Ctrl + H로 핵심 문장에 형광펜을 칠한다
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Reveal, Scene } from '../motion';
import { Card, Chip4F, CourseBox, Keycap, Mark, StepLabel, ramp } from '../phi';
import { C, sec } from '../theme';

export const S09_DURATION = sec(8);

// 실제 9월 16일 저널(BI)의 문장 — key는 형광펜을 칠한 부분
export const JOURNAL_0916 = [
  { key: '양쪽정렬은 절대 안쓴다.', rest: ' 양쪽 정렬을 사용 시 자간이 들쭉날쭉해지기 때문에 가독성을 해치기 쉽다.' },
  { key: '레퍼런스를 찾을때 문제정의로부터 출발한다.', rest: ' 이런 문제를 갖고있고, 해결하는 서비스는 무엇이 있을지?' },
  { key: 'width 너비가 너무 좁거나 넓으면 읽기가 힘들다.', rest: ' 블로그나 포스트 섹션의 경우 대체로 500~700px 사이의 width를 가진다.' },
];

const TYPE_FROM = sec(1.3);
const CHARS_PER_FRAME = 1.15;
const MARK_AT = [sec(4.3), sec(5.2), sec(6.1)]; // 줄마다 Ctrl + H

// 줄마다 타이핑 시작 프레임
const starts = JOURNAL_0916.reduce<number[]>((acc, l, i) => {
  const prev = i === 0 ? TYPE_FROM : acc[i - 1] + Math.ceil((JOURNAL_0916[i - 1].key.length + JOURNAL_0916[i - 1].rest.length) / CHARS_PER_FRAME) + 6;
  return [...acc, prev];
}, []);

const Line: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const { key, rest } = JOURNAL_0916[i];
  const n = Math.max(0, Math.floor((f - starts[i]) * CHARS_PER_FRAME));
  if (n <= 0) return null;
  const typedKey = key.slice(0, n);
  const typedRest = rest.slice(0, Math.max(0, n - key.length));
  const typing = n < key.length + rest.length;
  const p = ramp(f, MARK_AT[i], MARK_AT[i] + sec(0.55));
  return (
    <p style={{ fontSize: 34, lineHeight: 1.75, letterSpacing: '-0.015em', color: C.ink }}>
      <span>{i + 1}. </span>
      {p > 0 ? <Mark p={p}>{typedKey}</Mark> : <span>{typedKey}</span>}
      <span>{typedRest}</span>
      {typing && <span style={{ display: 'inline-block', width: 3, height: 38, marginLeft: 2, verticalAlign: '-6px', background: C.ink }} />}
    </p>
  );
};

export const S09Journal: React.FC = () => {
  const f = useCurrentFrame();
  const press = MARK_AT.reduce((m, at) => Math.max(m, ramp(f, at - 6, at) * (1 - ramp(f, at + 4, at + 12))), 0);
  return (
    <Scene duration={S09_DURATION}>
      <AbsoluteFill>
        <StepLabel num="①" verb="쓴다 · 표시한다" name="Journaling" />
        <Reveal at={sec(0.3)} y={40} style={{ position: 'absolute', left: 200, top: 190, width: 1520 }}>
          <Card style={{ padding: '56px 64px 64px', minHeight: 720 }}>
            <p style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', color: C.ink }}>9월 16일 저널</p>
            <Reveal at={sec(0.6)} style={{ marginTop: 40 }}><Chip4F>Finding</Chip4F></Reveal>
            <Reveal at={sec(0.9)} y={12} style={{ marginTop: 36 }}><CourseBox code="BI" name="Beautiful Interface" /></Reveal>
            <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {JOURNAL_0916.map((_, i) => <Line key={i} i={i} />)}
            </div>
          </Card>
        </Reveal>
        {/* Ctrl + H — 형광펜 단축키 */}
        <Reveal at={sec(3.9)} style={{ position: 'absolute', right: 200, top: 92 }}>
          <Keycap keys={['Ctrl', 'H']} press={press} />
        </Reveal>
      </AbsoluteFill>
    </Scene>
  );
};
