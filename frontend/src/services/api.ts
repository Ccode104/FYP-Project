// Use VITE_API_BASE_URL for Vite, fallback to localhost for development.
// Accept either a bare origin like https://api.example.com or one that already ends in /api.
const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
export const API_URL = rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '');
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: { method?: HttpMethod; body?: unknown; headers?: Record<string, string> } = {}
): Promise<T> {
  const token = localStorage.getItem('auth:token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(buildApiUrl(path), {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        msg = data.error || msg;
      } catch {
        // If response is not JSON, use status text
        msg = res.statusText || msg;
      }
      throw new Error(msg);
    }

    return res.json();
  } catch (err: unknown) {
    // Handle network errors (Failed to fetch, CORS, etc.)
    if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed'))) {
      throw new Error(
        "Connection lost: We can't reach the learning portal right now. Please check your internet connection or wait a moment while we try to reconnect."
      );
    }
    
    // Fallback for any other mysterious errors
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("An unexpected error occurred. Please refresh the page and try again.");
  }
}

export async function apiForm<T = unknown>(
  path: string,
  form: FormData,
  method: HttpMethod = 'POST'
): Promise<T> {
  try {
    const token = localStorage.getItem('auth:token') || '';
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(buildApiUrl(path), { method, headers, body: form });
    
    if (!res.ok) {
      let msg = `Server error (${res.status})`;
      try {
        const data = await res.json();
        msg = data.error || msg;
      } catch {
        msg = res.statusText || msg;
      }
      throw new Error(msg);
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed'))) {
      throw new Error(
        "Upload failed: We can't reach the server. Please check your connection and try again."
      );
    }
    throw err;
  }
}
