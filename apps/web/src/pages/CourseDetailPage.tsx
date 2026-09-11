import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { FUTURE_ITEM_STATUSES, FUTURE_ITEM_STATUS_LABELS } from '../constants';
import type { Course, CourseArchive } from '../types';

interface Props {
  courseId: string;
  onBack: () => void;
}

type DetailTab = 'overview' | 'journal' | 'findings' | 'futureItems' | 'soon';

export default function CourseDetailPage({ courseId, onBack }: Props) {
  const [course, setCourse] = useState<Course | null>(null);
  const [archive, setArchive] = useState<CourseArchive | null>(null);
  const [tab, setTab] = useState<DetailTab>('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCourses()
      .then((list) => setCourse(list.find((c) => c.id === courseId) ?? null))
      .catch((err) => setError(err.message));
    api.getCourseArchive(courseId).then(setArchive).catch((err) => setError(err.message));
  }, [courseId]);

  async function setStatus(id: string, status: string) {
    await api.updateFutureItem(id, { status });
    const updated = await api.getCourseArchive(courseId);
    setArchive(updated);
  }

  return (
    <div className="page">
      <button onClick={onBack} style={{ marginBottom: 12 }}>
        ← 과목 목록
      </button>
      <h2>{course?.name ?? '과목'}</h2>
      {course?.description && <p className="hint">{course.description}</p>}
      {error && <div className="error-box">{error}</div>}

      <div className="tab-strip">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          Overview
        </button>
        <button className={tab === 'journal' ? 'active' : ''} onClick={() => setTab('journal')}>
          Journal
        </button>
        <button className={tab === 'findings' ? 'active' : ''} onClick={() => setTab('findings')}>
          Findings
        </button>
        <button className={tab === 'futureItems' ? 'active' : ''} onClick={() => setTab('futureItems')}>
          Future Items
        </button>
        <button className={tab === 'soon' ? 'active' : ''} onClick={() => setTab('soon')}>
          Growth / Agent
        </button>
      </div>

      {tab === 'overview' && archive && (
        <div className="hint">
          저널 조각 {archive.fragments.length}개 · Finding {archive.insights.length}개 · Future Item{' '}
          {archive.futureItems.length}개
        </div>
      )}

      {tab === 'journal' &&
        archive?.fragments.map((f) => (
          <div key={f.id} className="timeline-entry">
            <div className="timeline-header">{f.journal.date}</div>
            <div className="fragment-text">{f.rawText}</div>
          </div>
        ))}

      {tab === 'findings' &&
        archive?.insights.map((ins) => (
          <div key={ins.id} className="timeline-entry">
            <div className="timeline-header">{new Date(ins.createdAt).toLocaleDateString()}</div>
            <div className="fragment-text">{ins.content}</div>
          </div>
        ))}

      {tab === 'futureItems' &&
        archive?.futureItems.map((item) => (
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

      {tab === 'soon' && (
        <p className="hint">
          과목별 전문 에이전트(Course Agent)와 성장 추이 분석은 Phase 2에서 제공될 예정입니다.
        </p>
      )}
    </div>
  );
}
