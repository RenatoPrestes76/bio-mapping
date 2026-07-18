async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

import type {
  ClinicalOutcome,
  ModelMetrics,
  ModelDriftEvent,
  LearningFeedback,
  ContinuousLearningStatistics,
  CreateOutcomePayload,
  CreateFeedbackPayload,
} from '../types/learning.types';

export async function registerOutcome(payload: CreateOutcomePayload): Promise<ClinicalOutcome> {
  return request<ClinicalOutcome>('/learning/outcomes', { method: 'POST', body: JSON.stringify(payload) });
}

export async function findOutcome(id: string): Promise<ClinicalOutcome> {
  return request<ClinicalOutcome>(`/learning/outcomes/${id}`);
}

export async function getModelPerformance(tenantId?: string): Promise<ModelMetrics[]> {
  const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  return (await request<ModelMetrics[]>(`/learning/model-performance${qs}`)) ?? [];
}

export async function getStatistics(tenantId?: string): Promise<ContinuousLearningStatistics | null> {
  const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  return request<ContinuousLearningStatistics>(`/learning/statistics${qs}`);
}

export async function getDriftEvents(tenantId?: string): Promise<ModelDriftEvent[]> {
  const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  return (await request<ModelDriftEvent[]>(`/learning/drift${qs}`)) ?? [];
}

export async function registerFeedback(payload: CreateFeedbackPayload): Promise<LearningFeedback> {
  return request<LearningFeedback>('/learning/feedback', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getFeedbackHistory(decisionId?: string, tenantId?: string): Promise<LearningFeedback[]> {
  const params = new URLSearchParams();
  if (decisionId) params.set('decisionId', decisionId);
  if (tenantId) params.set('tenantId', tenantId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return (await request<LearningFeedback[]>(`/learning/feedback/history${qs}`)) ?? [];
}
