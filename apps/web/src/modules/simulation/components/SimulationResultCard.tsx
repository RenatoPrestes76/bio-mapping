'use client';

import type { SimulationRun, SimulationResult, SimulationAssumption } from '../types/simulation.types';

const RISK_LABEL: Record<string, string> = {
  LOW: 'Baixo',
  MODERATE: 'Moderado',
  HIGH: 'Alto',
  VERY_HIGH: 'Muito Alto',
  CRITICAL: 'Crítico',
};

const RISK_COLOR: Record<string, string> = {
  LOW: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
  MODERATE: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30',
  HIGH: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30',
  VERY_HIGH: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
  CRITICAL: 'text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/50',
};

function VariationBadge({ value }: { value: number }) {
  const isReduction = value < -2;
  const isIncrease = value > 2;
  const color = isReduction
    ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
    : isIncrease
      ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
      : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
  const prefix = value > 0 ? '+' : '';
  return (
    <span data-testid="risk-variation-badge" className={`inline-block px-2 py-0.5 rounded text-sm font-semibold ${color}`}>
      {prefix}{value.toFixed(1)} pp
    </span>
  );
}

interface Props {
  run: SimulationRun;
  result: SimulationResult;
  assumptions?: SimulationAssumption[];
}

export function SimulationResultCard({ run, result, assumptions = [] }: Props) {
  const premises = assumptions.filter((a) => a.category === 'PREMISSA');
  const limitations = assumptions.filter((a) => a.category === 'LIMITAÇÃO');

  return (
    <div data-testid="simulation-result-card" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{run.scenarioLabel}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Horizonte: {run.timeHorizon}</p>
        </div>
        <VariationBadge value={result.expectedRiskVariation} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div data-testid="baseline-risk" className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Risco Basal</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {(result.baselineRiskScore * 100).toFixed(0)}%
          </div>
          <span className={`mt-1 inline-block px-2 py-0.5 rounded text-xs font-medium ${RISK_COLOR[result.baselineRiskLevel] ?? ''}`}>
            {RISK_LABEL[result.baselineRiskLevel] ?? result.baselineRiskLevel}
          </span>
        </div>

        <div data-testid="simulated-risk" className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Risco Simulado</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {(result.simulatedRiskScore * 100).toFixed(0)}%
          </div>
          <span className={`mt-1 inline-block px-2 py-0.5 rounded text-xs font-medium ${RISK_COLOR[result.simulatedRiskLevel] ?? ''}`}>
            {RISK_LABEL[result.simulatedRiskLevel] ?? result.simulatedRiskLevel}
          </span>
        </div>
      </div>

      <div data-testid="confidence-score" className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-2 rounded-full bg-blue-500"
            style={{ width: `${result.confidence * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {Math.round(result.confidence * 100)}% confiança
        </span>
      </div>

      {result.topFactors.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Fatores Principais</h3>
          <ul className="space-y-2">
            {result.topFactors.map((f, i) => (
              <li key={i} data-testid="top-factor" className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{f.factor}</span>
                <span className={f.contribution < 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                  {f.contribution > 0 ? '+' : ''}{(f.contribution * 100).toFixed(1)} pp
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {premises.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Premissas</h3>
          <ul className="space-y-1">
            {premises.map((a) => (
              <li key={a.id} data-testid="assumption-item" className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 text-blue-400">•</span>
                {a.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {limitations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Limitações</h3>
          <ul className="space-y-1">
            {limitations.map((a) => (
              <li key={a.id} data-testid="limitation-item" className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 text-yellow-400">⚠</span>
                {a.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
