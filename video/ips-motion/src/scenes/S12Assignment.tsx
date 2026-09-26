// 12 · 사용 ④ Assignment Manage — 실제 3주차 표 풀샷(Gmail 연결 · 12과목 · 마감 배지).
//   IPS "자세히보기" → 칸 옆 과제 내용 팝업(실제 공지) → ⋯ → 전체보기(크게) → 닫기
//   → "제출 상태 새로고침" → 아래 동기화 완료 알림 → 메일로 확인된 IPS 과제가 미확인 → 제출 확인, 완료 5 → 6 / 24.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { AppScreen, WHOLE } from '../app/AppScreen';
import { assignmentViewHTML, placeNoteDetail } from '../app/assignment';
import { cursorProps, fadeStyle, ramp, type Step } from '../app/motion';
import { pageHTML, toastHTML } from '../app/shell';
import { Scene } from '../motion';
import { sec } from '../theme';

export const S12_DURATION = sec(13.6);

const NOTE = sec(1.5); // 자세히보기
const MENU = sec(3.7); // ⋯
const EXPAND = sec(4.3); // 전체보기
const CLOSE = sec(7.2); // ✕
const REFRESH = sec(8.0); // 제출 상태 새로고침
const SYNCED = sec(9.1); // 동기화 끝 — 새로 확인됨 1
const POP = sec(0.28); // 앱의 popIn 길이

export const S12Assignment: React.FC = () => {
  const f = useCurrentFrame();
  const detail = f >= NOTE && f < CLOSE + sec(0.2) ? (f >= EXPAND ? 'expanded' : 'note') : '';
  const popAt = f >= EXPAND ? EXPAND : NOTE;
  const pin = ramp(f, popAt, popAt + POP);
  const pout = ramp(f, CLOSE + 2, CLOSE + sec(0.2));
  const detailStyle = `opacity:${pin * (1 - pout)};filter:blur(${(1 - pin) * 6 + pout * 6}px);transform:translateY(${(1 - pin) * -4}px)`;
  const synced = f >= SYNCED;
  const flashP = synced ? Math.sin(ramp(f, SYNCED, SYNCED + sec(1.4)) * Math.PI) : 0;
  const fade = ramp(f, 0, sec(0.3));
  const view = assignmentViewHTML({
    confirm: synced ? ['ips:assignment'] : [],
    flash: { 'ips:assignment': flashP },
    refreshing: f >= REFRESH && !synced,
    detail: detail as '' | 'note' | 'expanded',
    menu: f >= MENU && f < EXPAND,
    detailStyle,
    style: fadeStyle(fade),
  });
  const toastP = ramp(f, SYNCED + 3, SYNCED + sec(0.35));
  const html = pageHTML('assignment', view, toastHTML('동기화 완료 · 새로 확인됨 1 · 검토 필요 0', toastP));
  // 전체보기는 공지 끝(추가 입력칸)까지 천천히 내려 읽는다 — 작은 팝업은 제목 · 마감이 보이게 그대로
  const inner = detail === 'expanded' ? ramp(f, EXPAND + sec(0.9), EXPAND + sec(2.4)) * 600 : 0;
  const place = (root: ShadowRoot, vw: number, vh: number) => {
    placeNoteDetail(root, vw, vh);
    const d = root.querySelector<HTMLElement>('#am-detail');
    if (d) d.scrollTop = inner;
  };

  const path: Step[] = [
    { t: 0, sel: '.nav-tab[data-view="assignment"]', ax: 0.3, k: 'pointer' },
    { t: sec(0.45), sel: '.nav-tab[data-view="assignment"]', ax: 0.3, dx: 80, dy: 50, k: 'arrow' },
    { t: NOTE - 3, sel: '[data-note-course="ips"]', k: 'pointer' },
    { t: NOTE + sec(0.5), sel: '[data-note-course="ips"]', dx: -30, dy: 40, k: 'arrow' },
    { t: MENU - 3, sel: '[data-note-act="menu"]', k: 'pointer' },
    { t: EXPAND - 3, sel: '[data-note-act="expand"]', k: 'pointer' },
    { t: EXPAND + sec(0.6), x: 1000, y: 470, k: 'arrow' },
    { t: CLOSE - sec(0.6), x: 1000, y: 470, k: 'arrow' },
    { t: CLOSE - 3, sel: '[data-note-act="close"]', k: 'pointer' },
    { t: CLOSE + sec(0.2), x: 1060, y: 120, k: 'arrow' },
    { t: REFRESH - 3, sel: '#am-refresh', k: 'pointer' },
    { t: SYNCED + sec(0.4), sel: '#am-refresh', dx: 40, dy: 50, k: 'arrow' },
    { t: S12_DURATION, sel: '#am-refresh', dx: 60, dy: 90, k: 'arrow' },
  ];
  return (
    <Scene duration={S12_DURATION} exit={sec(0.5)}>
      <AppScreen html={html} place={place} camera={WHOLE} cursor={cursorProps(path, f, [NOTE, MENU, EXPAND, CLOSE, REFRESH])} />
    </Scene>
  );
};
