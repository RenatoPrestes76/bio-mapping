import type { ActiveGoal } from '../types/biobook.types';

interface ProgressWidgetProps {
  goals: ActiveGoal[];
}

export function ProgressWidget({ goals }: ProgressWidgetProps) {
  if (goals.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Próximos Objetivos
        </h2>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Nenhuma meta ativa.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Próximos Objetivos
      </h2>

      <div className="space-y-5">
        {goals.map((goal) => (
          <div key={goal.id} data-testid="goal-item">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{goal.label}</span>
              <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{goal.progress}%</span>
            </div>

            {/* Progress bar */}
            <div
              role="progressbar"
              aria-valuenow={goal.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={goal.label}
              className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
            >
              <div
                className="h-full rounded-full bg-zinc-900 transition-all duration-500 dark:bg-zinc-50"
                style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
              />
            </div>

            {goal.nextMilestone && (
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                → {goal.nextMilestone}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
