"use client";

import type { ModelDriftEvent, DriftSeverity } from '../types/learning.types';

const DRIFT_TYPE_LABEL: Record<string, string> = {
  DATA_DRIFT: 'Data Drift',
  CONCEPT_DRIFT: 'Concept Drift',
  FEATURE_DRIFT: 'Feature Drift',
  POPULATION_DRIFT: 'Population Drift',
};

const SEVERITY_STYLE: Record<DriftSeverity, string> = {
  LOW: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  MODERATE: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  HIGH: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  CRITICAL: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300',
};

const SEVERITY_LABEL: Record<DriftSeverity, string> = {
  LOW: 'Baixo',
  MODERATE: 'Moderado',
  HIGH: 'Alto',
  CRITICAL: 'Crítico',
};

interface DriftAlertProps {
  event: ModelDriftEvent;
}

export function DriftAlert({ event }: DriftAlertProps) {
  const severity = event.severity as DriftSeverity;
  return (
    <div
      role="alert"
      data-testid="drift-alert"
      data-severity={event.severity}
      data-drift-type={event.driftType}
      className={`rounded-xl border p-4 ${SEVERITY_STYLE[severity]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚠</span>
          <div>
            <p className="text-sm font-semibold">{DRIFT_TYPE_LABEL[event.driftType] ?? event.driftType}</p>
            <p className="text-xs opacity-75">{event.modelName}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium`}>
            {SEVERITY_LABEL[severity]}
          </span>
          <p className="mt-1 text-xs opacity-60">
            Score: {event.driftScore.toFixed(4)} / {event.threshold}
          </p>
        </div>
      </div>
      {event.features && event.features.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {event.features.map((f) => (
            <span key={f} className="rounded bg-white/40 px-1.5 py-0.5 text-xs dark:bg-black/20">{f}</span>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs opacity-60">
        {new Date(event.createdAt).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}
