import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Course, CourseArchive } from '../types';

interface Props {
  onOpenCourse: (courseId: string) => void;
}

export default function CoursesPage({ onOpenCourse }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [archives, setArchives] = useState<Record<string, CourseArchive>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCourses()
      .then(async (list) => {
        setCourses(list);
        const entries = await Promise.all(
          list.map(async (c) => [c.id, await api.getCourseArchive(c.id)] as const),
        );
        setArchives(Object.fromEntries(entries));
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page">
      <h2>과목별 아카이브</h2>
      <p className="hint">과목을 선택하면 저널 조각, Finding, Future Item을 시간순으로 볼 수 있습니다.</p>
      {error && <div className="error-box">{error}</div>}

      <div className="course-grid">
        {courses
          .filter((c) => !c.archived)
          .map((c) => {
            const archive = archives[c.id];
            const unresolvedFutureItems = archive?.futureItems.filter(
              (f) => !['applied', 'skipped', 'expired'].includes(f.status),
            ).length;
            const latestFinding = archive?.insights[0];
            return (
              <div key={c.id} className="course-card" onClick={() => onOpenCourse(c.id)}>
                <h4>{c.name}</h4>
                <div className="meta">
                  조각 {archive?.fragments.length ?? 0}개
                  <br />
                  미해결 Future Item {unresolvedFutureItems ?? 0}개
                  {latestFinding && (
                    <>
                      <br />
                      최근 Finding: {latestFinding.content.slice(0, 40)}
                      {latestFinding.content.length > 40 ? '…' : ''}
                    </>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
