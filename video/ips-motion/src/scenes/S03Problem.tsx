// 3 · 핵심 문제 1 — 페이지 01 핵심 문제의 큰 카드. 라벨 · 제목은 가운데, 제목은 타이핑(중요 문장)
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Reveal, Scene, Tag, Typewriter } from '../motion';
import { C, sec } from '../theme';

export const S03_DURATION = sec(13.5);

const CAUSES = [
  { num: '1-1', title: 'Findings를 다시 보지 않는다', body: 'Findings를 써도 다시 읽지 않아, 깨달은 내용이 체화되지 않고 디자인에 적용되지 못한다.' },
  { num: '1-2', title: '기록의 중심이 외부 앱이다', body: '수업 맥락과 정리 체계는 각자의 외부 앱에 있고, 저널은 이를 다시 옮겨 쓰는 사본이 된다.' },
  { num: '1-3', title: '과목별로 찾을 수 없다', body: '디스코드 저널은 날짜순 수직 구조라, 과목별로 모아 다시 보기 어렵다.' },
];

export const S03Problem: React.FC = () => (
  <Scene duration={S03_DURATION}>
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 140px' }}>
      <Reveal at={0} y={40}>
        <div style={{ padding: '64px 64px 52px', borderRadius: 40, background: C.soft }}>
          {/* head */}
          <div style={{ textAlign: 'center', paddingBottom: 48 }}>
            <Reveal at={sec(0.5)}>
              <div style={{ marginBottom: 18 }}><Tag>가장 중요한 문제 · Findings</Tag></div>
            </Reveal>
            <p style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-0.035em', color: C.ink, lineHeight: 1.2 }}>
              <Typewriter text="저널을 다시 보지 않아 학습 성찰이 일어나지 않는다" at={sec(1.0)} />
            </p>
          </div>
          {/* causes 1-1 · 1-2 · 1-3 — 타이핑(약 2.6초 끝)이 끝난 뒤 2초마다 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 48 }}>
            {CAUSES.map((c, i) => (
              <Reveal key={c.num} at={sec(2.9 + i * 2)} style={{ borderTop: `2px solid ${C.rule}`, paddingTop: 32, paddingBottom: 36 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', columnGap: 18 }}>
                  <span style={{ height: 36, borderRadius: 12, background: C.white, fontSize: 20, fontWeight: 700, lineHeight: '36px', textAlign: 'center', color: C.ink }}>{c.num}</span>
                  <div>
                    <p style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.025em', color: C.ink, lineHeight: 1.35 }}>{c.title}</p>
                    <p style={{ marginTop: 10, fontSize: 25, lineHeight: 1.5, color: C.secondary }}>{c.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          {/* why it matters */}
          <Reveal at={sec(9.5)} style={{ borderTop: `2px solid ${C.rule}`, paddingTop: 36 }}>
            <p style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-0.025em', color: C.secondary, textAlign: 'center' }}>
              Phi에 다니는 가장 중요한 이유인 <strong style={{ color: C.ink, fontWeight: 700 }}>배우고 성장하기</strong>가 실제로 이뤄지지 못한다.
            </p>
          </Reveal>
        </div>
      </Reveal>
    </AbsoluteFill>
  </Scene>
);
