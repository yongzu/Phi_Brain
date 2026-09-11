import type { FType, FutureItemStatus } from './constants';

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  agentInstruction: string | null;
  archived: boolean;
  createdAt: string;
}

export interface CourseConfidence {
  name: string;
  confidence: number;
}

export interface FourFConfidence {
  type: FType;
  confidence: number;
}

export interface FragmentAnalysis {
  text: string;
  courses: CourseConfidence[];
  four_f: FourFConfidence[];
  insight: string | null;
  future_item: string | null;
}

export interface AnalyzeResult {
  journal_summary: string;
  fragments: FragmentAnalysis[];
}

export interface FragmentCourseRow {
  id: string;
  courseId: string;
  confidence: number;
  source: 'ai' | 'user';
  userCorrected: boolean;
  course?: Course;
}

export interface FourFRow {
  id: string;
  type: FType;
  confidence: number;
  source: 'ai' | 'user';
}

export interface JournalFragmentRow {
  id: string;
  rawText: string;
  courses: FragmentCourseRow[];
  fourF: FourFRow[];
  insights: { id: string; content: string }[];
  futureItems: FutureItemRow[];
}

export interface JournalRow {
  id: string;
  date: string;
  rawText: string;
  fragments: JournalFragmentRow[];
}

export interface FutureItemRow {
  id: string;
  courseId: string;
  course?: Course;
  content: string;
  status: FutureItemStatus;
  dueDate: string | null;
  appliedAt: string | null;
  createdAt: string;
}

export interface CourseArchive {
  fragments: (JournalFragmentRow & { journal: { id: string; date: string } })[];
  insights: { id: string; content: string; createdAt: string }[];
  futureItems: FutureItemRow[];
}
