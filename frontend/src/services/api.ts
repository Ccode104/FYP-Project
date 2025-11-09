export const API_URL = (import.meta as any).env?.REACT_APP_API_URL || 'http://localhost:4000' || 'http://13.233.144.115';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function apiFetch<T = any>(path: string, opts: { method?: HttpMethod; body?: any; headers?: Record<string,string> } = {}): Promise<T> {
  const token = localStorage.getItem('auth:token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_URL}${path}`, {
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
  } catch (err: any) {
    // Handle network errors (Failed to fetch, CORS, etc.)
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(`Failed to fetch: Cannot connect to ${API_URL}${path}. Please check if the backend server is running.`);
    }
    // Re-throw other errors
    throw err;
  }
}

export async function apiForm<T = any>(path: string, form: FormData, method: HttpMethod = 'POST'): Promise<T> {
  const token = localStorage.getItem('auth:token') || '';
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: form });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const data = await res.json(); msg = data.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}