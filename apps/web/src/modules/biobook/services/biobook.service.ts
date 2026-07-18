import type { BioBookData, HealthSummary, TimelineEvent } from '../types/biobook.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function getPatientTimelineSummary(patientId: string): Promise<HealthSummary | null> {
  const data = await apiFetch<{
    openDecisions: number;
    criticalDecisions: number;
    activePathways: number;
    pendingRecommendations: number;
    recentPredictions: number;
  }>(`/patient-monitoring/${patientId}/summary`);
  if (!data) return null;
  return {
    openDecisions: data.openDecisions,
    criticalDecisions: data.criticalDecisions,
    activePathways: data.activePathways,
    pendingRecommendations: data.pendingRecommendations,
    recentTrends: [],
  };
}

export async function getPatientTimeline(patientId: string): Promise<TimelineEvent[]> {
  const data = await apiFetch<TimelineEvent[]>(`/patient-monitoring/${patientId}/timeline`);
  return data ?? [];
}

export async function getPatientTrends(patientId: string) {
  return apiFetch(`/clinical-trends/patient/${patientId}`);
}

export async function getPatientPathways(patientId: string) {
  return apiFetch(`/clinical-pathways?patientId=${patientId}&status=ACTIVE`);
}

export function buildDemoBioBookData(): BioBookData {
  return {
    user: {
      name: 'Atleta Bio Mapping',
      username: 'atleta.bio',
      mainGoal: 'Saúde e Performance',
      mainSport: 'Corrida',
      memberSince: new Date(Date.now() - 90 * 86_400_000),
    },
    metrics: [
      { label: 'Peso', value: 78.4, unit: 'kg', trend: 'down', change: '-1.2 kg' },
      { label: 'Massa muscular', value: 34.1, unit: 'kg', trend: 'up', change: '+0.8 kg' },
      { label: 'Gordura corporal', value: 18.3, unit: '%', trend: 'down', change: '-0.5%' },
      { label: 'IMC', value: 24.6, unit: '', trend: 'stable', change: '±0' },
      { label: 'Glicemia', value: 95, unit: 'mg/dL', trend: 'stable', change: '±2' },
      { label: 'Pressão arterial', value: '120/80', unit: 'mmHg', trend: 'stable', change: '' },
    ],
    goals: [
      { id: 'g1', label: 'Perda de peso — meta: 75 kg', progress: 68, nextMilestone: '-1 kg nos próximos 14 dias' },
      { id: 'g2', label: 'Corrida — meta: 5 km sem parar', progress: 45, nextMilestone: '3 km contínuos esta semana' },
      { id: 'g3', label: 'Massa muscular — meta: 36 kg', progress: 30, nextMilestone: '+0.5 kg em 30 dias' },
    ],
    achievements: [
      { id: 'a1', title: 'Primeira avaliação concluída', achievedAt: new Date(Date.now() - 85 * 86_400_000), category: 'assessment' },
      { id: 'a2', title: 'Meta de peso iniciada', achievedAt: new Date(Date.now() - 80 * 86_400_000), category: 'goal' },
      { id: 'a3', title: '30 dias de monitoramento', achievedAt: new Date(Date.now() - 60 * 86_400_000), category: 'milestone' },
      { id: 'a4', title: 'Primeira redução de gordura registrada', achievedAt: new Date(Date.now() - 45 * 86_400_000), category: 'health' },
    ],
    photos: [],
    health: {
      openDecisions: 0,
      criticalDecisions: 0,
      activePathways: 0,
      pendingRecommendations: 0,
      recentTrends: [
        { metric: 'blood_pressure', trendType: 'STABLE', direction: 'STABLE', summary: 'Pressão arterial estável' },
        { metric: 'bmi', trendType: 'IMPROVING', direction: 'DECREASING', summary: 'IMC em melhora' },
      ],
    },
    circle: { connections: 3, teams: 1, pendingInvites: 0 },
    timeline: [
      {
        id: 't1', eventType: 'INSIGHT_GENERATED', severity: 'MEDIUM',
        title: 'Nova análise de risco disponível', occurredAt: new Date(Date.now() - 2 * 86_400_000),
        sourceTable: 'health_insights',
      },
      {
        id: 't2', eventType: 'PATHWAY_STARTED', severity: 'LOW',
        title: 'Jornada de controle de peso iniciada', occurredAt: new Date(Date.now() - 7 * 86_400_000),
        sourceTable: 'clinical_pathways',
      },
    ],
  };
}
