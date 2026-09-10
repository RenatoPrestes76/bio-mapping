import type { BioBookChapter } from '../types/biobook.types';

interface StorySummaryProps {
  chapters: BioBookChapter[];
  onGenerate?: () => void;
  generating?: boolean;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function StorySummary({ chapters, onGenerate, generating = false }: StorySummaryProps) {
  if (chapters.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center shadow-soft">
        <p className="text-2xl" aria-hidden="true">📖</p>
        <h3 className="mt-2 text-base font-semibold text-ink">
          Sua história ainda não foi criada
        </h3>
        <p className="mt-1 text-sm text-ink-faint">
          Gere automaticamente os capítulos da sua jornada de saúde.
        </p>
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {generating ? 'Gerando...' : 'Gerar Minha História'}
          </button>
        )}
      </div>
    );
  }

  const sorted = [...chapters].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = daysBetween(first.startDate, last.endDate ?? last.startDate);
  const achievementCount = chapters.filter((c) => c.chapterType === 'ACHIEVEMENT').length;

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-ink-faint">
        Resumo da História
      </h2>

      <div className="grid grid-cols-3 divide-x divide-line">
        <div className="flex flex-col items-center gap-0.5 px-2">
          <span className="text-2xl font-bold tabular-nums text-ink">{chapters.length}</span>
          <span className="text-center text-xs text-ink-faint">Capítulos</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 px-2">
          <span className="text-2xl font-bold tabular-nums text-ink">
            {span > 0 ? span : 1}
          </span>
          <span className="text-center text-xs text-ink-faint">Dias</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 px-2">
          <span className="text-2xl font-bold tabular-nums text-ink">{achievementCount}</span>
          <span className="text-center text-xs text-ink-faint">Conquistas</span>
        </div>
      </div>

      {onGenerate && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="mt-4 w-full rounded-lg border border-line py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-muted disabled:opacity-50"
        >
          {generating ? 'Atualizando...' : 'Atualizar Capítulos'}
        </button>
      )}
    </div>
  );
}
