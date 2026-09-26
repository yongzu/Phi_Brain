// 장면을 순서대로 잇는다. 장면 길이는 각 장면 파일의 *_DURATION.
import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { C, FONT } from './theme';
import { S01Question, S01_DURATION } from './scenes/S01Question';
import { S02Effects, S02_DURATION } from './scenes/S02Effects';
import { S03Problem, S03_DURATION } from './scenes/S03Problem';
import { S04Whys, S04_DURATION } from './scenes/S04Whys';
import { S05RootCause, S05_DURATION } from './scenes/S05RootCause';
import { S06Hmw, S06_DURATION } from './scenes/S06Hmw';
import { S07Ideas, S07_DURATION } from './scenes/S07Ideas';
import { S08Choose, S08_DURATION } from './scenes/S08Choose';

export const SCENES: { id: string; duration: number; Component: React.FC }[] = [
  { id: '01-question', duration: S01_DURATION, Component: S01Question },
  { id: '02-effects', duration: S02_DURATION, Component: S02Effects },
  { id: '03-problem', duration: S03_DURATION, Component: S03Problem },
  { id: '04-whys', duration: S04_DURATION, Component: S04Whys },
  { id: '05-root-cause', duration: S05_DURATION, Component: S05RootCause },
  { id: '06-hmw', duration: S06_DURATION, Component: S06Hmw },
  { id: '07-ideas', duration: S07_DURATION, Component: S07Ideas },
  { id: '08-choose', duration: S08_DURATION, Component: S08Choose },
];
export const TOTAL = SCENES.reduce((n, s) => n + s.duration, 0);

const RESET = `* { box-sizing: border-box; margin: 0; padding: 0; } p, span { word-break: keep-all; }`;

export const Video: React.FC = () => (
  <AbsoluteFill style={{ background: C.white, fontFamily: FONT, color: C.ink, fontFeatureSettings: '"tnum" 0' }}>
    <style>{RESET}</style>
    <Series>
      {SCENES.map(({ id, duration, Component }) => (
        <Series.Sequence key={id} durationInFrames={duration} name={id}>
          <Component />
        </Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);
