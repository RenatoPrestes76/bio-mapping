import type { Achievement } from '../types/biobook.types';

const CATEGORY_ICON: Record<string, string> = {
  assessment: '📋',
  goal: '🎯',
  milestone: '⭐',
  health: '❤️',
  training: '🏃',
  default: '✦',
};

function formatRelative(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30) return `${days} dias atrás`;
  if (days < 365) return `${Math.floor(days / 30)} meses atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface AchievementTimelineProps {
  achievements: Achievement[];
}

export function AchievementTimeline({ achievements }: AchievementTimelineProps) {
  if (achievements.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Conquistas
        </h2>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Nenhuma conquista registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Conquistas
      </h2>

      <ol className="space-y-4">
        {achievements.map((achievement, idx) => (
          <li key={achievement.id} className="flex gap-3">
            {/* Icon + connector */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm dark:bg-zinc-800"
                aria-hidden="true"
              >
                {CATEGORY_ICON[achievement.category ?? 'default'] ?? CATEGORY_ICON.default}
              </div>
              {idx < achievements.length - 1 && (
                <div className="mt-1 w-px flex-1 bg-zinc-100 dark:bg-zinc-800" aria-hidden="true" />
              )}
            </div>

            {/* Content */}
            <div className="pb-4">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{achievement.title}</p>
              {achievement.description && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{achievement.description}</p>
              )}
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                {formatRelative(achievement.achievedAt)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
