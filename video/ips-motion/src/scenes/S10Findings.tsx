// 10 · 사용 ② Findings — 실제 Findings(저널 9편에서 뽑힌 39개). BI 필터 → IPS 필터 →
//   맨 아래(5번) 박스를 즐겨찾기하면 별표한 박스들 바로 뒤, 3번째로 올라온다 → 왼쪽 탐색 Future Item으로.
import React from 'react';
import { Easing, useCurrentFrame } from 'remotion';
import { AppScreen, WHOLE } from '../app/AppScreen';
import { findingsList, findingsViewHTML } from '../app/findings';
import { cursorProps, fadeStyle, ramp, type Step } from '../app/motion';
import { real } from '../app/real';
import { pageHTML } from '../app/shell';
import { sec } from '../theme';

export const S10_DURATION = sec(9.8);

const FAV0 = real.findingsFavorites;
const BI_CLICK = sec(1.35);
const IPS_CLICK = sec(3.95);
const STAR = sec(5.7); // 5번 박스 별표
const MOVE = [STAR + 4, STAR + sec(1.05)] as const; // 3번째 자리로 올라가는 동안
const NAV = S10_DURATION - 7;
const MOVE_EASE = Easing.bezier(0.65, 0, 0.35, 1); // AppScreen의 FLIP과 같은 곡선 — 스크롤과 박스 이동이 함께 간다

// 앱 창 기준 위치(실측): 목록 가운데 x 863, IPS 5번 박스 별 (1151, 1101 + 머리줄) — 스크롤 575일 때 화면 y ≈ 546
const LX = 863;
const S_BEFORE = 575; // 5번 박스가 보이도록
const S_AFTER = 60; // 1 · 2 · 3번(새로 올라온 박스)이 보이도록

export const S10Findings: React.FC = () => {
  const f = useCurrentFrame();
  const ips = findingsList('IPS', FAV0).shown;
  const target = ips[ips.length - 1].key; // 맨 아래(5번) 박스
  const starred = f >= STAR;
  const fav = starred ? [...FAV0, target] : FAV0;
  const filter = f < BI_CLICK ? 'all' : f < IPS_CLICK ? 'BI' : 'IPS';
  const since = f < BI_CLICK ? 0 : f < IPS_CLICK ? f - BI_CLICK : f - IPS_CLICK;
  const listIn = f < BI_CLICK ? 1 : ramp(since, 0, sec(0.25));
  const view = (favs: string[]) => findingsViewHTML(filter, favs, fadeStyle(ramp(f, 0, sec(0.3))), listIn >= 1 ? '' : `opacity:${0.4 + 0.6 * listIn}`);
  const html = pageHTML(f >= NAV ? 'future' : 'findings', view(fav));
  const flip = starred && f < MOVE[1] + 2 ? { from: pageHTML('findings', view(FAV0)), p: ramp(f, MOVE[0], MOVE[1], Easing.linear) } : undefined; // 곡선은 AppScreen이 입힌다

  const scroll =
    ramp(f, sec(1.7), sec(3.1)) * 250 * (f < sec(3.2) ? 1 : 1 - ramp(f, sec(3.2), sec(3.7))) +
    (f >= IPS_CLICK ? ramp(f, IPS_CLICK + sec(0.3), IPS_CLICK + sec(1.2)) * S_BEFORE : 0) -
    ramp(f, MOVE[0], MOVE[1], MOVE_EASE) * (S_BEFORE - S_AFTER);

  const path: Step[] = [
    { t: 0, sel: '.nav-tab[data-view="findings"]', ax: 0.35, k: 'pointer' },
    { t: sec(0.35), sel: '.nav-tab[data-view="findings"]', ax: 0.35, dx: 40, dy: 30, k: 'arrow' },
    { t: BI_CLICK - 3, sel: '[data-findings-filter="BI"]', k: 'pointer' },
    { t: BI_CLICK + sec(0.4), sel: '[data-findings-filter="BI"]', dx: 60, dy: 90, k: 'arrow' },
    { t: sec(3.3), x: LX + 200, y: 520, k: 'arrow' },
    { t: IPS_CLICK - 3, sel: '[data-findings-filter="IPS"]', k: 'pointer' },
    { t: IPS_CLICK + sec(0.5), sel: '[data-findings-filter="IPS"]', dx: 120, dy: 80, k: 'arrow' },
    { t: STAR - 3, sel: `[data-fav="${target}"]`, k: 'pointer' },
    { t: STAR + 5, x: 1151, y: 546, k: 'pointer' },
    { t: MOVE[1] + sec(0.6), x: 1110, y: 590, k: 'arrow' },
    { t: NAV - 3, sel: '.nav-tab[data-view="future"]', ax: 0.35, k: 'pointer' },
    { t: NAV + 20, sel: '.nav-tab[data-view="future"]', ax: 0.35, k: 'pointer' },
  ];
  return <AppScreen html={html} scroll={Math.max(0, scroll)} flip={flip} camera={WHOLE} cursor={cursorProps(path, f, [BI_CLICK, IPS_CLICK, STAR, NAV])} />;
};
