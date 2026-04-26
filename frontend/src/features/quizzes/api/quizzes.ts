import { apiFetch } from '../../../services/api';

export interface QuizQuestion {
  id: number;
  question_text: string;
  question_type: 'mcq' | 'short' | 'true_false';
  metadata: {
    choices?: string[];
    correct_answer?: string | number;
  };
}

export interface Quiz {
  id: number;
  course_offering_id: number;
  title: string;
  start_at: string | null;
  end_at: string | null;
  max_score: number;
  course_code?: string;
  course_title?: string;
  questions: QuizQuestion[];
  is_proctored?: boolean;
  time_limit?: number | null; // time limit in minutes
}

export interface QuizAttempt {
  id: number;
  quiz_id: number;
  student_id: number;
  started_at: string;
  finished_at: string;
  score: number | null;
  answers: Record<string, unknown>;
}

export interface QuizResultsSummary {
  quiz: {
    id: number;
    title: string;
    description?: string | null;
    course_offering_id: number;
    course_code?: string;
    course_title?: string;
    max_score: number;
    start_at?: string | null;
    end_at?: string | null;
    is_proctored?: boolean;
    time_limit?: number | null;
    google_form_url?: string | null;
    google_form_id?: string | null;
  };
  summary: {
    total_attempts: number;
    scored_attempts: number;
    average_score: number | null;
    highest_score: number | null;
    lowest_score: number | null;
    pass_rate: number | null;
    violated_attempts: number;
    pending_manual_grading: number;
  };
  attempts: Array<{
    id: string | number;
    student_id: number | null;
    student_name: string;
    student_email: string | null;
    started_at: string | null;
    finished_at: string | null;
    score: number | null;
    grade?: number | null;
    feedback?: string | null;
    graded_at?: string | null;
    violated: boolean;
    suspended_at?: string | null;
    resumed_at?: string | null;
    needs_manual_grading: boolean;
  }>;
}

export async function listCourseQuizzes(offeringId: number): Promise<Partial<Quiz>[]> {
  return apiFetch(`/api/student/courses/${offeringId}/quizzes`);
}

export async function getQuiz(quizId: number): Promise<Quiz> {
  return apiFetch(`/api/quizzes/${quizId}`);
}

export async function submitQuizAttempt(data: {
  quiz_id: number;
  student_id: number;
  answers: Record<number, unknown>;
}): Promise<{
  message: string;
  attempt: QuizAttempt;
  graded_answers: Record<number, unknown>;
  needs_manual_grading: boolean;
}> {
  return apiFetch('/api/quizzes/attempts', {
    method: 'POST',
    body: data,
  });
}

export async function getQuizAttempts(studentId: number, quizId?: number) {
  const params = quizId ? `?quizId=${quizId}` : '';
  return apiFetch(`/api/student/${studentId}/quiz-attempts${params}`);
}

export async function listQuizAttemptsForQuiz(quizId: number) {
  return apiFetch(`/api/quizzes/${quizId}/attempts`);
}

export async function gradeQuizAttempt(attemptId: number, decisions: Record<number, boolean>) {
  return apiFetch(`/api/quizzes/attempts/${attemptId}/grade`, {
    method: 'PATCH',
    body: { decisions },
  });
}


export async function suspendQuizAttempt(attemptId: number, reason: string, suspendedBy: number) {
  return apiFetch(`/api/quizzes/attempts/${attemptId}/suspend`, {
    method: 'POST',
    body: { reason, suspendedBy },
  });
}

export async function resumeQuizAttempt(attemptId: number, resumedBy: number) {
  return apiFetch(`/api/quizzes/attempts/${attemptId}/resume`, {
    method: 'POST',
    body: { resumedBy },
  });
}


export async function getSuspendedAttempts() {
  return apiFetch('/api/quizzes/suspended-attempts');
}


export async function getQuizResultsSummary(quizId: number): Promise<QuizResultsSummary> {
  return apiFetch(`/api/quizzes/${quizId}/results/summary`);
}

export async function getQuizResultsSheet(quizId: number): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  return apiFetch(`/api/sheets/quizzes/${quizId}`);
}

export async function evaluateQuizResults(quizId: number): Promise<{ spreadsheetUrl: string }> {
  return apiFetch(`/api/sheets/quizzes/${quizId}/evaluate`, {
    method: 'POST',
  });
}

export async function deleteQuizAttempt(attemptId: string | number) {
  return apiFetch(`/api/sheets/quizzes/attempts/${attemptId}`, {
    method: 'DELETE',
  });
}

export async function markAttemptAsViolated(attemptId: string | number) {
  return apiFetch(`/api/sheets/quizzes/attempts/${attemptId}/violate`, {
    method: 'POST',
  });
}

// Runtime shims for TS-only exports (kept for compatibility with existing imports)
export const Quiz: unknown = undefined;
export const QuizQuestion: unknown = undefined;
export const QuizAttempt: unknown = undefined;

