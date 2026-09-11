import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { FUTURE_ITEM_STATUSES, FUTURE_ITEM_STATUS_LABELS } from '../constants';
import type { FutureItemRow } from '../types';

export default function FutureItemsPage() {
  const [items, setItems] = useState<FutureItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.getFutureItems().then(setItems).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function setStatus(id: string, status: string) {
    await api.updateFutureItem(id, { status });
    load();
  }

  const byCourse = new Map<string, FutureItemRow[]>();
  for (const item of items) {
    const key = item.course?.name ?? '기타';
    byCourse.set(key, [...(byCourse.get(key) ?? []), item]);
  }

  return (
    <div className="page">
      <h2>Future Items</h2>
      <p className="hint">과목을 가로질러 아직 행동으로 옮기지 못한 액션 아이템을 한눈에 봅니다.</p>
      {error && <div className="error-box">{error}</div>}

      {[...byCourse.entries()].map(([courseName, courseItems]) => (
        <div key={courseName}>
          <div className="course-group-heading">{courseName}</div>
          {courseItems.map((item) => (
            <div key={item.id} className={`future-item-row${item.status === 'applied' ? ' applied' : ''}`}>
              <div className="content">{item.content}</div>
              <select value={item.status} onChange={(e) => setStatus(item.id, e.target.value)}>
                {FUTURE_ITEM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {FUTURE_ITEM_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ))}

      {items.length === 0 && <p className="hint">아직 Future Item이 없습니다.</p>}
    </div>
  );
}
