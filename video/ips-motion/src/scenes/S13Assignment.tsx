// 13 · 사용 ⑤ Assignment Manage (1:27–1:34) — 과제 내용을 자세히 보고, 확인메일이 오면 제출 확인으로 바뀐다
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Reveal, Scene, Tag } from '../motion';
import { Cursor, Dot, StepLabel, Star, mix, ramp, useClick, useCursorPath } from '../phi';
import { C, sec } from '../theme';

export const S13_DURATION = sec(7);

// 2주차 읽기 전용 표(ips/img/phi-assignment.webp)에서 다섯 과목. a = Assignment, s = Self-Feedback
const ROWS = [
  { code: 'AL', name: 'Aesthetic Literacy', a: true, s: true },
  { code: 'BI', name: 'Beautiful Interface', a: false, s: true },
  { code: 'EWA', name: 'Engaging with AI', a: true, s: true },
  { code: 'IPS', name: 'Iterative Problem Solving', a: true, s: true },
  { code: 'TF', name: 'Typography as Foundation', a: false, s: true },
];
const TARGET = 1; // BI
// 과제 내용 팝업 — 마감·본문은 예시(실제 공지로 바꿀 것)
const NOTE = {
  due: '마감 9월 22일 (월) 오후 11:59',
  lines: ['오늘 배운 내용을 가지고 기존 과제 디벨롭', '차주 과제는 다른 섹션에 적용', '레퍼런스는 형식 자유'],
};

const T = { x: 160, y: 330, w: 1600 };
const COLS = [640, 330, 330, 300];
const colX = (c: number) => T.x + COLS.slice(0, c).reduce((a, b) => a + b, 0);
const HEAD_H = 64;
const ROW_H = 100;
const rowY = (i: number) => T.y + HEAD_H + i * ROW_H;

const OPEN_AT = sec(1.4);
const CLOSE_AT = sec(3.8);
const MAIL_AT = sec(4.3);
const CONFIRM_AT = sec(5.0);

const Status: React.FC<{ p: number }> = ({ p }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 14, fontSize: 28, color: p > 0.5 ? C.ink : C.secondary }}>
    <Dot p={p} size={20} />{p > 0.5 ? '제출 확인' : '미확인'}<span style={{ marginLeft: 14, fontSize: 24, color: C.secondary }}>↗</span>
  </span>
);

