import type {
  PopulationCohort,
  PopulationDashboard,
  PopulationAlert,
  CreateCohortPayload,
  CompareCohortsPayload,
} from '../types/population.types';

async function request<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function createCohort(payload: CreateCohortPayload): Promise<PopulationCohort | null> {
  return request<PopulationCohort>('/api/cohorts', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchCohort(id: string): Promise<{ cohort: PopulationCohort; filters: unknown[]; metrics: unknown[] } | null> {
  return request<{ cohort: PopulationCohort; filters: unknown[]; metrics: unknown[] }>(`/api/cohorts/${id}`);
}

export async function compareCohortsRequest(payload: CompareCohortsPayload): Promise<{ report: { entries: unknown[]; topDifference: unknown | null } } | null> {
  return request(`/api/cohorts/compare`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchDashboard(tenantId: string, cohortId?: string): Promise<PopulationDashboard | null> {
  const params = new URLSearchParams({ tenantId });
  if (cohortId) params.set('cohortId', cohortId);
  return request<PopulationDashboard>(`/api/population/dashboard?${params}`);
}

export async function fetchTrends(tenantId: string, cohortId?: string): Promise<unknown | null> {
  const params = new URLSearchParams({ tenantId });
  if (cohortId) params.set('cohortId', cohortId);
  return request(`/api/population/trends?${params}`);
}

export async function fetchRisk(tenantId: string): Promise<unknown | null> {
  return request(`/api/population/risk?tenantId=${tenantId}`);
}

export async function fetchAlerts(tenantId: string): Promise<PopulationAlert[] | null> {
  return request<PopulationAlert[]>(`/api/population/alerts?tenantId=${tenantId}`);
}

export async function acknowledgeAlert(alertId: string): Promise<unknown | null> {
  return request(`/api/population/alerts/${alertId}/acknowledge`, { method: 'PATCH' });
}

export const PopulationApiService = {
  createCohort,
  fetchCohort,
  compareCohortsRequest,
  fetchDashboard,
  fetchTrends,
  fetchRisk,
  fetchAlerts,
  acknowledgeAlert,
};
