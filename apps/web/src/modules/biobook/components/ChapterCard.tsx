import type { BioBookChapter, ChapterType } from '../types/biobook.types';

const CHAPTER_LABEL: Record<ChapterType, string> = {
  FIRST_ASSESSMENT: 'Início da Jornada',
  TRANSFORMATION: 'Transformação',
  CHALLENGE: 'Desafio',
  COMPETITION: 'Competição',
  TRAINING_CYCLE: 'Ciclo de Treino',
  NUTRITION_PHASE: 'Fase Nutricional',
  MEDICAL_FOLLOW_UP: 'Acompanhamento Clínico',
  ACHIEVEMENT: 'Conquista',
  RECOVERY: 'Recuperação',
  MILESTONE: 'Marco',
};

const CHAPTER_ICON: Record<ChapterType, string> = {
  FIRST_ASSESSMENT: '🌱',
  TRANSFORMATION: '⚡',
  CHALLENGE: '🎯',
  COMPETITION: '🏆',
  TRAINING_CYCLE: '🔄',
  NUTRITION_PHASE: '🥗',
  MEDICAL_FOLLOW_UP: '🩺',
  ACHIEVEMENT: '⭐',
  RECOVERY: '💚',
  MILESTONE: '🏁',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface ChapterCardProps {
  chapter: BioBookChapter;
  eventCount?: number;
  onShare?: (chapterId: string) => void;
}

export function ChapterCard({ chapter, eventCount = 0, onShare }: ChapterCardProps) {
  const label = CHAPTER_LABEL[chapter.chapterType] ?? chapter.chapterType;
  const icon = CHAPTER_ICON[chapter.chapterType] ?? '📖';

  return (
    <article
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      aria-label={chapter.title}
    >
      {/* Type badge */}
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden="true" className="text-lg">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      </div>

      {/* Title + subtitle */}
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{chapter.title}</h3>
      {chapter.subtitle && (
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{chapter.subtitle}</p>
      )}

      {/* Date range */}
      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
        {formatDate(chapter.startDate)}
        {chapter.endDate && ` — ${formatDate(chapter.endDate)}`}
      </p>

      {/* Summary */}
      {chapter.summary && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{chapter.summary}</p>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        {eventCount > 0 && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {eventCount} evento{eventCount !== 1 ? 's' : ''}
          </span>
        )}
        {onShare && (
          <button
            type="button"
            onClick={() => onShare(chapter.id)}
            className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
          >
            Compartilhar
          </button>
        )}
      </div>
    </article>
  );
}
