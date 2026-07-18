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
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-2xl" aria-hidden="true">📖</p>
        <h3 className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Sua história ainda não foi criada
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Gere automaticamente os capítulos da sua jornada de saúde.
        </p>
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Resumo da História
      </h2>

      <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800">
        <div className="flex flex-col items-center gap-0.5 px-2">
          <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{chapters.length}</span>
          <span className="text-center text-xs text-zinc-500 dark:text-zinc-400">Capítulos</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 px-2">
          <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {span > 0 ? span : 1}
          </span>
          <span className="text-center text-xs text-zinc-500 dark:text-zinc-400">Dias</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 px-2">
          <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{achievementCount}</span>
          <span className="text-center text-xs text-zinc-500 dark:text-zinc-400">Conquistas</span>
        </div>
      </div>

      {onGenerate && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="mt-4 w-full rounded-lg border border-zinc-200 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {generating ? 'Atualizando...' : 'Atualizar Capítulos'}
        </button>
      )}
    </div>
  );
}
