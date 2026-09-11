import { useState } from 'react';
import JournalInputPage from './pages/JournalInputPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import FutureItemsPage from './pages/FutureItemsPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

type Tab = 'journal' | 'courses' | 'courseDetail' | 'futureItems' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('journal');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  function openCourse(courseId: string) {
    setSelectedCourseId(courseId);
    setTab('courseDetail');
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Phi Brain</h1>
        <nav className="tabs">
          <button className={tab === 'journal' ? 'active' : ''} onClick={() => setTab('journal')}>
            오늘 작성
          </button>
          <button
            className={tab === 'courses' || tab === 'courseDetail' ? 'active' : ''}
            onClick={() => setTab('courses')}
          >
            과목
          </button>
          <button className={tab === 'futureItems' ? 'active' : ''} onClick={() => setTab('futureItems')}>
            Future Items
          </button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
            설정
          </button>
        </nav>
      </header>

      <main className="app-main">
        {tab === 'journal' && <JournalInputPage />}
        {tab === 'courses' && <CoursesPage onOpenCourse={openCourse} />}
        {tab === 'courseDetail' && selectedCourseId && (
          <CourseDetailPage courseId={selectedCourseId} onBack={() => setTab('courses')} />
        )}
        {tab === 'futureItems' && <FutureItemsPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
