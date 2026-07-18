"use client";

import type { LongitudinalSummary } from '../types/precision.types';

const DIRECTION_STYLE = {
  IMPROVING: 'text-emerald-600 dark:text-emerald-400',
  STABLE: 'text-blue-500 dark:text-blue-400',
  WORSENING: 'text-red-600 dark:text-red-400',
};

const DIRECTION_ICON = {
  IMPROVING: '↓',
  STABLE: '→',
  WORSENING: '↑',
};

const DIRECTION_LABEL = {
  IMPROVING: 'Melhorando',
  STABLE: 'Estável',
  WORSENING: 'Piorando',
};

interface LongitudinalChartProps {
  summaries: LongitudinalSummary[];
}

export function LongitudinalChart({ summaries }: LongitudinalChartProps) {
  if (summaries.length === 0) {
    return (
      <div
        data-testid="longitudinal-chart"
        className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400 dark:border-zinc-700"
      >
        Nenhuma métrica longitudinal disponível.
      </div>
    );
  }

  return (
    <div data-testid="longitudinal-chart" className="space-y-3">
      {summaries.map((s) => {
        const direction = s.trend.direction;
        const range = s.max - s.min;
        const latestPosition = range > 0 ? ((s.latest - s.min) / range) * 100 : 50;

        return (
          <div
            key={s.metricName}
            data-testid="longitudinal-metric-row"
            data-metric={s.metricName}
            data-direction={direction}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{s.metricName}</span>
                {s.significantChange && (
                  <span className="ml-2 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    Mudança significativa
                  </span>
                )}
              </div>
              <span className={`flex items-center gap-1 text-sm font-medium ${DIRECTION_STYLE[direction]}`}>
                <span aria-hidden="true">{DIRECTION_ICON[direction]}</span>
                <span data-testid="direction-label">{DIRECTION_LABEL[direction]}</span>
              </span>
            </div>

            <div className="relative mb-1 h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="absolute top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-zinc-50"
                style={{ left: `${latestPosition}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-zinc-400">
              <span>Mín: {s.min.toFixed(1)}</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Atual: {s.latest.toFixed(1)}
              </span>
              <span>Máx: {s.max.toFixed(1)}</span>
            </div>

            <p className="mt-1 text-xs text-zinc-400">
              {s.trend.dataPoints} medições · variação {s.trend.percentChange >= 0 ? '+' : ''}{s.trend.percentChange.toFixed(1)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}
