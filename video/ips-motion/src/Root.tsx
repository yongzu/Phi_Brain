import React from 'react';
import { Composition, staticFile } from 'remotion';
import { loadFont } from '@remotion/fonts';
import { FPS, H, W } from './theme';
import { TOTAL, Video } from './Video';

// Pretendard (SIL OFL) — 페이지와 같은 글꼴. 렌더 전에 불러오기를 기다린다.
loadFont({ family: 'Pretendard', url: staticFile('fonts/PretendardVariable.woff2'), weight: '45 920' });

export const Root: React.FC = () => (
  <Composition id="IpsMotion" component={Video} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
