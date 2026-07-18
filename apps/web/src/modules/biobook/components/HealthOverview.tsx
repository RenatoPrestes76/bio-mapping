import type { HealthSummary, TrendSummary } from '../types/biobook.types';

const TREND_LABEL: Record<string, string> = {
  IMPROVING: 'Melhorando',
  STABLE: 'Estável',
  WORSENING: 'Piorando',
  FLUCTUATING: 'Oscilando',
  INSUFFICIENT_DATA: 'Poucos dados',
};

const TREND_COLOR: Record<string, string> = {
  IMPROVING: 'text-emerald-600 dark:text-emerald-400',
  STABLE: 'text-zinc-500 dark:text-zinc-400',
  WORSENING: 'text-red-500 dark:text-red-400',
  FLUCTUATING: 'text-amber-500 dark:text-amber-400',
  INSUFFICIENT_DATA: 'text-zinc-400 dark:text-zinc-500',
};

function StatItem({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      <span
        className={[
          'text-sm font-semibold tabular-nums',
          alert && value > 0
            ? 'text-red-500 dark:text-red-400'
            : 'text-zinc-900 dark:text-zinc-50',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

function TrendRow({ trend }: { trend: TrendSummary }) {
  const colorClass = TREND_COLOR[trend.trendType] ?? TREND_COLOR.INSUFFICIENT_DATA;
  const label = TREND_LABEL[trend.trendType] ?? trend.trendType;
  return (
    <div className="flex items-start justify-between gap-2 py-2">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{trend.metric}</p>
      <span className={`shrink-0 text-xs font-medium ${colorClass}`}>{label}</span>
    </div>
  );
}

interface HealthOverviewProps {
  health: HealthSummary;
}

export function HealthOverview({ health }: HealthOverviewProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Visão de Saúde
      </h2>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        <StatItem label="Decisões em aberto" value={health.openDecisions} alert />
        <StatItem label="Decisões críticas" value={health.criticalDecisions} alert />
        <StatItem label="Protocolos ativos" value={health.activePathways} />
        <StatItem label="Recomendações pendentes" value={health.pendingRecommendations} />
      </div>

      {health.recentTrends.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Tendências recentes
          </p>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {health.recentTrends.map((t) => (
              <TrendRow key={t.metric} trend={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
