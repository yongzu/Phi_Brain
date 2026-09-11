import type { AnalyzeResult, Course, CourseArchive, FragmentAnalysis, FutureItemRow, JournalRow } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `요청 실패 (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getCourses: () => request<Course[]>('/api/courses'),
  createCourse: (data: { code: string; name: string; description?: string }) =>
    request<Course>('/api/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id: string, data: Partial<Course>) =>
    request<Course>(`/api/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCourse: (id: string) => request<void>(`/api/courses/${id}`, { method: 'DELETE' }),
  getCourseArchive: (id: string) => request<CourseArchive>(`/api/courses/${id}/archive`),

  analyzeJournal: (rawText: string) =>
    request<AnalyzeResult>('/api/journals/analyze', { method: 'POST', body: JSON.stringify({ rawText }) }),
  saveJournal: (date: string, rawText: string, fragments: FragmentAnalysis[]) =>
    request<JournalRow>('/api/journals/save', {
      method: 'POST',
      body: JSON.stringify({ date, rawText, fragments }),
    }),
  getJournalByDate: (date: string) => request<JournalRow | null>(`/api/journals?date=${encodeURIComponent(date)}`),

  updateFragmentCourses: (fragmentId: string, courseIds: string[]) =>
    request(`/api/fragments/${fragmentId}/courses`, { method: 'PATCH', body: JSON.stringify({ courseIds }) }),
  updateFragmentFourF: (fragmentId: string, types: string[]) =>
    request(`/api/fragments/${fragmentId}/four-f`, { method: 'PATCH', body: JSON.stringify({ types }) }),

  getFutureItems: (status?: string) =>
    request<FutureItemRow[]>(`/api/future-items${status ? `?status=${status}` : ''}`),
  updateFutureItem: (id: string, data: { status?: string; dueDate?: string }) =>
    request<FutureItemRow>(`/api/future-items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
