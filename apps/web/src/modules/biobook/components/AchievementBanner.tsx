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
      className="flex items-center gap-4 rounded-xl border border-accent-200 bg-accent-50 p-5"
    >
      <span className="shrink-0 text-3xl" aria-hidden="true">⭐</span>

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-accent-700">
          Conquista
        </p>
        <h3 className="mt-0.5 truncate text-base font-semibold text-ink">
          {chapter.title}
        </h3>
        {chapter.summary && (
          <p className="mt-1 text-sm text-ink-soft">{chapter.summary}</p>
        )}
        <p className="mt-1 text-xs text-accent-600">
          {formatDate(chapter.startDate)}
          {chapter.endDate && ` — ${formatDate(chapter.endDate)}`}
        </p>
      </div>
    </div>
  );
}
