// 실제 Phi Brain 데이터와 앱 CSS — data/ 폴더(npm run pull로 새로 받는다). 저장소에 함께 둔다(실제 저널 허용 — 사용자 결정 2026-09-27),
// 그래서 wrangler 로그인 없이도 어느 PC에서나 본편을 렌더할 수 있다.
import REAL from '../../data/real.json';
import APP from '../../data/app.json';

export type Journal = { date: string; title: string; courses: string; html: string; saved_at: number };
export type FutureItem = {
  id: string; text: string; html?: string; scope: string; courseId: string | null; customId: string | null;
  done: boolean; doneAt: number | null; dueAt: string | null; createdAt: number; placedAt: number;
};
export type FutureState = { items: FutureItem[]; favorites: string[]; customBoxes: { id: string; name: string }[]; boxOrder: string[] };
export type Target = { id: number; course_id: string; kind: 'assignment' | 'self_feedback'; manual: string | null; evidence: number; first_at: string | null };
export type Note = { course_id: string; week_no: number; raw: string; due_at: string | null; late_due_at: string | null };

export const real = REAL as unknown as {
  pulledAt: string;
  journals: Journal[];
  findingsFavorites: string[];
  findingsHidden: string[];
  future: FutureState;
  courses: { id: string; name: string; code: string }[];
  week: number;
  targets: Target[];
  notes: Note[];
  gmail: { connected: number; email: string; last_sync_at: string } | null;
  nickname: string;
};

export const app = APP as { css: string; logo: string; wordmark: string; cursors: { arrow: string; pointer: string; text: string } };

// 영상 속 "오늘" — 데이터를 가져온 날(2026-09-27)로 고정해 프레임마다 결과가 같게
export const TODAY = new Date(2026, 8, 27, 15, 0).getTime();
