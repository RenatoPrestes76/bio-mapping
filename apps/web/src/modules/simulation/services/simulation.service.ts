import type {
  ScenarioTemplate,
  SimulationRun,
  SimulationResult,
  SimulationAssumption,
  SimulationHistory,
  SimulationComparison,
  RunSimulationPayload,
  CompareSimulationsPayload,
} from '../types/simulation.types';

// Achado da Sprint 04 (Web→API): faltava o prefixo global `api/v1` da API.
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/v1`;

async function request<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function fetchScenarios(): Promise<ScenarioTemplate[] | null> {
  return request<ScenarioTemplate[]>('/api/simulation/scenarios');
}

export async function runSimulation(
  payload: RunSimulationPayload,
): Promise<{ run: SimulationRun; result: SimulationResult } | null> {
  return request<{ run: SimulationRun; result: SimulationResult }>('/api/simulation/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchSimulation(id: string): Promise<{
  run: SimulationRun;
  result: SimulationResult | null;
  assumptions: SimulationAssumption[];
} | null> {
  return request<{ run: SimulationRun; result: SimulationResult | null; assumptions: SimulationAssumption[] }>(
    `/api/simulation/${id}`,
  );
}

export async function fetchHistory(patientId: string, tenantId?: string): Promise<SimulationHistory[] | null> {
  const params = new URLSearchParams({ patientId });
  if (tenantId) params.set('tenantId', tenantId);
  return request<SimulationHistory[]>(`/api/simulation/history?${params}`);
}

export async function compareSimulations(payload: CompareSimulationsPayload): Promise<SimulationComparison | null> {
  return request<SimulationComparison>('/api/simulation/compare', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export const SimulationService = {
  fetchScenarios,
  runSimulation,
  fetchSimulation,
  fetchHistory,
  compareSimulations,
};
