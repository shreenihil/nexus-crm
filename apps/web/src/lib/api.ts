const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ApiFetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T = any>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { params, headers, ...rest } = options;
  
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Retrieve session token from localStorage if present in client environment
  let token = 'demo-session-token';
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('nexus-token');
    if (stored) token = stored;
  }

  const method = (rest.method || 'GET').toUpperCase();
  const body = rest.body || (['POST', 'PUT', 'PATCH'].includes(method) ? '{}' : undefined);

  const res = await fetch(url, {
    ...rest,
    method,
    body,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...headers,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    throw new Error(data?.error || `API request failed with status ${res.status}`);
  }

  return data as T;
}
