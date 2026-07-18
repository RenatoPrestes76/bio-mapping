import type { EvolutionPhoto } from '../types/biobook.types';

interface PhotoMomentProps {
  label: string;
  photos: EvolutionPhoto[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PhotoMoment({ label, photos }: PhotoMomentProps) {
  if (photos.length === 0) return null;

  const displayed = photos.slice(0, 4);
  const remaining = photos.length - displayed.length;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</h3>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {photos.length} foto{photos.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {displayed.map((photo) => (
          <figure key={photo.id} className="relative">
            <div className="overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <img
                src={photo.url}
                alt={photo.label ?? `Foto de ${formatDate(photo.date)}`}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </div>
            <figcaption className="mt-1 text-center text-xs text-zinc-400 dark:text-zinc-500">
              {formatDate(photo.date)}
            </figcaption>
          </figure>
        ))}
      </div>

      {remaining > 0 && (
        <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
          +{remaining} foto{remaining !== 1 ? 's' : ''} no agrupamento
        </p>
      )}
    </div>
  );
}
