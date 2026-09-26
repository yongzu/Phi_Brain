// 7 · 핵심 HMW(위) + 해법 후보 네 갈래 → A~C와 HMW가 빠지고 D(검정 #000 박스 · 흰 글씨)만 가운데로
//     → D 박스가 커지며 화면 전체를 덮고, 그동안 D1 · D2가 가로 한 줄로 서며 윗줄이 사라진다. 8번이 이 화면에서 그대로 이어지고, 그 뒤 로고 인트로(같은 검정).
import React from 'react';
import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion';
import { Reveal, Scene, Tag } from '../motion';
import { mix, ramp } from '../phi';
import { C, H, W, sec } from '../theme';

export const S07_DURATION = sec(8.3);

const GROUPS = [
  { key: 'A', name: '수업 루틴', items: ['주간 회고 시간에 지난주 Findings를 다시 읽는다', '세션을 시작할 때 지난 Finding 하나를 공유한다'] },
  { key: 'B', name: '디스코드 안에서', items: ['과목 태그를 붙이는 작성 규칙을 정한다', '봇이 지난주 Findings를 다시 보내 준다'] },
  { key: 'C', name: '기존 앱 활용', items: ['노션·옵시디언에 과목별 저널 템플릿을 만든다', '외부 앱의 기록을 디스코드로 옮기는 과정을 자동화한다'] },
  { key: 'D', name: '새 도구 (Phi Brain)', items: ['쓰는 곳에서 과목별로 저절로 모이게 한다', '중요 인사이트를 과목별로 모아서 적용 가능하게 한다'] }, // D2: 사용자 지시로 영상에서만 바꾼 문구
];
type Group = (typeof GROUPS)[number];

// 카드 안 배치(카드 기준 px) — D를 조각으로 옮기려고 높이를 고정
const CARD_W = 380;
const GAP = 28;
const PAD = 26;
const TAG_SLOT = 40; // 흰 박스 라벨 높이(22px 글씨) — D는 박스 없는 라벨을 이 칸 가운데에
const ITEMS_Y = PAD + TAG_SLOT + 16;
const ITEM_W = CARD_W - PAD * 2;
const ITEM_H = 100;
const CARD_H = ITEMS_Y + ITEM_H * 2 + 10;
const ROW_W = CARD_W * 4 + GAP * 3;
const LEFT = (W - ROW_W) / 2;

// 화면 세로 배치: HMW 박스 + 후보 라벨 + 카드 한 줄을 통째로 가운데에
const HMW_H = 290;
const LABEL_H = 31;
const GROUP_H = HMW_H + 64 + LABEL_H + 30 + CARD_H;
const HMW_Y = Math.round((H - GROUP_H) / 2);
const LABEL_Y = HMW_Y + HMW_H + 64;
const CARDS_Y = LABEL_Y + LABEL_H + 30;

// D 화면(커진 뒤): 라벨 한 줄 + D1 · D2 한 줄. 8번에서 표 · 선택이 아래에 붙으면 위로 올라간다(lift)
const BIG = 1.9; // 카드 글씨 22px → 약 42px
const BIG_GAP = 72;
export const D_ROW_W = ITEM_W * BIG * 2 + BIG_GAP;
export const D_ROW_X = (W - D_ROW_W) / 2;
const D_TAG_H = Math.round(22 * 1.2 * BIG);
export const D_GROUP_H = D_TAG_H + 40 + ITEM_H * BIG;
const D_TOP_CENTER = (H - D_GROUP_H) / 2;
export const D_TOP_LIFT = 178; // 8번의 표 · 선택까지 합친 덩어리가 세로 가운데에 오는 위치
const D_SCALE = 1.12; // 가운데로 오면서 살짝 커짐

/** rule = 윗줄 불투명도(D가 커지는 동안 1 → 0) */
const Item: React.FC<{ g: Group; k: number; dark: boolean; rule?: number }> = ({ g, k, dark, rule = 1 }) => (
  <div style={{ position: 'relative', width: ITEM_W, height: ITEM_H, display: 'grid', gridTemplateColumns: '44px 1fr', gap: 12, padding: '18px 0 16px' }}>
    <span style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: dark ? C.onInk3 : C.rule, opacity: rule }} />
    <span style={{ height: 30, borderRadius: 10, background: dark ? C.onInk3 : C.soft, color: dark ? C.white : C.ink, fontSize: 17, fontWeight: 700, lineHeight: '30px', textAlign: 'center' }}>{g.key}{k + 1}</span>
    <p style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.45, letterSpacing: '-0.02em', color: dark ? C.white : C.ink }}>{g.items[k]}</p>
  </div>
);

/** A~C: 흰 카드 + 테두리 */
const LightCard: React.FC<{ g: Group }> = ({ g }) => (
  <div style={{ position: 'relative', width: CARD_W, height: CARD_H, borderRadius: 24, background: C.white, boxShadow: `inset 0 0 0 2px ${C.rule}` }}>
    <div style={{ position: 'absolute', left: PAD, top: PAD }}><Tag variant="soft" size={22}>{g.key} · {g.name}</Tag></div>
    {g.items.map((_, k) => <div key={k} style={{ position: 'absolute', left: PAD, top: ITEMS_Y + k * ITEM_H }}><Item g={g} k={k} dark={false} /></div>)}
  </div>
);

