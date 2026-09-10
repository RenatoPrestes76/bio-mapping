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
    <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink-soft">{label}</h3>
        <span className="text-xs text-ink-faint">
          {photos.length} foto{photos.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {displayed.map((photo) => (
          <figure key={photo.id} className="relative">
            <div className="overflow-hidden rounded-lg bg-surface-muted">
              <img
                src={photo.url}
                alt={photo.label ?? `Foto de ${formatDate(photo.date)}`}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </div>
            <figcaption className="mt-1 text-center text-xs text-ink-faint">
              {formatDate(photo.date)}
            </figcaption>
          </figure>
        ))}
      </div>

      {remaining > 0 && (
        <p className="mt-2 text-center text-xs text-ink-faint">
          +{remaining} foto{remaining !== 1 ? 's' : ''} no agrupamento
        </p>
      )}
    </div>
  );
}
