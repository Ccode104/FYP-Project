import { API_URL, apiFetch, apiForm } from './api';

// API base URL
const baseURL = API_URL;

// Video upload with progress tracking
export async function uploadVideo(
  formData: FormData,
  onUploadProgress?: (progressEvent: any) => void
): Promise<any> {
  // If caller wants progress updates, use XMLHttpRequest since fetch() doesn't provide upload progress.
  if (onUploadProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const token = localStorage.getItem('auth:token') || '';
      xhr.open('POST', `${baseURL}/api/videos`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.total) {
          const percentCompleted = Math.round((event.loaded * 100) / event.total);
          onUploadProgress({ percentCompleted, progressEvent: event });
        }
      };

      xhr.onload = () => {
        const status = xhr.status;
        const respText = xhr.responseText;
        let data: any = {};
        try {
          data = respText ? JSON.parse(respText) : {};
        } catch (e) {
          data = { error: respText };
        }
        if (status >= 200 && status < 300) {
          resolve(data);
        } else {
          const err: any = new Error(data.error || `HTTP ${status}`);
          err.response = { data };
          reject(err);
        }
      };

      xhr.onerror = () => reject(new Error('Network error while uploading video'));
      xhr.send(formData);
    });
  }

  // Fallback: use apiForm (fetch) without progress
  return apiForm('/api/videos', formData);
}

// Get all videos uploaded by current faculty user
export async function getMyVideos(): Promise<any> {
  return apiFetch('/api/videos/my');
}

// Get all videos for a course offering
export async function getVideosByCourseOffering(courseOfferingId: number | string): Promise<any> {
  return apiFetch(`/api/videos/course/${courseOfferingId}`);
}

// Get a single video by ID
export async function getVideoById(videoId: number): Promise<any> {
  return apiFetch(`/api/videos/${videoId}`);
}

// Delete a video
export async function deleteVideo(videoId: number): Promise<any> {
  return apiFetch(`/api/videos/${videoId}`, { method: 'DELETE' });
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
  return apiFetch(`/api/videos/${videoId}/quiz-questions`, { method: 'POST', body: questionData });
}

// Get all quiz questions for a video
export async function getVideoQuizQuestions(videoId: number): Promise<any> {
  return apiFetch(`/api/videos/${videoId}/quiz-questions`);
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
  return apiFetch(`/api/videos/${videoId}/quiz-questions/${questionId}`, { method: 'PUT', body: questionData });
}

// Delete a quiz question
export async function deleteVideoQuizQuestion(
  videoId: number,
  questionId: number
): Promise<any> {
  return apiFetch(`/api/videos/${videoId}/quiz-questions/${questionId}`, { method: 'DELETE' });
}

// Start or get a video quiz attempt
export async function startVideoQuizAttempt(videoId: number): Promise<any> {
  return apiFetch(`/api/videos/${videoId}/quiz/start`, { method: 'POST' });
}

// Submit an answer to a video quiz question
export async function submitVideoQuizAnswer(
  videoId: number,
  questionId: number,
  answer: any
): Promise<any> {
  return apiFetch(`/api/videos/${videoId}/quiz/answer`, {
    method: 'POST',
    body: { question_id: questionId, answer },
  });
}

// Complete a video quiz attempt
export async function completeVideoQuizAttempt(videoId: number): Promise<any> {
  return apiFetch(`/api/videos/${videoId}/quiz/complete`, { method: 'POST' });
}

// Get video quiz attempt for current student
export async function getVideoQuizAttempt(videoId: number): Promise<any> {
  return apiFetch(`/api/videos/${videoId}/quiz/attempt`);
}

// Get all video quiz attempts for a video (Faculty only)
export async function getVideoQuizAttempts(videoId: number): Promise<any> {
  return apiFetch(`/api/videos/${videoId}/quiz/attempts`);
}

