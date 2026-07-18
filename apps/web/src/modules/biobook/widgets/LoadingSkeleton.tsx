function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-100 dark:bg-zinc-800 ${className}`}
      aria-hidden="true"
    />
  );
}

function CardSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <SkeletonBlock className="mb-4 h-3 w-24" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4" aria-label="Carregando BioBook" aria-busy="true">
      {/* Header */}
      <div className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-16 w-16 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" aria-hidden="true" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-3 w-24" />
          <div className="flex gap-2 pt-1">
            <SkeletonBlock className="h-5 w-20 rounded-full" />
            <SkeletonBlock className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Evolution */}
      <CardSkeleton rows={2} />

      {/* Two-column row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={4} />
      </div>

      {/* Health + Circle */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CardSkeleton rows={4} />
        <CardSkeleton rows={2} />
      </div>
    </div>
  );
}
