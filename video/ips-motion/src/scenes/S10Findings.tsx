// 10 · 사용 ② Findings (1:08–1:15) — 칠한 문장이 Findings 카드로 모이고, 별표한 카드가 맨 위로 올라간다
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Reveal, Scene } from '../motion';
import { Card, Chip4F, CourseBox, Mark, Star, StepLabel, mix, ramp } from '../phi';
import { C, sec } from '../theme';
import { JOURNAL_0916 } from './S09Journal';

export const S10_DURATION = sec(7);

// 왼쪽: 작은 저널 카드
const J = { x: 120, y: 250, w: 660 };
const J_LINE_Y = (i: number) => J.y + 300 + i * 100; // 칠한 문장의 윗변
// 오른쪽: Findings 목록
const L = { x: 880, y: 330, w: 920 };
const CARD_H = 170;
const CARD_GAP = 24;
const slotY = (slot: number) => L.y + slot * (CARD_H + CARD_GAP);
const TEXT_DX = 44;
const TEXT_DY = 100;

const FLY = [sec(0.6), sec(0.85), sec(1.1)];
const FLY_DUR = sec(1.0);
const SETTLE = sec(2.1); // 카드 틀이 굳음
const STAR_AT = sec(3.5);
const SWAP = sec(4.1); // 별표한 둘째 카드가 맨 위로
const STARRED = 1;

export const S10Findings: React.FC = () => {
  const f = useCurrentFrame();
  const settle = ramp(f, SETTLE - sec(0.4), SETTLE + sec(0.2));
  const swap = ramp(f, SWAP, SWAP + sec(0.8));
  const star = ramp(f, STAR_AT, STAR_AT + sec(0.35));
  const dimJournal = ramp(f, sec(1.6), sec(2.4));
  // 자리: 처음 [0,1,2] → 별표 뒤 [1,0,2]
  const slotOf = (i: number) => (i === STARRED ? mix(1, 0, swap) : i === 0 ? mix(0, 1, swap) : 2);
  const numberOf = (i: number) => (swap > 0.5 ? (i === STARRED ? 1 : i === 0 ? 2 : 3) : i + 1);

  return (
    <Scene duration={S10_DURATION}>
      <AbsoluteFill>
        <StepLabel num="②" verb="모인다" name="Findings" />

        {/* 왼쪽: 방금 쓴 저널(작게) */}
        <Reveal at={0} style={{ position: 'absolute', left: J.x, top: J.y, width: J.w }}>
          <Card style={{ padding: '40px 44px', height: 620, opacity: 1 - dimJournal * 0.6 }}>
            <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>9월 16일 저널</p>
            <div style={{ marginTop: 26 }}><Chip4F size={22}>Finding</Chip4F></div>
            <div style={{ marginTop: 22 }}><CourseBox code="BI" name="Beautiful Interface" size={22} /></div>
          </Card>
        </Reveal>
        {JOURNAL_0916.map((l, i) => (
          <p key={`src-${i}`} style={{ position: 'absolute', left: J.x + 44, top: J_LINE_Y(i) - 8, width: J.w - 88, fontSize: 24, lineHeight: 1.6, color: C.secondary, opacity: 1 - dimJournal * 0.6 }}>
            {i + 1}. <Mark p={1} style={{ color: C.tertiary, background: 'transparent' }}>{l.key}</Mark>
          </p>
        ))}

        {/* 오른쪽: Findings 머리 + 필터 */}
        <Reveal at={sec(0.2)} style={{ position: 'absolute', left: L.x, top: 220, display: 'flex', alignItems: 'center', gap: 14 }}>
          {[['All', 3], ['즐겨찾기', star > 0.5 ? 1 : 0], ['BI', 3]].map(([name, n], k) => (
            <span key={name} style={{ padding: '12px 22px', borderRadius: 18, background: k === 0 ? C.soft : 'transparent', fontSize: 28, fontWeight: k === 0 ? 700 : 500, color: k === 0 ? C.ink : C.secondary }}>
              {name}<span style={{ marginLeft: 12, fontWeight: 500, color: C.secondary }}>{n}</span>
            </span>
          ))}
        </Reveal>

        {/* 카드 틀 */}
        {JOURNAL_0916.map((_, i) => {
          const y = slotY(slotOf(i));
          return (
            <div key={`card-${i}`} style={{ position: 'absolute', left: L.x, top: y, width: L.w, height: CARD_H, opacity: settle, transform: `scale(${mix(0.96, 1, settle)})` }}>
              <Card style={{ height: '100%', padding: '30px 36px', boxShadow: `inset 0 0 0 2px ${C.rule}${i === STARRED && swap > 0 && swap < 1 ? ', 0 16px 40px rgba(0,0,0,0.08)' : ''}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <span style={{ width: 40, height: 40, borderRadius: '50%', background: C.ink, color: C.white, display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700 }}>{numberOf(i)}</span>
                  <span style={{ fontSize: 28, color: C.ink }}><b>BI</b>_Beautiful Interface</span>
                  <span style={{ fontSize: 24, color: C.secondary }}>9월 16일</span>
                  <span style={{ marginLeft: 'auto' }}><Star p={i === STARRED ? star : 0} /></span>
                </div>
              </Card>
            </div>
          );
        })}

        {/* 칠한 문장: 저널 → 카드 자리로 곡선 이동 */}
        {JOURNAL_0916.map((l, i) => {
          const p = ramp(f, FLY[i], FLY[i] + FLY_DUR);
          const tx = L.x + TEXT_DX;
          const ty = slotY(slotOf(i)) + TEXT_DY - 6;
          const x = mix(J.x + 44 + 34, tx, p);
          const y = mix(J_LINE_Y(i) - 8, ty, p) - Math.sin(p * Math.PI) * 90;
          const size = mix(24, 30, p);
          return (
            <p key={`fly-${i}`} style={{ position: 'absolute', left: x, top: y, fontSize: size, lineHeight: 1.6, color: C.ink, whiteSpace: 'nowrap', filter: p > 0 && p < 1 ? `drop-shadow(0 10px 18px rgba(0,0,0,${0.1 * Math.sin(p * Math.PI)}))` : undefined }}>
              <Mark p={1}>{l.key}</Mark>
            </p>
          );
        })}
      </AbsoluteFill>
    </Scene>
  );
};
