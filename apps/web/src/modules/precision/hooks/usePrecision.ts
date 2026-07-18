'use client';

import { useState, useCallback } from 'react';
import {
  createOrUpdateProfile,
  getProfile,
  calculateRisk,
  getRecommendations,
  createCarePlan,
  getTimeline,
} from '../services/precision.service';
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

interface PrecisionState {
  profile: PatientProfile | null;
  risk: PersonalizedRisk | null;
  recommendations: PersonalizedRecommendation[];
  carePlan: CarePlan | null;
  timeline: TimelineResponse | null;
  loading: boolean;
  error: string | null;
}

export function usePrecision() {
  const [state, setState] = useState<PrecisionState>({
    profile: null,
    risk: null,
    recommendations: [],
    carePlan: null,
    timeline: null,
    loading: false,
    error: null,
  });

  const setLoading = (loading: boolean) => setState((s) => ({ ...s, loading, error: null }));
  const setError = (error: string) => setState((s) => ({ ...s, loading: false, error }));

  const loadProfile = useCallback(async (patientId: string) => {
    setLoading(true);
    const profile = await getProfile(patientId);
    if (profile) setState((s) => ({ ...s, profile, loading: false }));
    else setError('Erro ao carregar perfil do paciente.');
  }, []);

  const submitProfile = useCallback(async (payload: CreateProfilePayload): Promise<PatientProfile | null> => {
    setLoading(true);
    const profile = await createOrUpdateProfile(payload);
    if (profile) setState((s) => ({ ...s, profile, loading: false }));
    else setError('Erro ao salvar perfil.');
    return profile;
  }, []);

  const loadRisk = useCallback(async (payload: CalculateRiskPayload) => {
    setLoading(true);
    const risk = await calculateRisk(payload);
    if (risk) setState((s) => ({ ...s, risk, loading: false }));
    else setError('Erro ao calcular risco personalizado.');
  }, []);

  const loadRecommendations = useCallback(async (patientId: string) => {
    setLoading(true);
    const recommendations = await getRecommendations(patientId);
    setState((s) => ({ ...s, recommendations, loading: false }));
  }, []);

  const submitCarePlan = useCallback(async (payload: CreateCarePlanPayload): Promise<CarePlan | null> => {
    setLoading(true);
    const carePlan = await createCarePlan(payload);
    if (carePlan) setState((s) => ({ ...s, carePlan, loading: false }));
    else setError('Erro ao criar plano de cuidado.');
    return carePlan;
  }, []);

  const loadTimeline = useCallback(async (patientId: string, metric?: string) => {
    setLoading(true);
    const timeline = await getTimeline(patientId, metric);
    if (timeline) setState((s) => ({ ...s, timeline, loading: false }));
    else setError('Erro ao carregar linha do tempo.');
  }, []);

  return {
    ...state,
    loadProfile,
    submitProfile,
    loadRisk,
    loadRecommendations,
    submitCarePlan,
    loadTimeline,
  };
}
