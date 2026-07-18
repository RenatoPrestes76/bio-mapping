import type { BioBookChapter } from '../types/biobook.types';

interface AchievementBannerProps {
  chapter: BioBookChapter;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function AchievementBanner({ chapter }: AchievementBannerProps) {
  return (
    <div
      role="banner"
      aria-label={`Conquista: ${chapter.title}`}
      className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800/50 dark:bg-amber-950/30"
    >
      <span className="shrink-0 text-3xl" aria-hidden="true">⭐</span>

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Conquista
        </p>
        <h3 className="mt-0.5 truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {chapter.title}
        </h3>
        {chapter.summary && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{chapter.summary}</p>
        )}
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
          {formatDate(chapter.startDate)}
          {chapter.endDate && ` — ${formatDate(chapter.endDate)}`}
        </p>
      </div>
    </div>
  );
}
