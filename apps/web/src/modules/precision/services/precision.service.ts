import type {
  PatientProfile,
  PersonalizedRisk,
  PersonalizedRecommendation,
  CarePlan,
  TimelineResponse,
  CreateProfilePayload,
  CreateCarePlanPayload,
  CalculateRiskPayload,
} from '../types/precision.types';

const BASE = '/api/precision';

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

export async function createOrUpdateProfile(payload: CreateProfilePayload): Promise<PatientProfile | null> {
  return request<PatientProfile>(`${BASE}/profile`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function getProfile(patientId: string): Promise<PatientProfile | null> {
  return request<PatientProfile>(`${BASE}/profile/${encodeURIComponent(patientId)}`);
}

export async function calculateRisk(payload: CalculateRiskPayload): Promise<PersonalizedRisk | null> {
  return request<PersonalizedRisk>(`${BASE}/risk`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function getRecommendations(patientId: string): Promise<PersonalizedRecommendation[]> {
  return (await request<PersonalizedRecommendation[]>(`${BASE}/recommendations?patientId=${encodeURIComponent(patientId)}`)) ?? [];
}

export async function createCarePlan(payload: CreateCarePlanPayload): Promise<CarePlan | null> {
  return request<CarePlan>(`${BASE}/care-plan`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function getTimeline(patientId: string, metric?: string): Promise<TimelineResponse | null> {
  const params = new URLSearchParams({ patientId });
  if (metric) params.set('metric', metric);
  return request<TimelineResponse>(`${BASE}/timeline?${params.toString()}`);
}

export const PrecisionService = {
  createOrUpdateProfile,
  getProfile,
  calculateRisk,
  getRecommendations,
  createCarePlan,
  getTimeline,
};
