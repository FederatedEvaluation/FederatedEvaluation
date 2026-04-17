import { D3emRequest, D3emResponse } from '../d3em/types';
const API_BASE = (process.env.REACT_APP_D3EM_API_BASE || 'http://127.0.0.1:8010').replace(/\/$/, '');

export const runD3em = async (payload: D3emRequest): Promise<D3emResponse> => {
  const res = await fetch(`${API_BASE}/api/d3em/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as { error?: string };
      throw new Error(parsed.error || text || `Request failed with status ${res.status}`);
    } catch {
      throw new Error(text || `Request failed with status ${res.status}`);
    }
  }
  return res.json();
};
