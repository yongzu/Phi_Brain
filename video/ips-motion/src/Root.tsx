import React from 'react';
import { Composition, staticFile } from 'remotion';
import { loadFont } from '@remotion/fonts';
import { FPS, H, W } from './theme';
import { TOTAL, Video } from './Video';
import { INTRO_DURATION, LogoIntro } from './intro/LogoIntro';

// Pretendard (SIL OFL) — 페이지와 같은 글꼴. 렌더 전에 불러오기를 기다린다.
loadFont({ family: 'Pretendard', url: staticFile('fonts/PretendardVariable.woff2'), weight: '45 920' });

export const Root: React.FC = () => (
  <>
    <Composition id="IpsMotion" component={Video} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    {/* 로고 인트로 단독 — 본편(IpsMotion)에도 맨 앞과 8번 뒤에 같은 것이 들어 있다 */}
    <Composition id="LogoIntro" component={LogoIntro} durationInFrames={INTRO_DURATION} fps={FPS} width={W} height={H} />
  </>
);
