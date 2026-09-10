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
    <header className="rounded-xl border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            A Jornada de
          </p>
          <h1 className="mt-1 text-xl font-bold text-ink">{user.name}</h1>
          {firstChapter && (
            <p className="mt-0.5 text-sm text-ink-faint">
              Desde {formatDate(firstChapter.startDate)}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-3xl font-bold tabular-nums text-ink">
            {chapters.length}
          </p>
          <p className="text-xs text-ink-faint">
            {chapters.length === 1 ? 'capítulo' : 'capítulos'}
          </p>
        </div>
      </div>
    </header>
  );
}
