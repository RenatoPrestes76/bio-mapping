import type { BioBookUser, BioBookChapter } from '../types/biobook.types';

interface StoryHeaderProps {
  user: BioBookUser;
  chapters: BioBookChapter[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function StoryHeader({ user, chapters }: StoryHeaderProps) {
  const sorted = [...chapters].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const firstChapter = sorted[0];

  return (
    <header className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            A Jornada de
          </p>
          <h1 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">{user.name}</h1>
          {firstChapter && (
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Desde {formatDate(firstChapter.startDate)}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {chapters.length}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {chapters.length === 1 ? 'capítulo' : 'capítulos'}
          </p>
        </div>
      </div>
    </header>
  );
}
