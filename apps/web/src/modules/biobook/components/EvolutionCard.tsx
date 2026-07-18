import type { EvolutionMetric } from '../types/biobook.types';

function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'stable' }) {
  if (!trend || trend === 'stable') {
    return <span className="text-zinc-400" aria-label="estável">—</span>;
  }
  return trend === 'up'
    ? <span className="text-emerald-500" aria-label="subindo">↑</span>
    : <span className="text-red-400" aria-label="descendo">↓</span>;
}

interface EvolutionCardProps {
  metrics: EvolutionMetric[];
  lastAssessment?: Date;
}

export function EvolutionCard({ metrics, lastAssessment }: EvolutionCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Minha Evolução
        </h2>
        {lastAssessment && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Última avaliação:{' '}
            {lastAssessment.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-0.5">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{m.label}</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {m.value}
                {m.unit && (
                  <span className="ml-0.5 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                    {m.unit}
                  </span>
                )}
              </p>
              <TrendIcon trend={m.trend} />
            </div>
            {m.change && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{m.change}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
