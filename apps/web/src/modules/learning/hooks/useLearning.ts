"use client";

import { useState, useCallback } from 'react';
import * as LearningService from '../services/learning.service';
import type {
  ClinicalOutcome,
  ModelMetrics,
  ModelDriftEvent,
  LearningFeedback,
  ContinuousLearningStatistics,
  CreateOutcomePayload,
  CreateFeedbackPayload,
} from '../types/learning.types';

export function useLearning() {
  const [outcomes, setOutcomes] = useState<ClinicalOutcome[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [driftEvents, setDriftEvents] = useState<ModelDriftEvent[]>([]);
  const [feedbackList, setFeedbackList] = useState<LearningFeedback[]>([]);
  const [statistics, setStatistics] = useState<ContinuousLearningStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (tenantId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [metricsData, driftData, statsData, feedbackData] = await Promise.all([
        LearningService.getModelPerformance(tenantId),
        LearningService.getDriftEvents(tenantId),
        LearningService.getStatistics(tenantId),
        LearningService.getFeedbackHistory(undefined, tenantId),
      ]);
      setMetrics(metricsData);
      setDriftEvents(driftData);
      setStatistics(statsData);
      setFeedbackList(feedbackData);
    } catch {
      setError('Erro ao carregar dados de aprendizado.');
    } finally {
      setLoading(false);
    }
  }, []);

  const submitOutcome = useCallback(async (payload: CreateOutcomePayload): Promise<ClinicalOutcome | null> => {
    setError(null);
    try {
      const outcome = await LearningService.registerOutcome(payload);
      setOutcomes((prev) => [outcome, ...prev]);
      return outcome;
    } catch {
      setError('Erro ao registrar desfecho.');
      return null;
    }
  }, []);

  const submitFeedback = useCallback(async (payload: CreateFeedbackPayload): Promise<LearningFeedback | null> => {
    setError(null);
    try {
      const feedback = await LearningService.registerFeedback(payload);
      setFeedbackList((prev) => [feedback, ...prev]);
      return feedback;
    } catch {
      setError('Erro ao enviar feedback.');
      return null;
    }
  }, []);

  return {
    outcomes,
    metrics,
    driftEvents,
    feedbackList,
    statistics,
    loading,
    error,
    loadDashboard,
    submitOutcome,
    submitFeedback,
  };
}
