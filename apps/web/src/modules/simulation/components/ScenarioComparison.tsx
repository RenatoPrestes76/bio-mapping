'use client';

import type { SimulationComparison, RiskTrend } from '../types/simulation.types';

const TREND_LABEL: Record<RiskTrend, string> = {
  REDUCTION: 'Redução',
  STABLE: 'Estável',
  INCREASE: 'Aumento',
};

const TREND_COLOR: Record<RiskTrend, string> = {
  REDUCTION: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
  STABLE: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
  INCREASE: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
};

interface Props {
  comparison: SimulationComparison;
}

export function ScenarioComparison({ comparison }: Props) {
  return (
    <div data-testid="scenario-comparison" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Comparação de Cenários</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1" data-testid="comparison-summary">{comparison.summary}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Melhor cenário</div>
          <div data-testid="best-scenario" className="mt-1 font-semibold text-green-600 dark:text-green-400">
            {comparison.bestScenario ?? '—'}
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Pior cenário</div>
          <div data-testid="worst-scenario" className="mt-1 font-semibold text-red-600 dark:text-red-400">
            {comparison.worstScenario ?? '—'}
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Variação média</div>
          <div data-testid="average-variation" className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
            {comparison.averageVariation > 0 ? '+' : ''}{comparison.averageVariation.toFixed(1)} pp
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">Cenário</th>
              <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">Horizonte</th>
              <th className="text-right py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">Variação</th>
              <th className="text-right py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">Confiança</th>
              <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Tendência</th>
            </tr>
          </thead>
          <tbody>
            {comparison.entries.map((entry) => (
              <tr
                key={entry.runId}
                data-testid="comparison-row"
                data-trend={entry.riskTrend}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">{entry.scenarioLabel}</td>
                <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">{entry.timeHorizonLabel}</td>
                <td className="py-3 pr-4 text-right font-medium">
                  <span className={entry.expectedRiskVariation < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {entry.expectedRiskVariation > 0 ? '+' : ''}{entry.expectedRiskVariation.toFixed(1)} pp
                  </span>
                </td>
                <td className="py-3 pr-4 text-right text-gray-700 dark:text-gray-300">
                  {Math.round(entry.confidence * 100)}%
                </td>
                <td className="py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TREND_COLOR[entry.riskTrend]}`}>
                    {TREND_LABEL[entry.riskTrend]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
