import type { CdsEvaluation, CdsAlert, CdsExplanation, EvaluateCdsInput } from '../types/cds.types';

const BASE = '/api/clinical-decision';

async function request<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (!res.ok) return null;
    if (res.status === 204) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function evaluate(input: EvaluateCdsInput): Promise<CdsEvaluation | null> {
  return request<CdsEvaluation>(`${BASE}/evaluate`, { method: 'POST', body: JSON.stringify(input) });
}

export async function getEvaluation(id: string): Promise<CdsEvaluation | null> {
  return request<CdsEvaluation>(`${BASE}/${id}`);
}

export async function getHistory(patientId: string, limit?: number): Promise<CdsEvaluation[]> {
  const qs = new URLSearchParams({ patientId, ...(limit ? { limit: String(limit) } : {}) });
  return (await request<CdsEvaluation[]>(`${BASE}/history?${qs}`)) ?? [];
}

export async function recalculate(id: string): Promise<CdsEvaluation | null> {
  return request<CdsEvaluation>(`${BASE}/${id}/recalculate`, { method: 'POST' });
}

export async function getExplanation(id: string): Promise<CdsExplanation | null> {
  return request<CdsExplanation>(`${BASE}/${id}/explanation`);
}

export async function getAlerts(patientId: string, unreadOnly?: boolean): Promise<CdsAlert[]> {
  const qs = new URLSearchParams({ patientId, ...(unreadOnly ? { unreadOnly: 'true' } : {}) });
  return (await request<CdsAlert[]>(`${BASE}/alerts?${qs}`)) ?? [];
}

export async function markAlertRead(alertId: string): Promise<void> {
  await request<void>(`${BASE}/alerts/${alertId}/read`, { method: 'POST' });
}

export async function addFeedback(evaluationId: string, rating: number, comment?: string): Promise<void> {
  await request<void>(`${BASE}/${evaluationId}/feedback`, { method: 'POST', body: JSON.stringify({ rating, comment }) });
}
