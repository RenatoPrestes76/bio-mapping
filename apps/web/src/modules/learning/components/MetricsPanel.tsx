"use client";

import type { ModelMetrics } from '../types/learning.types';

interface MetricRowProps {
  label: string;
  value?: number | null;
}

function MetricRow({ label, value }: MetricRowProps) {
  const display = value != null ? `${Math.round(value * 100)}%` : '—';
  const barWidth = value != null ? Math.round(value * 100) : 0;
  const barColor =
    value == null ? 'bg-zinc-200 dark:bg-zinc-700'
    : value >= 0.8 ? 'bg-emerald-500'
    : value >= 0.6 ? 'bg-yellow-500'
    : 'bg-red-500';
  return (
    <div data-testid="metric-row">
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">{display}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  );
}

interface MetricsPanelProps {
  metrics: ModelMetrics;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  return (
    <div data-testid="metrics-panel" className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{metrics.modelName}</h3>
          <p className="text-xs text-zinc-400">v{metrics.modelVersion} · {metrics.sampleSize} amostras</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {new Date(metrics.computedAt).toLocaleDateString('pt-BR')}
        </span>
      </div>
      <div className="space-y-3">
        <MetricRow label="Acurácia" value={metrics.accuracy} />
        <MetricRow label="Precisão" value={metrics.precision} />
        <MetricRow label="Recall" value={metrics.recall} />
        <MetricRow label="Especificidade" value={metrics.specificity} />
        <MetricRow label="Sensibilidade" value={metrics.sensitivity} />
        <MetricRow label="F1 Score" value={metrics.f1Score} />
        <MetricRow label="ROC AUC" value={metrics.rocAuc} />
        <MetricRow label="Calibração" value={metrics.calibration} />
      </div>
    </div>
  );
}
