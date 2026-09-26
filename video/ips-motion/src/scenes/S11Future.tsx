// 11 · 사용 ③ Future Item — 실제 Future Item 보드(3주차). 급한 IPS · BI 박스에 별표 → 맨 위 "즐겨찾기" 줄로 올라가고,
//   IPS의 1 · 2번 항목을 체크해 완료로 넘긴다(앱의 알림 문구 그대로) → 왼쪽 탐색 Assignment Manage로.
import React from 'react';
import { Easing, useCurrentFrame } from 'remotion';
import { AppScreen, WHOLE } from '../app/AppScreen';
import { doneToast, futureViewHTML, openItems } from '../app/future';
import { cursorProps, fadeStyle, ramp, type Step } from '../app/motion';
import { TODAY } from '../app/real';
import { pageHTML, toastHTML } from '../app/shell';
import { sec } from '../theme';

export const S11_DURATION = sec(10.6);

const STAR_IPS = sec(1.9);
const STAR_BI = sec(3.4);
const FLIP_LEN = sec(0.9);
const CHECK = [sec(5.6), sec(7.1)]; // IPS 1번 · 2번 체크(2번은 1번이 빠진 뒤 같은 자리에 온다)
const COLLAPSE = sec(0.45);
const NAV = S11_DURATION - 7;
const GRID_SCROLL = 420; // 과목 박스 격자가 보이도록(실측: 필터 줄 573, 격자 620)

export const S11Future: React.FC = () => {
  const f = useCurrentFrame();
  const ips = openItems('course:IPS');
  const ids = [ips[0].id, ips[1].id];
  const favAt = (t: number) => (t >= STAR_BI ? ['course:IPS', 'course:BI'] : t >= STAR_IPS ? ['course:IPS'] : []);
  const done: Record<string, number> = {};
  const checking: Record<string, number> = {};
  CHECK.forEach((t, i) => {
    if (f >= t + COLLAPSE) done[ids[i]] = TODAY;
    else if (f >= t) checking[ids[i]] = 1;
  });
  const fade = ramp(f, 0, sec(0.3));
  const view = (favorites: string[]) => futureViewHTML({ favorites, done, checking, style: fadeStyle(fade) });
  // 알림: 완료할 때마다(앱 문구) — 다음 알림이 오면 바뀐다
  const toastIdx = f >= CHECK[1] ? 1 : f >= CHECK[0] ? 0 : -1;
  const toastP = toastIdx < 0 ? 0 : ramp(f, CHECK[toastIdx] + 3, CHECK[toastIdx] + sec(0.35)) * (1 - ramp(f, NAV - sec(0.6), NAV - sec(0.2)));
  const html = pageHTML(f >= NAV ? 'assignment' : 'future', view(favAt(f)), toastIdx < 0 ? '' : toastHTML(doneToast(ips[toastIdx].text), toastP));
  const flipAt = [STAR_IPS, STAR_BI].find((t) => f >= t && f < t + FLIP_LEN + 2);
  const flip = flipAt !== undefined ? { from: pageHTML('future', view(favAt(flipAt - 1))), p: ramp(f, flipAt + 3, flipAt + FLIP_LEN, Easing.linear) } : undefined;
  const collapse = CHECK.map((t, i) => ({ sel: `[data-id="${ids[i]}"]`, p: f >= t && f < t + COLLAPSE ? ramp(f, t + 5, t + COLLAPSE, Easing.linear) : 0 }));
  const scroll = ramp(f, sec(0.35), sec(1.2)) * GRID_SCROLL;

  const firstRow = `[data-box="course:IPS"] .fi-row:first-child .fi-check`;
  const path: Step[] = [
    { t: 0, sel: '.nav-tab[data-view="future"]', ax: 0.35, k: 'pointer' },
    { t: sec(0.4), sel: '.nav-tab[data-view="future"]', ax: 0.35, dx: 60, dy: 40, k: 'arrow' },
    { t: STAR_IPS - 3, sel: '[data-box-fav="course:IPS"]', k: 'pointer' },
    { t: STAR_IPS + FLIP_LEN, sel: '[data-box-fav="course:IPS"]', dx: 70, dy: 60, k: 'arrow' },
    { t: STAR_BI - 3, sel: '[data-box-fav="course:BI"]', k: 'pointer' },
    { t: STAR_BI + FLIP_LEN, sel: '[data-box-fav="course:BI"]', dx: 90, dy: 70, k: 'arrow' },
    { t: CHECK[0] - 3, sel: firstRow, k: 'pointer' },
    { t: CHECK[1] + 8, sel: firstRow, k: 'pointer' },
    { t: CHECK[1] + sec(0.9), sel: firstRow, dx: 90, dy: 60, k: 'arrow' },
    { t: NAV - 3, sel: '.nav-tab[data-view="assignment"]', ax: 0.3, k: 'pointer' },
    { t: NAV + 20, sel: '.nav-tab[data-view="assignment"]', ax: 0.3, k: 'pointer' },
  ];
  return <AppScreen html={html} scroll={scroll} flip={flip} collapse={collapse} camera={WHOLE} cursor={cursorProps(path, f, [STAR_IPS, STAR_BI, ...CHECK, NAV])} />;
};