export const S13Assignment: React.FC = () => {
  const f = useCurrentFrame();
  const noteBtn = { x: colX(2) + 32 + 60, y: rowY(TARGET) + ROW_H / 2 - 4 };
  const cursor = useCursorPath([
    [sec(0.5), 1500, 980],
    [OPEN_AT - 4, noteBtn.x, noteBtn.y],
    [OPEN_AT + 12, noteBtn.x, noteBtn.y],
    [CLOSE_AT - 4, 1500, 290],
    [CLOSE_AT + 10, 1500, 290],
    [sec(4.6), 1560, 200],
  ]);
  const press = Math.max(useClick(OPEN_AT), useClick(CLOSE_AT));
  const pop = ramp(f, OPEN_AT, OPEN_AT + sec(0.35)) * (1 - ramp(f, CLOSE_AT, CLOSE_AT + sec(0.3)));
  const mail = ramp(f, MAIL_AT, CONFIRM_AT);
  const confirm = ramp(f, CONFIRM_AT, CONFIRM_AT + sec(0.3));
  const flash = ramp(f, CONFIRM_AT, CONFIRM_AT + sec(0.2)) * (1 - ramp(f, CONFIRM_AT + sec(0.6), CONFIRM_AT + sec(1.2)));
  const done = ROWS.reduce((n, r) => n + (r.a ? 1 : 0) + (r.s ? 1 : 0), 0) + (confirm > 0.5 ? 1 : 0);

  return (
    <Scene duration={S13_DURATION}>
      <AbsoluteFill>
        <StepLabel num="⑤" verb="과제까지" name="Assignment Manage" />

        {/* 주차 · 진행 */}
        <Reveal at={sec(0.1)} style={{ position: 'absolute', left: T.x, top: 226, display: 'flex', alignItems: 'baseline', gap: 36 }}>
          <span style={{ fontSize: 32, color: C.ink }}><span style={{ color: C.secondary, marginRight: 18 }}>‹</span>2주차<span style={{ color: C.secondary, marginLeft: 18 }}>›</span></span>
          <span style={{ fontSize: 30, color: C.secondary, fontVariantNumeric: 'tabular-nums' }}>완료 <b style={{ color: C.ink }}>{done}</b> / {ROWS.length * 2}</span>
        </Reveal>

        {/* 표 머리 */}
        <Reveal at={sec(0.2)} style={{ position: 'absolute', left: T.x, top: T.y, width: T.w, height: HEAD_H, display: 'flex', alignItems: 'center', borderBottom: `2px solid ${C.rule}`, fontSize: 26, color: C.secondary }}>
          {['Course', 'Assignment', '과제 내용', 'Self-Feedback'].map((h, c) => <span key={h} style={{ width: COLS[c], paddingLeft: 32 }}>{h}</span>)}
        </Reveal>

        {/* 줄 */}
        {ROWS.map((r, i) => (
          <Reveal key={r.code} at={sec(0.3 + i * 0.07)} style={{ position: 'absolute', left: T.x, top: rowY(i), width: T.w, height: ROW_H, display: 'flex', alignItems: 'center', borderBottom: i < ROWS.length - 1 ? `2px solid ${C.rule}` : 'none', background: i === TARGET ? `rgba(255, 241, 166, ${flash * 0.6})` : 'transparent' }}>
            <span style={{ width: COLS[0], paddingLeft: 24, display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, color: C.ink }}>
              <Star size={30} />
              <span><b>{r.code}</b>_{r.name}</span>
              <span style={{ padding: '2px 10px', borderRadius: 8, boxShadow: `inset 0 0 0 2px ${C.rule}`, fontSize: 20, color: C.secondary }}>WK02</span>
            </span>
            <span style={{ width: COLS[1], paddingLeft: 32 }}><Status p={r.a ? 1 : i === TARGET ? confirm : 0} /></span>
            <span style={{ width: COLS[2], paddingLeft: 32, fontSize: 28, color: i === TARGET && pop > 0 ? C.ink : C.secondary }}>
              <span style={{ padding: '8px 16px', margin: '-8px -16px', borderRadius: 14, background: i === TARGET && pop > 0 ? C.soft : 'transparent' }}>자세히보기</span>
            </span>
            <span style={{ width: COLS[3], paddingLeft: 32 }}><Status p={r.s ? 1 : 0} /></span>
          </Reveal>
        ))}

        {/* 과제 내용 팝업 */}
        {pop > 0 && (
          <div style={{
            position: 'absolute', left: colX(2) + 8, top: rowY(TARGET) + ROW_H - 6, width: 700, padding: '36px 40px',
            background: C.white, borderRadius: 28, boxShadow: `inset 0 0 0 2px ${C.rule}, 0 24px 60px rgba(0,0,0,0.10)`,
            opacity: pop, transform: `translateY(${(1 - pop) * 14}px) scale(${mix(0.97, 1, pop)})`, transformOrigin: 'top left', filter: `blur(${(1 - pop) * 6}px)`,
          }}>
            <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: C.ink }}>BI_Beautiful Interface · 2주차 과제</p>
            <span style={{ display: 'inline-block', marginTop: 18, padding: '6px 14px', borderRadius: 10, background: C.soft, fontSize: 22, color: C.ink }}>{NOTE.due}</span>
            <ul style={{ listStyle: 'none', marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {NOTE.lines.map((l) => (
                <li key={l} style={{ display: 'flex', gap: 14, fontSize: 26, lineHeight: 1.5, color: C.ink }}><span style={{ color: C.secondary }}>·</span>{l}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 확인메일 → BI Assignment 칸 */}
        {mail > 0 && mail < 1 && (
          <div style={{ position: 'absolute', left: mix(1780, colX(1) + 40, mail), top: mix(150, rowY(TARGET) + 26, mail), opacity: Math.min(1, mail * 4) * (1 - ramp(f, CONFIRM_AT - sec(0.15), CONFIRM_AT)), transform: `scale(${mix(1, 0.8, mail)})` }}>
            <Tag size={26}>제출 확인메일 도착</Tag>
          </div>
        )}

        <Cursor x={cursor.x} y={cursor.y} press={press} pointer={f > OPEN_AT - sec(0.4) && f < OPEN_AT + sec(0.3)} opacity={ramp(f, sec(0.4), sec(0.7)) * (1 - ramp(f, sec(4.2), sec(4.6)))} />
      </AbsoluteFill>
    </Scene>
  );
};
