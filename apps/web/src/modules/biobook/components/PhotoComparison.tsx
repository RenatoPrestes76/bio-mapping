import type { EvolutionPhoto } from '../types/biobook.types';

interface PhotoComparisonProps {
  photos: EvolutionPhoto[];
}

function PhotoCard({ photo }: { photo: EvolutionPhoto }) {
  const dateStr = photo.date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <figure className="flex-1">
      <div className="overflow-hidden rounded-lg bg-surface-muted">
        <img
          src={photo.url}
          alt={photo.label ?? `Foto de ${dateStr}`}
          className="aspect-[3/4] w-full object-cover"
          loading="lazy"
        />
      </div>
      <figcaption className="mt-2 text-center text-xs text-ink-faint">
        {photo.label ? (
          <>
            <span className="block font-medium text-ink-soft">{photo.label}</span>
            <span>{dateStr}</span>
          </>
        ) : (
          dateStr
        )}
      </figcaption>
    </figure>
  );
}

export function PhotoComparison({ photos }: PhotoComparisonProps) {
  if (photos.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-faint">
          Evolução Física
        </h2>
        <p className="text-sm text-ink-faint">
          Adicione fotos para acompanhar sua transformação.
        </p>
      </div>
    );
  }

  // Show last two photos for a before/after comparison
  const displayed = photos.slice(-2);

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-ink-faint">
        Evolução Física
      </h2>

      <div className="flex gap-4">
        {displayed.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} />
        ))}
      </div>

      {photos.length > 2 && (
        <p className="mt-3 text-center text-xs text-ink-faint">
          +{photos.length - 2} foto{photos.length - 2 !== 1 ? 's' : ''} no histórico
        </p>
      )}
    </div>
  );
}
