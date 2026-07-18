"use client";

import { useState } from 'react';
import { useCds } from '@/modules/cds/hooks/useCds';
import { CdsDecisionCard } from '@/modules/cds/components/CdsDecisionCard';
import { AlertBanner } from '@/modules/cds/components/AlertBanner';
import { ExplanationPanel } from '@/modules/cds/components/ExplanationPanel';
import { PriorityBadge } from '@/modules/cds/components/PriorityBadge';
import type { EvaluateCdsInput } from '@/modules/cds/types/cds.types';

const DEMO_PATIENT_ID = 'demo-patient';

const DEMO_VARIABLES: Record<string, Record<string, number>> = {
  'Sem variáveis (LOW)': {},
  'Pré-diabetes (MODERATE)': { hba1c: 5.8, physicalActivityLevel: 1, bmi: 28 },
  'Diabetes + Obesidade (HIGH)': { hba1c: 7.2, bmi: 33 },
  'Hipertensão Grave (URGENT)': { systolicBp: 170 },
  'Hipoglicemia (CRITICAL)': { glucose: 45 },
};

export default function CdsPage() {
  const { history, alerts, explanation, loading, evaluating, evaluate, recalculate, viewExplanation, dismissAlert } = useCds(DEMO_PATIENT_ID);
  const [selectedPreset, setSelectedPreset] = useState<string>('Pré-diabetes (MODERATE)');
  const [showExplanation, setShowExplanation] = useState(false);

  async function handleEvaluate() {
    const variables = DEMO_VARIABLES[selectedPreset] ?? {};
    const input: EvaluateCdsInput = {
      patientId: DEMO_PATIENT_ID,
      variables,
      examCount: 3,
      biomarkerCount: Object.keys(variables).length,
      hasLongitudinalHistory: history.length > 0,
    };
    await evaluate(input);
  }

  async function handleViewExplanation(id: string) {
    await viewExplanation(id);
    setShowExplanation(true);
  }

  const unreadAlerts = alerts.filter((a) => !a.read);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Clinical Decision Support</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Motor CDS — GAIA v1.0</p>
        </div>

        {/* Alerts */}
        {unreadAlerts.length > 0 && (
          <div className="mb-6 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {unreadAlerts.length} {unreadAlerts.length === 1 ? 'alerta ativo' : 'alertas ativos'}
            </h2>
            {unreadAlerts.map((alert) => (
              <AlertBanner key={alert.id} alert={alert} onDismiss={(id) => { void dismissAlert(id); }} />
            ))}
          </div>
        )}

        {/* Evaluation panel */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Nova Avaliação CDS</h2>
          <div className="mb-4">
            <label htmlFor="preset-select" className="mb-1 block text-xs font-medium text-zinc-500">
              Cenário clínico (demonstração)
            </label>
            <select
              id="preset-select"
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              {Object.keys(DEMO_VARIABLES).map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
          {Object.keys(DEMO_VARIABLES[selectedPreset] ?? {}).length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries(DEMO_VARIABLES[selectedPreset] ?? {}).map(([k, v]) => (
                <span key={k} className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                  {k}: <span className="font-medium text-zinc-900 dark:text-zinc-50">{v}</span>
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={evaluating}
            onClick={() => { void handleEvaluate(); }}
            className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {evaluating ? 'Avaliando...' : '⚕️ Executar Avaliação CDS'}
          </button>
        </div>

        {/* Explanation modal/inline */}
        {showExplanation && explanation && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Explicação da Decisão</h2>
              <button
                type="button"
                onClick={() => setShowExplanation(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Fechar
              </button>
            </div>
            <ExplanationPanel explanation={explanation} />
          </div>
        )}

        {/* History */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Histórico de Avaliações
            </h2>
            {history.length > 0 && (
              <div className="flex gap-2">
                {(['LOW', 'MODERATE', 'HIGH', 'URGENT', 'CRITICAL'] as const).map((p) => {
                  const count = history.filter((e) => e.priority === p).length;
                  return count > 0 ? <PriorityBadge key={p} priority={p} size="sm" /> : null;
                })}
              </div>
            )}
          </div>
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500">Nenhuma avaliação ainda. Execute sua primeira análise CDS acima.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((evaluation) => (
                <CdsDecisionCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  onViewExplanation={(id) => { void handleViewExplanation(id); }}
                  onRecalculate={(id) => { void recalculate(id); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
