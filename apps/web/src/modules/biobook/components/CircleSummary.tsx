import type { CircleData } from '../types/biobook.types';

interface CircleSummaryProps {
  circle: CircleData;
}

function CircleStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
    </div>
  );
}

export function CircleSummary({ circle }: CircleSummaryProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Meu Círculo
      </h2>

      <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800">
        <CircleStat value={circle.connections} label="Conexões" />
        <CircleStat value={circle.teams} label="Times" />
        <CircleStat value={circle.pendingInvites} label="Convites" />
      </div>

      {circle.pendingInvites > 0 && (
        <p className="mt-4 text-center text-xs text-amber-600 dark:text-amber-400">
          Você tem {circle.pendingInvites} convite{circle.pendingInvites !== 1 ? 's' : ''} pendente
          {circle.pendingInvites !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
