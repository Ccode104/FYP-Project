import { apiFetch } from '../../../services/api';

export async function deleteAssignmentApi(id: number) {
  return apiFetch(`/api/assignments/${id}`, { method: 'DELETE' });
}

export interface QuizAssignmentRequest {
  course_offering_id: number;
  title: string;
  description?: string;
  start_at: string | null;
  end_at: string | null;
  max_score: number;
  is_proctored?: boolean;
  time_limit?: number | null;
  questions: {
    question_text: string;
    question_type: 'mcq' | 'short' | 'true_false';
    metadata: {
      choices?: string[];
      correct_answer?: string | number;
    };
  }[];
}

export async function createQuizAssignment(data: QuizAssignmentRequest) {
  return apiFetch('/api/quizzes', {
    method: 'POST',
    body: data,
  });
}

export async function getPlagiarismChecks(assignmentId: number) {
  return apiFetch<{ checks: unknown[] }>(`/api/assignments/${assignmentId}/plagiarism-checks`);
}

export async function runPlagiarismCheck(assignmentId: number) {
  return apiFetch(`/api/assignments/${assignmentId}/run-plagiarism-check`, {
    method: 'POST',
  });
}

export async function getPlagiarismMatches(assignmentId: number, checkId: number) {
  return apiFetch<{ matches: unknown[] }>(`/api/assignments/${assignmentId}/plagiarism-matches/${checkId}`);
}

