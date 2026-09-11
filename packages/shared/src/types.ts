export type FType = 'fact' | 'feeling' | 'finding' | 'future';

export const F_TYPE_ORDER: FType[] = ['fact', 'feeling', 'finding', 'future'];

export const F_TYPE_LABELS: Record<FType, string> = {
  fact: 'Fact (사실)',
  feeling: 'Feeling (느낌)',
  finding: 'Finding (통찰)',
  future: 'Future Item (액션아이템)',
};

export type FutureItemStatus =
  | 'created'
  | 'scheduled'
  | 'in_progress'
  | 'applied'
  | 'skipped'
  | 'expired'
  | 'needs_review';

export const FUTURE_ITEM_STATUSES: FutureItemStatus[] = [
  'created',
  'scheduled',
  'in_progress',
  'applied',
  'skipped',
  'expired',
  'needs_review',
];

export const FUTURE_ITEM_STATUS_LABELS: Record<FutureItemStatus, string> = {
  created: '생성됨',
  scheduled: '예정됨',
  in_progress: '진행 중',
  applied: '적용됨',
  skipped: '건너뜀',
  expired: '기한 만료',
  needs_review: '검토 필요',
};

export const GENERAL_COURSE_CODE = 'general';

export interface DefaultCourse {
  code: string;
  name: string;
  description: string;
}

// phi.design/programs 1학기 주요 수업 기준 (PROJECT_CONTEXT.md §2)
export const DEFAULT_COURSES: DefaultCourse[] = [
  { code: GENERAL_COURSE_CODE, name: '공통 / 미분류', description: '특정 과목에 속하지 않는 일반 기록' },
  { code: 'IPS', name: 'Iterative Problem Solving', description: '' },
  { code: 'BI', name: 'Beautiful Interface', description: '' },
  { code: 'VT', name: 'Visual Translation', description: '' },
  { code: 'IAE', name: 'Interviewing as Exploration', description: '' },
  { code: 'AOR', name: 'Art of Reading', description: '' },
  { code: 'EAI', name: 'Engaging with AI', description: '' },
  { code: 'AL', name: 'Aesthetic Literacy', description: '' },
  { code: 'TF', name: 'Typography as Foundation', description: '' },
  { code: 'SI', name: 'Self Introduction', description: '' },
  { code: 'WI', name: 'What If', description: '' },
  { code: 'PC', name: 'Peer Coaching', description: '' },
  { code: 'RW', name: 'Readable Writing', description: '' },
];
