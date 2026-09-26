// 장면을 순서대로 잇는다. 장면 길이는 각 장면 파일의 *_DURATION.
// enter가 있는 장면은 앞 장면을 밀어내며 들어온다(슬라이드, SLIDE만큼 겹침). 없으면 앞 장면이 흐려지며 끝난 뒤 이어진다.
import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { SceneExit } from './motion';
import { C, FONT, H, W, sec } from './theme';
import { INTRO_DURATION, LogoIntro } from './intro/LogoIntro';
import { S01Question, S01_DURATION } from './scenes/S01Question';
import { S02Effects, S02_DURATION } from './scenes/S02Effects';
import { S03Problem, S03_DURATION } from './scenes/S03Problem';
import { S04Whys, S04_DURATION } from './scenes/S04Whys';
import { S05RootCause, S05_DURATION } from './scenes/S05RootCause';
import { S06Hmw, S06_DURATION } from './scenes/S06Hmw';
import { S07Ideas, S07_DURATION } from './scenes/S07Ideas';
import { S08Choose, S08_DURATION } from './scenes/S08Choose';
import { S09Journal, S09_DURATION } from './scenes/S09Journal';
import { S10Findings, S10_DURATION } from './scenes/S10Findings';
import { S11Future, S11_DURATION } from './scenes/S11Future';
import { S12Assignment, S12_DURATION } from './scenes/S12Assignment';
import { S13Outro, S13_DURATION } from './scenes/S13Outro';

type Dir = 'left' | 'up'; // 새 장면이 들어오는 방향(오른쪽 → 왼쪽 / 아래 → 위)

export const SCENES: { id: string; duration: number; Component: React.FC; enter?: Dir }[] = [
  { id: '00-logo-intro', duration: INTRO_DURATION, Component: LogoIntro }, // 따로 만든 로고 인트로와 같은 것
  { id: '01-question', duration: S01_DURATION, Component: S01Question },
  { id: '02-effects', duration: S02_DURATION, Component: S02Effects },
  { id: '03-problem', duration: S03_DURATION, Component: S03Problem, enter: 'left' },
  { id: '04-whys', duration: S04_DURATION, Component: S04Whys },
  { id: '05-root-cause', duration: S05_DURATION, Component: S05RootCause },
  { id: '06-pov', duration: S06_DURATION, Component: S06Hmw, enter: 'left' },
  { id: '07-ideas', duration: S07_DURATION, Component: S07Ideas, enter: 'up' },
  { id: '08-choose', duration: S08_DURATION, Component: S08Choose }, // 7번 화면을 그대로 이어받음
  { id: '08-logo-intro', duration: INTRO_DURATION, Component: LogoIntro }, // 선택 → 로고: 앞 인트로와 똑같이
  // 9~12: 실제 앱 화면을 한 번에 이어서 쓴다 — 왼쪽 탐색을 눌러 다음 화면으로(장면 사이 전환 없이 이어짐)
  { id: '09-journal', duration: S09_DURATION, Component: S09Journal },
  { id: '10-findings', duration: S10_DURATION, Component: S10Findings },
  { id: '11-future', duration: S11_DURATION, Component: S11Future },
  { id: '12-assignment', duration: S12_DURATION, Component: S12Assignment },
  { id: '13-outro', duration: S13_DURATION, Component: S13Outro },
];

const SLIDE = sec(0.9);
const SLIDE_EASE = Easing.bezier(0.76, 0, 0.24, 1);
export const STARTS = SCENES.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].duration - (s.enter ? SLIDE : 0)], []);
export const TOTAL = STARTS[SCENES.length - 1] + SCENES[SCENES.length - 1].duration;

/** 슬라이드 인/아웃: 들어오는 장면은 화면 밖에서 제자리로, 나가는 장면은 반대쪽 화면 밖으로 */
const Slide: React.FC<{ enter?: Dir; exit?: Dir; duration: number; children: React.ReactNode }> = ({ enter, exit, duration, children }) => {
  const f = useCurrentFrame();
  const p = (a: number, b: number) => interpolate(f, [a, b], [0, 1], { easing: SLIDE_EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const off = (dir: Dir | undefined, amt: number) => (dir === 'up' ? [0, amt * H] : dir === 'left' ? [amt * W, 0] : [0, 0]);
  const [ix, iy] = off(enter, enter ? 1 - p(0, SLIDE) : 0);
  const [ox, oy] = off(exit, exit ? -p(duration - SLIDE, duration) : 0);
  return <AbsoluteFill style={{ transform: `translate(${ix + ox}px, ${iy + oy}px)` }}>{children}</AbsoluteFill>;
};

const RESET = `* { box-sizing: border-box; margin: 0; padding: 0; } p, span { word-break: keep-all; }`;

export const Video: React.FC = () => (
  <AbsoluteFill style={{ background: C.white, fontFamily: FONT, color: C.ink, fontFeatureSettings: '"tnum" 0' }}>
    <style>{RESET}</style>
    {SCENES.map(({ id, duration, Component, enter }, i) => {
      const exit = SCENES[i + 1]?.enter;
      return (
        <Sequence key={id} from={STARTS[i]} durationInFrames={duration} name={id}>
          <Slide enter={enter} exit={exit} duration={duration}>
            <SceneExit.Provider value={exit ? 'none' : 'fade'}>
              <Component />
            </SceneExit.Provider>
          </Slide>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
