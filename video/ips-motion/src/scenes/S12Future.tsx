// 12 · 사용 ④ Future Item (1:21–1:27) — 저널의 행동을 등록하면 과목 보드로 옮겨 가고, 해내면 체크해 완료로 넘긴다
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Reveal, Scene, Tag } from '../motion';
import { Card, Chip4F, CourseBox, Cursor, Dot, StepLabel, Star, mix, ramp, useClick, useCursorPath } from '../phi';
import { C, sec } from '../theme';

export const S12_DURATION = sec(5.6);

const ACTION = '워드브레이킹 코드 서치 및 적용'; // 9월 16일 저널의 Future Item
const EXISTING = '오토레이아웃 및 설정들 유튜브 검색 및 공부';

// 왼쪽 저널 카드
const J = { x: 160, y: 250, w: 780, h: 560 };
const LINE = { x: J.x + 52, y: J.y + 318 };
const CHECK = { x: J.x + 52, y: J.y + J.h - 104 };
const BTN = { x: J.x + J.w - 52 - 180, y: J.y + J.h - 116, w: 180, h: 64 };
// 오른쪽 과목 보드
const B = { x: 1040, y: 250, w: 720 };
const ROW_H = 84;
const ROW1_Y = B.y + 128;
const ROW2_Y = ROW1_Y + ROW_H;
const TEXT_X = B.x + 44 + 24 + 20 + 40;

const CHECK_AT = sec(1.0);
const ORGANIZE_AT = sec(1.6);
const FLY = sec(1.85);
const DONE_AT = sec(3.55);

const Row: React.FC<{ n: number; text: string; y: number; done?: number; opacity?: number }> = ({ n, text, y, done = 0, opacity = 1 }) => (
  <div style={{ position: 'absolute', left: B.x + 44, top: y, width: B.w - 88, height: ROW_H, display: 'flex', alignItems: 'flex-start', gap: 20, paddingTop: 16, opacity }}>
    <span style={{ marginTop: 8 }}><Dot p={done} /></span>
    <span style={{ width: 40, fontSize: 28, color: C.secondary, textAlign: 'right' }}>{n}.</span>
    <span style={{ flex: 1, fontSize: 28, lineHeight: 1.45, color: done > 0.5 ? C.secondary : C.ink, textDecoration: done > 0.5 ? 'line-through' : 'none' }}>{text}</span>
    <span style={{ fontSize: 28, color: C.secondary }}>✕</span>
  </div>
);

