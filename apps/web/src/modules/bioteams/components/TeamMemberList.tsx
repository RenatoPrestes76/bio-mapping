"use client";

import type { BioTeamMember, TeamMemberRole } from '../types/bioteams.types';

const ROLE_LABEL: Record<TeamMemberRole, string> = {
  OWNER: 'Fundador', ADMINISTRATOR: 'Administrador', COACH: 'Coach',
  TRAINER: 'Treinador', NUTRITIONIST: 'Nutricionista', PHYSICIAN: 'Médico',
  MEMBER: 'Membro', GUEST: 'Convidado',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  REMOVED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo', PENDING: 'Pendente', SUSPENDED: 'Suspenso', REMOVED: 'Removido',
};

interface TeamMemberListProps {
  members: BioTeamMember[];
  myRole: TeamMemberRole;
  currentUserId: string;
  onRemove?: (userId: string) => void;
  onAcceptInvite?: (member: BioTeamMember) => void;
}

export function TeamMemberList({ members, myRole, currentUserId, onRemove, onAcceptInvite }: TeamMemberListProps) {
  const canManage = myRole === 'OWNER' || myRole === 'ADMINISTRATOR';

  if (members.length === 0) {
    return <p className="py-6 text-center text-sm text-zinc-500">Nenhum membro encontrado.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800" data-testid="member-list">
      {members.map((m) => (
        <li key={m.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {m.userId.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{m.userId}</p>
              <p className="text-xs text-zinc-500">{ROLE_LABEL[m.role]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[m.status] ?? ''}`}>
              {STATUS_LABEL[m.status] ?? m.status}
            </span>
            {m.status === 'PENDING' && m.userId === currentUserId && onAcceptInvite && (
              <button
                type="button"
                onClick={() => onAcceptInvite(m)}
                className="rounded bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Aceitar
              </button>
            )}
            {canManage && m.role !== 'OWNER' && m.userId !== currentUserId && m.status === 'ACTIVE' && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(m.userId)}
                className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Remover
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
