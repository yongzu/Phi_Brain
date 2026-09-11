import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Course } from '../types';

export default function SettingsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.getCourses().then(setCourses).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function addCourse() {
    if (!newCode.trim() || !newName.trim()) return;
    try {
      await api.createCourse({ code: newCode.trim(), name: newName.trim() });
      setNewCode('');
      setNewName('');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateCourse(id: string, patch: Partial<Course>) {
    try {
      await api.updateCourse(id, patch);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function removeCourse(id: string, code: string) {
    if (code === 'general') return;
    if (!confirm('이 과목을 삭제할까요? 이미 저장된 조각의 과목 연결은 남아있을 수 있습니다.')) return;
    try {
      await api.deleteCourse(id);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="page">
      <h2>과목 관리</h2>
      <p className="hint">
        코드는 AI가 저널을 분석할 때 참고하는 과목명과는 별개로, 내부 식별용입니다. 실제 분류는 과목의 "이름"을
        기준으로 이뤄지니 이름을 정확히 유지하세요.
      </p>
      {error && <div className="error-box">{error}</div>}

      <table className="course-table">
        <thead>
          <tr>
            <th>코드</th>
            <th>이름</th>
            <th>설명</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id}>
              <td>
                <input
                  defaultValue={c.code}
                  disabled={c.code === 'general'}
                  onBlur={(e) => e.target.value !== c.code && updateCourse(c.id, { code: e.target.value })}
                />
              </td>
              <td>
                <input
                  defaultValue={c.name}
                  onBlur={(e) => e.target.value !== c.name && updateCourse(c.id, { name: e.target.value })}
                />
              </td>
              <td>
                <input
                  defaultValue={c.description ?? ''}
                  onBlur={(e) =>
                    e.target.value !== (c.description ?? '') && updateCourse(c.id, { description: e.target.value })
                  }
                />
              </td>
              <td>
                {c.code !== 'general' && (
                  <button className="link-danger" onClick={() => removeCourse(c.id, c.code)}>
                    삭제
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="add-course-row">
        <input placeholder="코드 (예: BI)" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
        <input
          placeholder="이름 (예: Beautiful Interface)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button onClick={addCourse}>과목 추가</button>
      </div>
    </div>
  );
}
