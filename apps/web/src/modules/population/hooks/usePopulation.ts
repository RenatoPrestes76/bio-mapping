'use client';

import { useState, useCallback } from 'react';
import type {
  PopulationCohort,
  PopulationDashboard,
  PopulationAlert,
  CreateCohortPayload,
  CompareCohortsPayload,
} from '../types/population.types';
import {
  createCohort,
  fetchDashboard,
  fetchAlerts,
  acknowledgeAlert as ackAlertApi,
  compareCohortsRequest,
  fetchTrends,
  fetchRisk,
} from '../services/population.service';

interface PopulationState {
  cohort: PopulationCohort | null;
  dashboard: PopulationDashboard | null;
  alerts: PopulationAlert[];
  comparison: { report: { entries: unknown[]; topDifference: unknown | null } } | null;
  trends: unknown | null;
  risk: unknown | null;
  loading: boolean;
  error: string | null;
}

export function usePopulation() {
  const [state, setState] = useState<PopulationState>({
    cohort: null,
    dashboard: null,
    alerts: [],
    comparison: null,
    trends: null,
    risk: null,
    loading: false,
    error: null,
  });

  const setLoading = (loading: boolean) => setState((s) => ({ ...s, loading }));
  const setError = (error: string | null) => setState((s) => ({ ...s, error }));

  const submitCreateCohort = useCallback(async (payload: CreateCohortPayload) => {
    setLoading(true);
    setError(null);
    const result = await createCohort(payload);
    setState((s) => ({ ...s, cohort: result, loading: false }));
    return result;
  }, []);

  const loadDashboard = useCallback(async (tenantId: string, cohortId?: string) => {
    setLoading(true);
    setError(null);
    const result = await fetchDashboard(tenantId, cohortId);
    setState((s) => ({ ...s, dashboard: result, loading: false }));
    return result;
  }, []);

  const loadAlerts = useCallback(async (tenantId: string) => {
    setLoading(true);
    setError(null);
    const result = await fetchAlerts(tenantId);
    setState((s) => ({ ...s, alerts: result ?? [], loading: false }));
    return result;
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    await ackAlertApi(alertId);
    setState((s) => ({
      ...s,
      alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, isActive: false } : a)),
    }));
  }, []);

  const submitComparison = useCallback(async (payload: CompareCohortsPayload) => {
    setLoading(true);
    setError(null);
    const result = await compareCohortsRequest(payload);
    setState((s) => ({ ...s, comparison: result, loading: false }));
    return result;
  }, []);

  const loadTrends = useCallback(async (tenantId: string, cohortId?: string) => {
    setLoading(true);
    const result = await fetchTrends(tenantId, cohortId);
    setState((s) => ({ ...s, trends: result, loading: false }));
    return result;
  }, []);

  const loadRisk = useCallback(async (tenantId: string) => {
    setLoading(true);
    const result = await fetchRisk(tenantId);
    setState((s) => ({ ...s, risk: result, loading: false }));
    return result;
  }, []);

  return {
    ...state,
    submitCreateCohort,
    loadDashboard,
    loadAlerts,
    acknowledgeAlert,
    submitComparison,
    loadTrends,
    loadRisk,
  };
}
