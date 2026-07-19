'use client';

import type { SimulationHistory } from '../types/simulation.types';

interface Props {
  history: SimulationHistory[];
}

export function SimulationHistoryList({ history }: Props) {
  if (history.length === 0) {
    return (
      <div data-testid="simulation-history-list" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
        <p className="text-gray-400 dark:text-gray-500">Nenhuma simulação executada ainda.</p>
      </div>
    );
  }

  return (
    <div data-testid="simulation-history-list" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
      {history.map((item) => (
        <div key={item.id} data-testid="history-item" className="px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.summary}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {new Date(item.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>
            <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {item.action}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
