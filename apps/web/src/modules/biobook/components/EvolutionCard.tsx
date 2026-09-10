import type { EvolutionMetric } from '../types/biobook.types';

function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'stable' }) {
  if (!trend || trend === 'stable') {
    return <span className="text-ink-faint" aria-label="estável">—</span>;
  }
  return trend === 'up'
    ? <span className="text-success" aria-label="subindo">↑</span>
    : <span className="text-error" aria-label="descendo">↓</span>;
}

interface EvolutionCardProps {
  metrics: EvolutionMetric[];
  lastAssessment?: Date;
}

export function EvolutionCard({ metrics, lastAssessment }: EvolutionCardProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-faint">
          Minha Evolução
        </h2>
        {lastAssessment && (
          <span className="text-xs text-ink-faint">
            Última avaliação:{' '}
            {lastAssessment.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-0.5">
            <p className="text-xs text-ink-faint">{m.label}</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-lg font-semibold text-ink">
                {m.value}
                {m.unit && (
                  <span className="ml-0.5 text-sm font-normal text-ink-faint">
                    {m.unit}
                  </span>
                )}
              </p>
              <TrendIcon trend={m.trend} />
            </div>
            {m.change && (
              <p className="text-xs text-ink-faint">{m.change}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
