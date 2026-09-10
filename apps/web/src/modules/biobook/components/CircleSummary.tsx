import type { CircleData } from '../types/biobook.types';

interface CircleSummaryProps {
  circle: CircleData;
}

function CircleStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-bold tabular-nums text-ink">{value}</span>
      <span className="text-xs text-ink-faint">{label}</span>
    </div>
  );
}

export function CircleSummary({ circle }: CircleSummaryProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-ink-faint">
        Meu Círculo
      </h2>

      <div className="grid grid-cols-3 divide-x divide-line">
        <CircleStat value={circle.connections} label="Conexões" />
        <CircleStat value={circle.teams} label="Times" />
        <CircleStat value={circle.pendingInvites} label="Convites" />
      </div>

      {circle.pendingInvites > 0 && (
        <p className="mt-4 text-center text-xs text-warning">
          Você tem {circle.pendingInvites} convite{circle.pendingInvites !== 1 ? 's' : ''} pendente
          {circle.pendingInvites !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
