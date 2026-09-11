import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { F_TYPE_LABELS, F_TYPE_ORDER, type FType } from '../constants';
import type { AnalyzeResult, Course, FragmentAnalysis } from '../types';

function todayStr(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function JournalInputPage() {
  const [date, setDate] = useState(todayStr());
  const [text, setText] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getCourses().then(setCourses).catch((err) => setError(err.message));
  }, []);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const result = await api.analyzeJournal(text);
      setAnalysis(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!analysis) return;
    setLoading(true);
    setError(null);
    try {
      await api.saveJournal(date, text, analysis.fragments);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function updateFragment(index: number, patch: Partial<FragmentAnalysis>) {
    if (!analysis) return;
    const fragments = [...analysis.fragments];
    fragments[index] = { ...fragments[index], ...patch };
    setAnalysis({ ...analysis, fragments });
  }

  function toggleCourse(index: number, courseName: string) {
    const frag = analysis!.fragments[index];
    const has = frag.courses.some((c) => c.name === courseName);
    let nextCourses = has
      ? frag.courses.filter((c) => c.name !== courseName)
      : [...frag.courses, { name: courseName, confidence: 1 }];
    // "기타" is the AI's "couldn't classify" placeholder, not a real course
    // the user wants to keep alongside an actual selection — drop it once
    // a real course is chosen so insight/future-item saving doesn't
    // silently attach to it instead of the intended course.
    if (nextCourses.length > 1) {
      nextCourses = nextCourses.filter((c) => c.name !== '기타');
    }
    updateFragment(index, { courses: nextCourses.length > 0 ? nextCourses : frag.courses });
  }

  function toggleFourF(index: number, type: FType) {
    const frag = analysis!.fragments[index];
    const selected = frag.four_f.map((f) => f.type);
    const nextTypes = toggle(selected, type);
    updateFragment(index, {
      four_f: (nextTypes.length > 0 ? nextTypes : selected).map((t) => ({ type: t, confidence: 1 })),
    });
  }

  return (
    <div className="page">
      <h2>오늘의 저널 붙여넣기</h2>
      <p className="hint">
        기존처럼 4F(Fact/Feeling/Finding/Future Item)가 섞인 통합 텍스트를 그대로 붙여넣으세요. AI가 과목과 4F
        유형을 분석해서 아래에 조각별로 보여줍니다 — 저장 전에 자유롭게 수정할 수 있습니다.
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="field">
        <label>날짜</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="field">
        <label>저널 원문</label>
        <textarea
          rows={16}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setAnalysis(null);
            setSaved(false);
          }}
          placeholder={'오늘 BI 수업에서...\n\n느낀 점은...'}
        />
      </div>

      <div className="actions">
        <button onClick={handleAnalyze} disabled={!text.trim() || loading}>
          {loading && !analysis ? '분석 중...' : '분석하기'}
        </button>
        {analysis && (
          <button className="primary" onClick={handleSave} disabled={loading || saved}>
            {saved ? '저장됨' : loading ? '저장 중...' : '저장'}
          </button>
        )}
      </div>

      {analysis && (
        <div className="analysis-review">
          <p className="hint">{analysis.journal_summary}</p>
          {analysis.fragments.map((frag, i) => (
            <div key={i} className="fragment-card">
              <div className="fragment-text">{frag.text}</div>
              <div className="fragment-controls">
                <div className="fragment-controls-group">
                  <label>과목</label>
                  <div className="chip-row">
                    {courses.map((c) => {
                      const match = frag.courses.find((fc) => fc.name === c.name);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`chip${match ? ' selected' : ''}`}
                          onClick={() => toggleCourse(i, c.name)}
                        >
                          {c.name}
                          {match && <span className="confidence">{Math.round(match.confidence * 100)}%</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="fragment-controls-group">
                  <label>4F</label>
                  <div className="chip-row">
                    {F_TYPE_ORDER.map((t) => {
                      const match = frag.four_f.find((f) => f.type === t);
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`chip${match ? ' selected' : ''}`}
                          onClick={() => toggleFourF(i, t)}
                        >
                          {F_TYPE_LABELS[t]}
                          {match && <span className="confidence">{Math.round(match.confidence * 100)}%</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {frag.insight && <div className="extracted-note">💡 Insight: {frag.insight}</div>}
              {frag.future_item && <div className="extracted-note">✅ Future Item: {frag.future_item}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
