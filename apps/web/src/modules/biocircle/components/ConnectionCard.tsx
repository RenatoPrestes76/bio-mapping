import type { BioConnection, ConnectionRelationshipType, ConnectionStatus } from '../types/biocircle.types';

const RELATIONSHIP_LABEL: Record<ConnectionRelationshipType, string> = {
  FRIEND: 'Amigo',
  COACH: 'Coach',
  TRAINER: 'Treinador',
  NUTRITIONIST: 'Nutricionista',
  PHYSICIAN: 'Médico',
  FAMILY: 'Família',
  TEAMMATE: 'Colega de equipe',
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  PENDING: 'Pendente',
  ACCEPTED: 'Conectado',
  REJECTED: 'Recusado',
  BLOCKED: 'Bloqueado',
  REMOVED: 'Removido',
};

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  PENDING: 'text-amber-600 dark:text-amber-400',
  ACCEPTED: 'text-emerald-600 dark:text-emerald-400',
  REJECTED: 'text-red-500 dark:text-red-400',
  BLOCKED: 'text-red-600 dark:text-red-500',
  REMOVED: 'text-zinc-400 dark:text-zinc-500',
};

interface ConnectionCardProps {
  connection: BioConnection;
  currentUserId: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onRemove?: (id: string) => void;
  onBlock?: (id: string) => void;
}

export function ConnectionCard({
  connection,
  currentUserId,
  onAccept,
  onReject,
  onRemove,
  onBlock,
}: ConnectionCardProps) {
  const isReceiver = connection.receiverId === currentUserId;
  const peerId = isReceiver ? connection.requesterId : connection.receiverId;

  return (
    <div
      className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      data-testid="connection-card"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {peerId.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{peerId}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {RELATIONSHIP_LABEL[connection.relationshipType]}
            </p>
          </div>
        </div>
        <p className={`mt-1 text-xs ${STATUS_COLOR[connection.status]}`}>
          {STATUS_LABEL[connection.status]}
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col gap-1.5">
        {isReceiver && connection.status === 'PENDING' && (
          <>
            {onAccept && (
              <button
                type="button"
                onClick={() => onAccept(connection.id)}
                className="rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
              >
                Aceitar
              </button>
            )}
            {onReject && (
              <button
                type="button"
                onClick={() => onReject(connection.id)}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                Recusar
              </button>
            )}
          </>
        )}
        {connection.status === 'ACCEPTED' && (
          <>
            {onBlock && (
              <button
                type="button"
                onClick={() => onBlock(connection.id)}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                Bloquear
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(connection.id)}
                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
              >
                Remover
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