export const S12Future: React.FC = () => {
  const f = useCurrentFrame();
  const cursor = useCursorPath([
    [sec(0.4), 1300, 960],
    [CHECK_AT - 4, CHECK.x + 14, CHECK.y + 16],
    [CHECK_AT + 10, CHECK.x + 14, CHECK.y + 16],
    [ORGANIZE_AT - 4, BTN.x + 90, BTN.y + 34],
    [ORGANIZE_AT + 10, BTN.x + 90, BTN.y + 34],
    [sec(2.4), BTN.x + 200, BTN.y + 60],
    [DONE_AT - 4, B.x + 44 + 12, ROW2_Y + 36],
    [DONE_AT + 12, B.x + 44 + 12, ROW2_Y + 36],
    [sec(4.6), B.x + 160, ROW2_Y + 160],
  ]);
  const press = Math.max(useClick(CHECK_AT), useClick(ORGANIZE_AT), useClick(DONE_AT));
  const checked = f >= CHECK_AT && f < ORGANIZE_AT + 6; // 정리하기 뒤 체크가 풀린다(실제 동작)
  const fly = ramp(f, FLY, FLY + sec(1.0));
  const landed = fly >= 1;
  const done = ramp(f, DONE_AT, DONE_AT + sec(0.3));
  const fold = ramp(f, DONE_AT + sec(0.5), DONE_AT + sec(1.0));
  const count = landed ? (fold > 0.5 ? 1 : 2) : 1;
  const toast = ramp(f, ORGANIZE_AT + 4, ORGANIZE_AT + sec(0.35)) * (1 - ramp(f, sec(3.0), sec(3.4)));

  return (
    <Scene duration={S12_DURATION}>
      <AbsoluteFill>
        <StepLabel num="④" verb="행동으로" name="Future Item" />

        {/* 왼쪽: 저널의 Future Item */}
        <Reveal at={0} style={{ position: 'absolute', left: J.x, top: J.y, width: J.w, height: J.h }}>
          <Card style={{ height: '100%', padding: '48px 52px' }}>
            <p style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em' }}>9월 16일 저널</p>
            <div style={{ marginTop: 34 }}><Chip4F size={26}>Future Item</Chip4F></div>
            <div style={{ marginTop: 28 }}><CourseBox code="BI" name="Beautiful Interface" size={26} /></div>
          </Card>
        </Reveal>
        <Reveal at={0} style={{ position: 'absolute', left: LINE.x, top: LINE.y, fontSize: 30, lineHeight: 1.5, color: C.ink }}>
          1. <span style={{ opacity: fly > 0 ? 0.25 : 1 }}>{ACTION}</span>
        </Reveal>
        {/* 등록 체크 + 정리하기 */}
        <Reveal at={0} style={{ position: 'absolute', left: CHECK.x, top: CHECK.y, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, boxShadow: `inset 0 0 0 2px ${checked ? C.ink : C.secondary}`, background: checked ? C.ink : C.white, color: C.white, display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700 }}>{checked ? '✓' : ''}</span>
          <span style={{ fontSize: 26, color: C.ink }}>Future Item에 등록하기</span>
        </Reveal>
        <Reveal at={0} style={{ position: 'absolute', left: BTN.x, top: BTN.y, width: BTN.w, height: BTN.h }}>
          <span style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', borderRadius: 20, background: C.ink, color: C.white, fontSize: 26, fontWeight: 700 }}>정리하기</span>
        </Reveal>

        {/* 오른쪽: 과목 보드 */}
        <Reveal at={sec(0.15)} style={{ position: 'absolute', left: B.x, top: B.y, width: B.w }}>
          <Card style={{ padding: '40px 44px', height: 128 + ROW_H * 2 + 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Star size={30} />
              <span style={{ fontSize: 32, color: C.ink }}><b>BI</b>_Beautiful Interface</span>
              <span style={{ marginLeft: 8, fontSize: 30, color: C.secondary }}>{count}</span>
            </div>
          </Card>
        </Reveal>
        <Reveal at={sec(0.15)}><Row n={1} text={EXISTING} y={ROW1_Y} /></Reveal>
        {landed && <Row n={2} text={ACTION} y={ROW2_Y} done={done} opacity={1 - fold} />}
        {fold > 0 && (
          <p style={{ position: 'absolute', left: B.x + 44, top: ROW2_Y + 24, fontSize: 28, color: C.secondary, opacity: fold }}>
            완료한 항목 <span style={{ marginLeft: 8, color: C.ink, fontWeight: 700 }}>1</span> <span style={{ fontSize: 16, marginLeft: 6 }}>▼</span>
          </p>
        )}

        {/* 저널 줄 → 보드 둘째 줄 */}
        {fly > 0 && !landed && (
          <p style={{
            position: 'absolute', left: mix(LINE.x + 34, TEXT_X, fly), top: mix(LINE.y, ROW2_Y + 16, fly) - Math.sin(fly * Math.PI) * 80,
            fontSize: mix(30, 28, fly), lineHeight: 1.45, color: C.ink, whiteSpace: 'nowrap',
            padding: '4px 12px', margin: '-4px -12px', borderRadius: 12, background: C.white,
            boxShadow: `0 12px 30px rgba(0,0,0,${0.1 * Math.sin(fly * Math.PI)})`,
          }}>{ACTION}</p>
        )}

        {/* 토스트 */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 110, display: 'flex', justifyContent: 'center', opacity: toast, transform: `translateY(${(1 - toast) * 16}px)` }}>
          <Tag size={28}>1개 Future Item 등록됨</Tag>
        </div>

        <Cursor x={cursor.x} y={cursor.y} press={press} opacity={ramp(f, sec(0.3), sec(0.6)) * (1 - ramp(f, sec(4.4), sec(4.8)))} />
      </AbsoluteFill>
    </Scene>
  );
};
