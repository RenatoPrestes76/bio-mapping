import type { ActiveGoal } from '../types/biobook.types';

interface ProgressWidgetProps {
  goals: ActiveGoal[];
}

export function ProgressWidget({ goals }: ProgressWidgetProps) {
  if (goals.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-faint">
          Próximos Objetivos
        </h2>
        <p className="text-sm text-ink-faint">Nenhuma meta ativa.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-ink-faint">
        Próximos Objetivos
      </h2>

      <div className="space-y-5">
        {goals.map((goal) => (
          <div key={goal.id} data-testid="goal-item">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-ink">{goal.label}</span>
              <span className="tabular-nums text-ink-faint">{goal.progress}%</span>
            </div>

            {/* Progress bar */}
            <div
              role="progressbar"
              aria-valuenow={goal.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={goal.label}
              className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
            >
              <div
                className="h-full rounded-full bg-primary-600 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
              />
            </div>

            {goal.nextMilestone && (
              <p className="mt-1 text-xs text-ink-faint">
                → {goal.nextMilestone}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
