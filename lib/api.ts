const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface FetchOpts extends RequestInit {
  token?: string;
}

async function api<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (opts.token) {
    headers['Authorization'] = `Bearer ${opts.token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const auth = {
  register: (email: string, password: string) =>
    api<{ token: string; user: { id: string; email: string; plan: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    api<{ token: string; user: { id: string; email: string; plan: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

export const nodes = {
  list: (token: string) =>
    api<{ nodes: any[] }>('/nodes', { token }),
  unclaimed: (token: string) =>
    api<{ nodes: any[] }>('/nodes/unclaimed', { token }),
  claim: (token: string, id: string) =>
    api<{ message: string }>(`/nodes/${id}/claim`, { method: 'POST', token }),
  get: (token: string, id: string) =>
    api<{ node: any; discovery?: any; metrics?: any }>(`/nodes/${id}`, { token }),
  getMetrics: (token: string, id: string, duration = '1h') =>
    api<{ metrics: any[] }>(`/nodes/${id}/metrics?duration=${duration}`, { token }),
  update: (token: string, id: string, data: any) =>
    api<{ message: string }>(`/nodes/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  remove: (token: string, id: string) =>
    api<{ message: string }>(`/nodes/${id}`, { method: 'DELETE', token }),
};
