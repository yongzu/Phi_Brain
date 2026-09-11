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
