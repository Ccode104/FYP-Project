import { apiFetch } from './api';

export interface QuizAccess {
  id: number;
  title: string;
  start_at: string;
  end_at: string;
  max_score: number;
  is_proctored: boolean;
  has_view_access: boolean;
  has_edit_access: boolean;
  has_create_access: boolean;
}

export interface QuizPermission {
  id: number;
  quiz_id: number;
  ta_id: number;
  can_view: boolean;
  can_edit: boolean;
  can_create: boolean;
  granted_by: number;
  granted_at: string;
}

export interface AccessRequest {
  id: number;
  quiz_id: number;
  ta_id: number;
  teacher_id: number;
  request_type: 'view' | 'edit' | 'create';
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  responded_at?: string;
  response_message?: string;
  quiz_title: string;
  ta_name: string;
  ta_email: string;
  course_code: string;
  course_title: string;
}

export interface QuizWithPermissions {
  id: number;
  title: string;
  start_at: string;
  end_at: string;
  max_score: number;
  is_proctored: boolean;
  can_view: boolean;
  can_edit: boolean;
  can_create: boolean;
  course_code: string;
  course_title: string;
  granted_at: string;
}

export interface QuizQuestion {
  id?: number;
  question_text: string;
  question_type: string;
  metadata: Record<string, unknown>;
}

export interface QuizDetails {
  quiz: {
    id: number;
    title: string;
    start_at: string;
    end_at: string;
    max_score: number;
    is_proctored: boolean;
    time_limit: number;
    course_code: string;
    course_title: string;
  };
  questions: QuizQuestion[];
  permissions: {
    can_view: boolean;
    can_edit: boolean;
    can_create: boolean;
  };
}

// Get quizzes for a course offering
export const getCourseQuizzes = async (courseOfferingId: number): Promise<{ quizzes: QuizAccess[] }> => {
  return apiFetch(`/quiz-permissions/course/${courseOfferingId}`);
};

// Request access to a quiz
export const requestQuizAccess = async (
  quizId: number,
  requestType: 'view' | 'edit' | 'create',
  message?: string
): Promise<{ message: string; requestId: number }> => {
  return apiFetch(`/quiz-permissions/request/${quizId}`, {
    method: 'POST',
    body: { requestType, message }
  });
};

// Get pending requests for teacher
export const getPendingRequests = async (): Promise<{ requests: AccessRequest[] }> => {
  return apiFetch('/quiz-permissions/requests/pending');
};

// Respond to access request
export const respondToRequest = async (
  requestId: number,
  action: 'approve' | 'reject',
  message?: string
): Promise<{ message: string; quizTitle: string }> => {
  return apiFetch(`/quiz-permissions/requests/${requestId}/respond`, {
    method: 'POST',
    body: { action, message }
  });
};

// Get quizzes TA has access to
export const getMyQuizAccess = async (): Promise<{ quizzes: QuizWithPermissions[] }> => {
  return apiFetch('/quiz-permissions/my-access');
};

// Get quiz details for editing
export const getQuizDetails = async (quizId: number): Promise<QuizDetails> => {
  return apiFetch(`/quiz-permissions/${quizId}/details`);
};

// Update quiz
export const updateQuiz = async (
  quizId: number,
  quizData: {
    title: string;
    start_at: string;
    end_at: string;
    max_score: number;
    time_limit: number;
    is_proctored: boolean;
    questions?: QuizQuestion[];
  }
): Promise<{ message: string }> => {
  return apiFetch(`/quiz-permissions/${quizId}`, {
    method: 'PUT',
    body: quizData
  });
};