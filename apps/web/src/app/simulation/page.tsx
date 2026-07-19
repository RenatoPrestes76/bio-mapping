'use client';

import { useEffect, useState } from 'react';
import { useSimulation } from '../../modules/simulation/hooks/useSimulation';
import { ScenarioSelector } from '../../modules/simulation/components/ScenarioSelector';
import { SimulationResultCard } from '../../modules/simulation/components/SimulationResultCard';
import { ScenarioComparison } from '../../modules/simulation/components/ScenarioComparison';
import { SimulationHistoryList } from '../../modules/simulation/components/SimulationHistoryList';
import type { ScenarioType, TimeHorizon } from '../../modules/simulation/types/simulation.types';

type Tab = 'simulator' | 'comparar' | 'historico';

const PATIENT_ID = 'demo-patient-1';

export default function SimulationPage() {
  const {
    scenarios,
    lastRun,
    lastResult,
    currentAssumptions,
    history,
    comparison,
    loading,
    error,
    loadScenarios,
    submitSimulation,
    loadHistory,
    submitComparison,
  } = useSimulation();

  const [tab, setTab] = useState<Tab>('simulator');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);
  const [selectedHorizon, setSelectedHorizon] = useState<TimeHorizon>('YEAR_1');
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);

  useEffect(() => {
    loadScenarios();
    loadHistory(PATIENT_ID);
  }, [loadScenarios, loadHistory]);

  const handleRun = async () => {
    if (!selectedScenario) return;
    await submitSimulation({ patientId: PATIENT_ID, scenarioType: selectedScenario, timeHorizon: selectedHorizon });
  };

  const handleToggleRunForComparison = (runId: string) => {
    setSelectedRunIds((prev) =>
      prev.includes(runId) ? prev.filter((id) => id !== runId) : [...prev, runId],
    );
  };

  const handleCompare = async () => {
    if (selectedRunIds.length < 2) return;
    await submitComparison({ runIds: selectedRunIds });
    setTab('comparar');
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'simulator', label: 'Simulador' },
    { id: 'comparar', label: 'Comparar' },
    { id: 'historico', label: 'Histórico' },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Digital Twin — Simulação Clínica</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Analise cenários hipotéticos para apoio à decisão clínica. Estimativas condicionais — não constituem diagnóstico ou previsão médica.
        </p>
      </header>

      <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {tab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScenarioSelector
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            selectedHorizon={selectedHorizon}
            onSelectScenario={setSelectedScenario}
            onSelectHorizon={setSelectedHorizon}
            onRun={handleRun}
            loading={loading}
          />

          {lastRun && lastResult ? (
            <div className="space-y-4">
              <SimulationResultCard
                run={lastRun}
                result={lastResult}
                assumptions={currentAssumptions}
              />
              <button
                onClick={() => handleToggleRunForComparison(lastRun.id)}
                className={[
                  'w-full py-2 text-sm rounded-lg border transition-colors',
                  selectedRunIds.includes(lastRun.id)
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400',
                ].join(' ')}
              >
                {selectedRunIds.includes(lastRun.id) ? '✓ Adicionado à comparação' : 'Adicionar à comparação'}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center p-12 text-gray-400 dark:text-gray-500 text-sm text-center">
              Selecione um cenário e clique em "Executar Simulação" para ver os resultados.
            </div>
          )}
        </div>
      )}

      {tab === 'comparar' && (
        <div className="space-y-4">
          {selectedRunIds.length >= 2 && !comparison && (
            <button
              onClick={handleCompare}
              disabled={loading}
              className="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
            >
              {loading ? 'Comparando...' : `Comparar ${selectedRunIds.length} simulações`}
            </button>
          )}
          {selectedRunIds.length < 2 && !comparison && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Adicione pelo menos 2 simulações na aba Simulador para comparar.
            </p>
          )}
          {comparison && <ScenarioComparison comparison={comparison} />}
        </div>
      )}

      {tab === 'historico' && (
        <SimulationHistoryList history={history} />
      )}
    </main>
  );
}
