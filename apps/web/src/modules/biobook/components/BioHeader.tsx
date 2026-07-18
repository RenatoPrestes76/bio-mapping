import type { BioBookUser } from '../types/biobook.types';

function memberDuration(memberSince?: Date): string {
  if (!memberSince) return '';
  const days = Math.floor((Date.now() - memberSince.getTime()) / 86_400_000);
  if (days < 30) return `${days} dias`;
  if (days < 365) return `${Math.floor(days / 30)} meses`;
  return `${Math.floor(days / 365)} ano${Math.floor(days / 365) > 1 ? 's' : ''}`;
}

interface BioHeaderProps extends BioBookUser {}

export function BioHeader({ name, username, avatarUrl, mainGoal, mainSport, memberSince }: BioHeaderProps) {
  const duration = memberDuration(memberSince);

  return (
    <div className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Avatar */}
      <div className="shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            aria-label={`Avatar de ${name}`}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">{name}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">@{username}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {mainGoal && (
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {mainGoal}
            </span>
          )}
          {mainSport && (
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {mainSport}
            </span>
          )}
        </div>

        {duration && (
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            No Bio Mapping há {duration}
          </p>
        )}
      </div>
    </div>
  );
}
