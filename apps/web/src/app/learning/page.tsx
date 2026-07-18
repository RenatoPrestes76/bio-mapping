"use client";

import { useEffect, useState } from 'react';
import { useLearning } from '../../modules/learning/hooks/useLearning';
import { MetricsPanel } from '../../modules/learning/components/MetricsPanel';
import { DriftAlert } from '../../modules/learning/components/DriftAlert';
import { FeedbackForm } from '../../modules/learning/components/FeedbackForm';
import { OutcomeStatusBadge } from '../../modules/learning/components/OutcomeStatusBadge';
import type { CreateFeedbackPayload, OutcomeCategory } from '../../modules/learning/types/learning.types';

const DEMO_DECISION_ID = 'demo-decision-001';

const OUTCOME_OPTIONS: OutcomeCategory[] = ['IMPROVED', 'STABLE', 'WORSENED', 'HOSPITALIZED', 'RESOLVED', 'UNKNOWN'];

export default function LearningPage() {
  const { metrics, driftEvents, statistics, feedbackList, loading, error, loadDashboard, submitOutcome, submitFeedback } = useLearning();
  const [tab, setTab] = useState<'dashboard' | 'outcomes' | 'feedback'>('dashboard');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [outcomeForm, setOutcomeForm] = useState({ patientId: 'patient-001', outcome: 'IMPROVED' as OutcomeCategory, validatedBy: 'physician', comments: '' });
  const [outcomeSuccess, setOutcomeSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleFeedback = async (payload: CreateFeedbackPayload) => {
    setSubmitting(true);
    const result = await submitFeedback(payload);
    setSubmitting(false);
    if (result) setFeedbackSuccess(true);
  };

  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await submitOutcome({
      decisionId: DEMO_DECISION_ID,
      patientId: outcomeForm.patientId,
      followUpDate: new Date().toISOString().split('T')[0],
      outcome: outcomeForm.outcome,
      validatedBy: outcomeForm.validatedBy,
      comments: outcomeForm.comments || undefined,
    });
    setSubmitting(false);
    if (result) setOutcomeSuccess(true);
  };

  const TABS = [
    { id: 'dashboard' as const, label: 'Dashboard' },
    { id: 'outcomes' as const, label: 'Registrar Desfecho' },
    { id: 'feedback' as const, label: 'Feedback Clínico' },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Aprendizado Contínuo</h1>
        <p className="mt-1 text-sm text-zinc-500">Validação de desfechos e desempenho dos modelos de IA</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        </div>
      )}

      {/* Dashboard Tab */}
      {tab === 'dashboard' && !loading && (
        <div className="space-y-6">
          {/* Stats summary */}
          {statistics && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Decisões', value: statistics.totalDecisions },
                { label: 'Desfechos', value: statistics.totalOutcomes },
                { label: 'Alertas de Drift', value: statistics.driftEventsCount },
                { label: 'Feedbacks', value: statistics.feedbackCount },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Model performance */}
          {metrics.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Desempenho dos modelos</h2>
              {metrics.map((m) => <MetricsPanel key={m.id} metrics={m} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
              Nenhuma métrica disponível ainda. Registre desfechos para calcular o desempenho.
            </div>
          )}

          {/* Drift events */}
          {driftEvents.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Alertas de Drift ({driftEvents.length})
              </h2>
              {driftEvents.map((e) => <DriftAlert key={e.id} event={e} />)}
            </div>
          )}

          {/* Recent feedback */}
          {feedbackList.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Feedbacks recentes</h2>
              <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {feedbackList.slice(0, 5).map((f) => (
                  <div key={f.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{f.role}</p>
                      <p className="text-xs text-zinc-400">{f.comment ?? '—'}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      f.classification === 'CORRECT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : f.classification === 'INCORRECT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}>
                      {f.classification === 'CORRECT' ? 'Correta'
                        : f.classification === 'PARTIALLY_CORRECT' ? 'Parcial'
                        : f.classification === 'INCORRECT' ? 'Incorreta'
                        : 'Inconclusiva'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Outcomes Tab */}
      {tab === 'outcomes' && !loading && (
        <div className="space-y-6">
          <form
            onSubmit={handleOutcomeSubmit}
            className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Registrar Desfecho Clínico</h2>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">ID do Paciente</label>
              <input
                type="text"
                value={outcomeForm.patientId}
                onChange={(e) => setOutcomeForm((f) => ({ ...f, patientId: e.target.value }))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Desfecho observado</label>
              <div className="flex flex-wrap gap-2">
                {OUTCOME_OPTIONS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOutcomeForm((f) => ({ ...f, outcome: o }))}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                      outcomeForm.outcome === o
                        ? 'ring-2 ring-zinc-900 dark:ring-zinc-50'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <OutcomeStatusBadge outcome={o} size="sm" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Validado por</label>
              <input
                type="text"
                value={outcomeForm.validatedBy}
                onChange={(e) => setOutcomeForm((f) => ({ ...f, validatedBy: e.target.value }))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Observações <span className="text-zinc-400">(opcional)</span>
              </label>
              <textarea
                value={outcomeForm.comments}
                onChange={(e) => setOutcomeForm((f) => ({ ...f, comments: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            {outcomeSuccess && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Desfecho registrado com sucesso.</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting ? 'Registrando...' : 'Registrar desfecho'}
            </button>
          </form>
        </div>
      )}

      {/* Feedback Tab */}
      {tab === 'feedback' && !loading && (
        <div className="space-y-4">
          {feedbackSuccess && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              Feedback enviado com sucesso.
            </div>
          )}
          <FeedbackForm decisionId={DEMO_DECISION_ID} onSubmit={handleFeedback} loading={submitting} />
        </div>
      )}
    </main>
  );
}
