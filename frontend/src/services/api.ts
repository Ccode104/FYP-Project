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
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(
        `Failed to fetch: Cannot connect to ${buildApiUrl(path)}. Please check if the backend server is running.`
      );
    }
    // Re-throw other errors
    throw err;
  }
}

export async function apiForm<T = unknown>(
  path: string,
  form: FormData,
  method: HttpMethod = 'POST'
): Promise<T> {
  const token = localStorage.getItem('auth:token') || '';
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(buildApiUrl(path), { method, headers, body: form });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {
      // Ignore JSON parsing errors
    }
    throw new Error(msg);
  }
  return res.json();
}
