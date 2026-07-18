"use client";

import { useState, useEffect, useCallback } from 'react';
import type { CdsEvaluation, CdsAlert, CdsExplanation, EvaluateCdsInput } from '../types/cds.types';
import * as svc from '../services/cds.service';

interface UseCdsReturn {
  history: CdsEvaluation[];
  alerts: CdsAlert[];
  explanation: CdsExplanation | null;
  loading: boolean;
  evaluating: boolean;
  evaluate: (input: EvaluateCdsInput) => Promise<CdsEvaluation | null>;
  recalculate: (id: string) => Promise<CdsEvaluation | null>;
  viewExplanation: (id: string) => Promise<void>;
  dismissAlert: (alertId: string) => Promise<void>;
  refresh: () => void;
}

export function useCds(patientId: string): UseCdsReturn {
  const [history, setHistory] = useState<CdsEvaluation[]>([]);
  const [alerts, setAlerts] = useState<CdsAlert[]>([]);
  const [explanation, setExplanation] = useState<CdsExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [h, a] = await Promise.all([
        svc.getHistory(patientId, 10),
        svc.getAlerts(patientId, false),
      ]);
      setHistory(h);
      setAlerts(a);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { void load(); }, [load, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const evaluate = useCallback(async (input: EvaluateCdsInput): Promise<CdsEvaluation | null> => {
    setEvaluating(true);
    try {
      const result = await svc.evaluate(input);
      if (result) refresh();
      return result;
    } finally {
      setEvaluating(false);
    }
  }, [refresh]);

  const recalculate = useCallback(async (id: string): Promise<CdsEvaluation | null> => {
    setEvaluating(true);
    try {
      const result = await svc.recalculate(id);
      if (result) refresh();
      return result;
    } finally {
      setEvaluating(false);
    }
  }, [refresh]);

  const viewExplanation = useCallback(async (id: string) => {
    const exp = await svc.getExplanation(id);
    setExplanation(exp);
  }, []);

  const dismissAlert = useCallback(async (alertId: string) => {
    await svc.markAlertRead(alertId);
    setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, read: true } : a));
  }, []);

  return { history, alerts, explanation, loading, evaluating, evaluate, recalculate, viewExplanation, dismissAlert, refresh };
}
