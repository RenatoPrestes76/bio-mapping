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
      className="rounded-xl border border-line bg-surface p-5 shadow-soft"
      aria-label={chapter.title}
    >
      {/* Type badge */}
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden="true" className="text-lg">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </span>
      </div>

      {/* Title + subtitle */}
      <h3 className="text-base font-semibold text-ink">{chapter.title}</h3>
      {chapter.subtitle && (
        <p className="mt-0.5 text-sm text-ink-faint">{chapter.subtitle}</p>
      )}

      {/* Date range */}
      <p className="mt-2 text-xs text-ink-faint">
        {formatDate(chapter.startDate)}
        {chapter.endDate && ` — ${formatDate(chapter.endDate)}`}
      </p>

      {/* Summary */}
      {chapter.summary && (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{chapter.summary}</p>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        {eventCount > 0 && (
          <span className="text-xs text-ink-faint">
            {eventCount} evento{eventCount !== 1 ? 's' : ''}
          </span>
        )}
        {onShare && (
          <button
            type="button"
            onClick={() => onShare(chapter.id)}
            className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-ink-soft ring-1 ring-line hover:bg-surface-muted"
          >
            Compartilhar
          </button>
        )}
      </div>
    </article>
  );
}