/** D: 잉크 박스 + 흰 글씨. slide = 가운데로, grow = 박스가 화면을 덮으며 D1 · D2가 한 줄로, lift = 8번에서 위로.
 *  박스 · 라벨 · 항목을 따로 그려 각자 제자리(카드 안)에서 커진 화면의 자리로 옮긴다(글 줄바꿈은 그대로, 크기만 바뀜). */
export const DPanel: React.FC<{ slide: number; grow: number; lift: number; box?: boolean }> = ({ slide, grow, lift, box = true }) => {
  const g = GROUPS[3];
  const cx = mix(LEFT + 3 * (CARD_W + GAP) + CARD_W / 2, W / 2, slide);
  const top = mix(CARDS_Y, (H - CARD_H * D_SCALE) / 2, slide);
  const sc = mix(1, D_SCALE, slide);
  const X = (lx: number) => cx + (lx - CARD_W / 2) * sc;
  const Y = (ly: number) => top + ly * sc;
  const gTop = mix(D_TOP_CENTER, D_TOP_LIFT, lift);
  const piece = (lx: number, ly: number, fx: number, fy: number): React.CSSProperties => ({
    position: 'absolute', left: 0, top: 0, transformOrigin: '0 0',
    transform: `translate(${mix(X(lx), fx, grow)}px, ${mix(Y(ly), fy, grow)}px) scale(${mix(sc, BIG, grow)})`,
  });
  return (
    <>
      {box && (
        <div style={{
          position: 'absolute', left: mix(X(0), 0, grow), top: mix(Y(0), 0, grow),
          width: mix(CARD_W * sc, W, grow), height: mix(CARD_H * sc, H, grow), borderRadius: mix(24 * sc, 0, grow), background: C.black,
        }} />
      )}
      <div style={piece(PAD, PAD + 7, D_ROW_X, gTop)}><Tag size={22} style={{ color: C.white }}>{g.key} · {g.name}</Tag></div>
      {g.items.map((_, k) => (
        <div key={k} style={piece(PAD, ITEMS_Y + k * ITEM_H, D_ROW_X + k * (ITEM_W * BIG + BIG_GAP), gTop + D_TAG_H + 40)}>
          <Item g={g} k={k} dark rule={1 - grow} />
        </div>
      ))}
    </>
  );
};

const LEAVE = sec(4.9); // HMW · A~C가 빠지기 시작
const GROW_AT = sec(6.3);
const GROW_EASE = Easing.bezier(0.65, 0, 0.35, 1);

export const S07Ideas: React.FC = () => {
  const f = useCurrentFrame();
  const out = ramp(f, LEAVE, LEAVE + sec(0.6));
  const slide = ramp(f, LEAVE + sec(0.3), LEAVE + sec(1.2));
  const grow = ramp(f, GROW_AT, GROW_AT + sec(1.1), GROW_EASE);
  const leaving: React.CSSProperties = { position: 'absolute', inset: 0, opacity: 1 - out, filter: `blur(${out * 8}px)` };
  return (
    // 끝은 8번이 같은 화면으로 이어받으므로 흐려지는 퇴장 없음
    <Scene duration={S07_DURATION} exit={0}>
      <AbsoluteFill>
        <div style={leaving}>
          {/* 핵심 HMW */}
          <Reveal at={sec(0.2)} style={{ position: 'absolute', left: LEFT, top: HMW_Y, width: ROW_W }}>
            <div style={{ height: HMW_H, padding: '48px 56px', borderRadius: 36, background: C.soft }}>
              <Reveal at={sec(0.4)}><div style={{ marginBottom: 20 }}><Tag size={30}>핵심 HMW · 문제 1</Tag></div></Reveal>
              <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.035em', color: C.ink }}>
                <Reveal at={sec(0.6)} dur={sec(0.9)} y={28}>어떻게 하면 Phi 학습자가 저널에 쓴 Findings를 다시 꺼내 보고,</Reveal>
                <Reveal at={sec(1.0)} dur={sec(0.9)} y={28}>자신의 디자인에 적용하게 할 수 있을까?</Reveal>
              </div>
            </div>
          </Reveal>
          {/* 해법 후보 A~C */}
          <Reveal at={sec(2.3)} style={{ position: 'absolute', left: LEFT, top: LABEL_Y }}><Tag>해법 후보 · 네 갈래</Tag></Reveal>
          {GROUPS.slice(0, 3).map((g, i) => (
            <Reveal key={g.key} at={sec(2.4 + i * 0.12)} style={{ position: 'absolute', left: LEFT + i * (CARD_W + GAP), top: CARDS_Y }}>
              <LightCard g={g} />
            </Reveal>
          ))}
        </div>
        {/* D — 잉크 박스 */}
        <Reveal at={sec(2.4 + 3 * 0.12)} style={{ position: 'absolute', inset: 0 }}>
          <DPanel slide={slide} grow={grow} lift={0} />
        </Reveal>
      </AbsoluteFill>
    </Scene>
  );
};
