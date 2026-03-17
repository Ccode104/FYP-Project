import { API_URL, apiFetch, apiForm } from '../../../services/api';

interface CustomError extends Error {
  response?: { data: unknown };
}

const baseURL = API_URL;

export async function uploadVideo(formData: FormData, onUploadProgress?: (progressEvent: unknown) => void): Promise<unknown> {
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
        let data: unknown = {};
        try {
          data = respText ? JSON.parse(respText) : {};
        } catch {
          data = { error: respText };
        }
        if (status >= 200 && status < 300) {
          resolve(data);
        } else {
          const err = new Error((data as { error?: string }).error || `HTTP ${status}`) as CustomError;
          err.response = { data };
          reject(err);
        }
      };

      xhr.onerror = () => reject(new Error('Network error while uploading video'));
      xhr.send(formData);
    });
  }

  return apiForm('/api/videos', formData);
}

export async function getMyVideos(): Promise<unknown> {
  return apiFetch('/api/videos/my');
}

export async function getVideosByCourseOffering(courseOfferingId: number | string): Promise<unknown> {
  return apiFetch(`/api/videos/course/${courseOfferingId}`);
}

export async function getVideoById(videoId: number): Promise<unknown> {
  return apiFetch(`/api/videos/${videoId}`);
}

export async function deleteVideo(videoId: number): Promise<unknown> {
  return apiFetch(`/api/videos/${videoId}`, { method: 'DELETE' });
}

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
  },
): Promise<unknown> {
  return apiFetch(`/api/videos/${videoId}/quiz-questions`, { method: 'POST', body: questionData });
}

export async function getVideoQuizQuestions(videoId: number): Promise<unknown> {
  return apiFetch(`/api/videos/${videoId}/quiz-questions`);
}

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
  },
): Promise<unknown> {
  return apiFetch(`/api/videos/${videoId}/quiz-questions/${questionId}`, { method: 'PUT', body: questionData });
}

export async function deleteVideoQuizQuestion(videoId: number, questionId: number): Promise<unknown> {
  return apiFetch(`/api/videos/${videoId}/quiz-questions/${questionId}`, { method: 'DELETE' });
}

export async function startVideoQuizAttempt(videoId: number): Promise<unknown> {
  return apiFetch(`/api/videos/${videoId}/quiz/start`, { method: 'POST' });
}

export async function submitVideoQuizAnswer(videoId: number, questionId: number, answer: unknown): Promise<unknown> {
  return apiFetch(`/api/videos/${videoId}/quiz/answer`, {
    method: 'POST',
    body: { question_id: questionId, answer },
  });
}

export async function completeVideoQuizAttempt(videoId: number): Promise<unknown> {
  return apiFetch(`/api/videos/${videoId}/quiz/complete`, { method: 'POST' });
}

export async function getVideoQuizAttempt(videoId: number): Promise<unknown> {
  return apiFetch(`/api/videos/${videoId}/quiz/attempt`);
}

export async function getVideoQuizAttempts(videoId: number): Promise<unknown> {
  return apiFetch(`/api/videos/${videoId}/quiz/attempts`);
}

