'use client';

import { useState, useCallback } from 'react';
import { SimulationService } from '../services/simulation.service';
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

interface SimulationState {
  scenarios: ScenarioTemplate[];
  lastRun: SimulationRun | null;
  lastResult: SimulationResult | null;
  currentAssumptions: SimulationAssumption[];
  history: SimulationHistory[];
  comparison: SimulationComparison | null;
  loading: boolean;
  error: string | null;
}

export function useSimulation() {
  const [state, setState] = useState<SimulationState>({
    scenarios: [],
    lastRun: null,
    lastResult: null,
    currentAssumptions: [],
    history: [],
    comparison: null,
    loading: false,
    error: null,
  });

  const setLoading = (loading: boolean) => setState((s) => ({ ...s, loading, error: null }));
  const setError = (error: string) => setState((s) => ({ ...s, loading: false, error }));

  const loadScenarios = useCallback(async () => {
    setLoading(true);
    const data = await SimulationService.fetchScenarios();
    if (!data) return setError('Falha ao carregar cenários');
    setState((s) => ({ ...s, scenarios: data, loading: false }));
  }, []);

  const submitSimulation = useCallback(async (payload: RunSimulationPayload) => {
    setLoading(true);
    const data = await SimulationService.runSimulation(payload);
    if (!data) return setError('Falha ao executar simulação');
    setState((s) => ({ ...s, lastRun: data.run, lastResult: data.result, loading: false }));
  }, []);

  const loadSimulation = useCallback(async (id: string) => {
    setLoading(true);
    const data = await SimulationService.fetchSimulation(id);
    if (!data) return setError('Simulação não encontrada');
    setState((s) => ({
      ...s,
      lastRun: data.run,
      lastResult: data.result,
      currentAssumptions: data.assumptions,
      loading: false,
    }));
  }, []);

  const loadHistory = useCallback(async (patientId: string, tenantId?: string) => {
    setLoading(true);
    const data = await SimulationService.fetchHistory(patientId, tenantId);
    if (!data) return setError('Falha ao carregar histórico');
    setState((s) => ({ ...s, history: data, loading: false }));
  }, []);

  const submitComparison = useCallback(async (payload: CompareSimulationsPayload) => {
    setLoading(true);
    const data = await SimulationService.compareSimulations(payload);
    if (!data) return setError('Falha ao comparar simulações');
    setState((s) => ({ ...s, comparison: data, loading: false }));
  }, []);

  return {
    ...state,
    loadScenarios,
    submitSimulation,
    loadSimulation,
    loadHistory,
    submitComparison,
  };
}
