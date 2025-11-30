import { apiFetch, apiForm } from './api';

// Video upload
export async function uploadVideo(formData: FormData): Promise<any> {
  return apiForm('/videos', formData);
}

// Get all videos uploaded by current faculty user
export async function getMyVideos(): Promise<any> {
  return apiFetch('/videos/my');
}

// Get all videos for a course offering
export async function getVideosByCourseOffering(courseOfferingId: number | string): Promise<any> {
  return apiFetch(`/videos/course/${courseOfferingId}`);
}

// Get a single video by ID
export async function getVideoById(videoId: number): Promise<any> {
  return apiFetch(`/videos/${videoId}`);
}

// Delete a video
export async function deleteVideo(videoId: number): Promise<any> {
  return apiFetch(`/videos/${videoId}`, { method: 'DELETE' });
}

// Add a quiz question to a video
export async function addVideoQuizQuestion(
  videoId: number,
  questionData: {
    question_text: string;
    question_type?: string;
    options?: string[];
    correct_answer: string;
    points?: number;
    explanation?: string;
    timestamp?: number | null;
  }
): Promise<any> {
  return apiFetch(`/videos/${videoId}/quiz-questions`, { method: 'POST', body: questionData });
}

// Get all quiz questions for a video
export async function getVideoQuizQuestions(videoId: number): Promise<any> {
  return apiFetch(`/videos/${videoId}/quiz-questions`);
}

// Update a quiz question
export async function updateVideoQuizQuestion(
  videoId: number,
  questionId: number,
  questionData: {
    question_text?: string;
    question_type?: string;
    options?: string[];
    correct_answer?: string;
    points?: number;
    explanation?: string;
  }
): Promise<any> {
  return apiFetch(`/videos/${videoId}/quiz-questions/${questionId}`, { method: 'PUT', body: questionData });
}

// Delete a quiz question
export async function deleteVideoQuizQuestion(
  videoId: number,
  questionId: number
): Promise<any> {
  return apiFetch(`/videos/${videoId}/quiz-questions/${questionId}`, { method: 'DELETE' });
}

// Start or get a video quiz attempt
export async function startVideoQuizAttempt(videoId: number): Promise<any> {
  return apiFetch(`/videos/${videoId}/quiz/start`, { method: 'POST' });
}

// Submit an answer to a video quiz question
export async function submitVideoQuizAnswer(
  videoId: number,
  questionId: number,
  answer: any
): Promise<any> {
  return apiFetch(`/videos/${videoId}/quiz/answer`, {
    method: 'POST',
    body: { question_id: questionId, answer },
  });
}

// Complete a video quiz attempt
export async function completeVideoQuizAttempt(videoId: number): Promise<any> {
  return apiFetch(`/videos/${videoId}/quiz/complete`, { method: 'POST' });
}

// Get video quiz attempt for current student
export async function getVideoQuizAttempt(videoId: number): Promise<any> {
  return apiFetch(`/videos/${videoId}/quiz/attempt`);
}

// Get all video quiz attempts for a video (Faculty only)
export async function getVideoQuizAttempts(videoId: number): Promise<any> {
  return apiFetch(`/videos/${videoId}/quiz/attempts`);
}