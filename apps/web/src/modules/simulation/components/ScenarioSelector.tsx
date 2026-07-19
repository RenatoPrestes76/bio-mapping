'use client';

import type { ScenarioTemplate, ScenarioType, TimeHorizon } from '../types/simulation.types';

const TIME_HORIZON_LABEL: Record<TimeHorizon, string> = {
  DAYS_30: '30 dias',
  DAYS_90: '90 dias',
  DAYS_180: '180 dias',
  YEAR_1: '1 ano',
  YEAR_2: '2 anos',
  YEAR_5: '5 anos',
};

interface Props {
  scenarios: ScenarioTemplate[];
  selectedScenario: ScenarioType | null;
  selectedHorizon: TimeHorizon;
  onSelectScenario: (type: ScenarioType) => void;
  onSelectHorizon: (horizon: TimeHorizon) => void;
  onRun: () => void;
  loading?: boolean;
}

export function ScenarioSelector({
  scenarios,
  selectedScenario,
  selectedHorizon,
  onSelectScenario,
  onSelectHorizon,
  onRun,
  loading,
}: Props) {
  return (
    <div data-testid="scenario-selector" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Cenário de Simulação
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {scenarios.map((s) => (
            <button
              key={s.scenarioType}
              data-testid="scenario-option"
              data-scenario={s.scenarioType}
              onClick={() => onSelectScenario(s.scenarioType)}
              className={[
                'text-left px-4 py-3 rounded-lg border text-sm transition-colors',
                selectedScenario === s.scenarioType
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600',
              ].join(' ')}
            >
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{s.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Horizonte Temporal
        </h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TIME_HORIZON_LABEL) as TimeHorizon[]).map((h) => (
            <button
              key={h}
              data-testid="horizon-option"
              data-horizon={h}
              onClick={() => onSelectHorizon(h)}
              className={[
                'px-3 py-1.5 rounded-full text-sm border transition-colors',
                selectedHorizon === h
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300',
              ].join(' ')}
            >
              {TIME_HORIZON_LABEL[h]}
            </button>
          ))}
        </div>
      </div>

      <button
        data-testid="run-simulation-btn"
        onClick={onRun}
        disabled={!selectedScenario || loading}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {loading ? 'Simulando...' : 'Executar Simulação'}
      </button>
    </div>
  );
}
